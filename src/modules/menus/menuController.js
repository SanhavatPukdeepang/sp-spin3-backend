import { Menu } from './Menu.js';
import { MenuLog } from './MenuLog.js';
import { Ingredient } from '../ingredients/Ingredient.js';
import { processExpiredIngredientLots } from '../ingredients/inventoryLifecycle.js';
import { broadcastIngredientSnapshot } from '../../realtime/ingredientSocket.js';
import { broadcastSSE } from '../../utils/sse.js';
import { getDefaultMenuImage } from './menuImages.js';

const countBasedUnits = new Set(['piece', 'pieces', 'jar', 'jars', 'bottle', 'bottles']);

const normalizeMenuIngredientQuantity = (quantity, unit = '') => {
  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) return 1;
  if (countBasedUnits.has(String(unit).toLowerCase())) {
    return Math.max(1, Math.round(numericQuantity));
  }
  return numericQuantity;
};

const sanitizeMenuIngredients = async (ingredients = []) => {
  let parsedIngredients = ingredients;
  if (typeof ingredients === 'string') {
    try {
      parsedIngredients = JSON.parse(ingredients);
    } catch (err) {
      parsedIngredients = [];
    }
  }

  if (!Array.isArray(parsedIngredients)) return [];

  const ingredientIds = [
    ...new Set(
      parsedIngredients
        .map((entry) => entry?.ingredient)
        .filter(Boolean)
        .map((ingredientId) => String(ingredientId)),
    ),
  ];
  const ingredientDocs = await Ingredient.find({ _id: { $in: ingredientIds } });
  const ingredientById = new Map(ingredientDocs.map((ingredient) => [String(ingredient._id), ingredient]));

  return parsedIngredients
    .filter((entry) => entry?.ingredient)
    .map((entry) => {
      const ingredient = ingredientById.get(String(entry.ingredient));
      return {
        ingredient: entry.ingredient,
        quantity: normalizeMenuIngredientQuantity(entry.quantity, ingredient?.unit),
      };
    });
};

const withStockStatus = (menu) => {
  const item = menu.toObject ? menu.toObject() : menu;
  const linkedIngredients = Array.isArray(item.ingredients) ? item.ingredients : [];
  const hasRecipe = linkedIngredients.length > 0;
  const missingIngredients = linkedIngredients
    .filter((entry) => {
      const ingredient = entry.ingredient;
      return (
        !ingredient ||
        ingredient.active_status === false ||
        Number(ingredient.quantity || 0) < Number(entry.quantity || 0)
      );
    })
    .map((entry) => ({
      name: entry.ingredient?.name || 'Unknown ingredient',
      required: Number(entry.quantity || 0),
      available: Number(entry.ingredient?.quantity || 0),
      unit: entry.ingredient?.unit || '',
    }));

  return {
    ...item,
    image: item.image || getDefaultMenuImage(item.name),
    hasRecipe,
    hiddenFromCustomerMenu: !hasRecipe,
    soldOut: item.available === false || !hasRecipe || missingIngredients.length > 0,
    soldOutReason:
      item.available === false
        ? 'Menu unavailable'
        : !hasRecipe
          ? 'Recipe ingredients are not assigned'
        : missingIngredients.length > 0
          ? 'Ingredient stock is not enough'
          : '',
    missingIngredients,
  };
};

export const getMenus = async (req, res) => {
  try {
    const { category, all } = req.query;
    let filter = {};

    if (all !== 'true') {
      filter.available = true;
    }

    if (category) {
      filter.category = category;
    }

    const menus = await Menu.find(filter)
      .populate('ingredients.ingredient')
      .sort({ category: 1, name: 1 });
    const processedMenus = menus.map(withStockStatus);
    res.json(all === 'true' ? processedMenus : processedMenus.filter((menu) => menu.hasRecipe));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMenuById = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id).populate('ingredients.ingredient');
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });
    res.json(withStockStatus(menu));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMenuLogs = async (req, res) => {
  try {
    const logs = await MenuLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createMenu = async (req, res) => {
  const { name, description, price, category, cookingTime, ingredients } = req.body;
  let image = req.file ? req.file.path : (req.body.image || undefined);

  if (!name || price === undefined || !category) {
    return res.status(400).json({
      message: 'Missing required fields: name, price, category',
    });
  }

  try {
    const menu = new Menu({
      name,
      description,
      price: Number(price),
      image,
      category,
      cookingTime: Number(cookingTime) || 0,
      ingredients: ingredients === undefined ? [] : await sanitizeMenuIngredients(ingredients),
    });
    const newMenu = await menu.save();

    await MenuLog.create({
      action: 'created',
      menuId: newMenu._id,
      menuName: newMenu.name,
      performedBy: req.user?.name || req.user?.email || 'owner',
      performedByRole: req.user?.role || 'owner',
    });

    res.status(201).json(newMenu);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateMenu = async (req, res) => {
  try {
    const { name, description, price, category, cookingTime, available, ingredients } = req.body;
    let image = req.body.image;

    if (req.file) {
      image = req.file.path;
    }

    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });

    if (name !== undefined) menu.name = name;
    if (description !== undefined) menu.description = description;
    if (price !== undefined) menu.price = Number(price);
    if (image !== undefined) menu.image = image;
    if (category !== undefined) menu.category = category;
    if (cookingTime !== undefined) menu.cookingTime = Number(cookingTime);
    if (ingredients !== undefined) menu.ingredients = await sanitizeMenuIngredients(ingredients);

    if (available !== undefined) {
      const isAvailable = available === 'true' || available === true;
      const changed = menu.available !== isAvailable;
      menu.available = isAvailable;
      if (changed) {
        await MenuLog.create({
          action: isAvailable ? 'activated' : 'deactivated',
          menuId: menu._id,
          menuName: menu.name,
          performedBy: req.user?.name || req.user?.email || 'owner',
          performedByRole: req.user?.role || 'owner',
        });
      }
    }

    const updatedMenu = await menu.save();
    await processExpiredIngredientLots();
    await updatedMenu.populate('ingredients.ingredient');
    await broadcastIngredientSnapshot();
    res.json(withStockStatus(updatedMenu));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateMenuIngredients = async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ message: 'Ingredients must be an array' });
    }

    const sanitizedIngredients = await sanitizeMenuIngredients(ingredients);

    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });

    menu.ingredients = sanitizedIngredients;
    const updatedMenu = await menu.save();
    await processExpiredIngredientLots();
    await updatedMenu.populate('ingredients.ingredient');

    await MenuLog.create({
      action: 'ingredients_updated',
      menuId: updatedMenu._id,
      menuName: updatedMenu.name,
      performedBy: req.user?.name || req.user?.email || 'cook',
      performedByRole: req.user?.role || 'cook',
    });

    await broadcastIngredientSnapshot();
    res.json(withStockStatus(updatedMenu));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });

    await MenuLog.create({
      action: 'deleted',
      menuId: menu._id,
      menuName: menu.name,
      performedBy: req.user?.name || req.user?.email || 'owner',
      performedByRole: req.user?.role || 'owner',
    });

    await Menu.deleteOne({ _id: req.params.id });
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
