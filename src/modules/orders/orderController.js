import { Order } from './Order.js';
import { Ingredient } from '../ingredients/Ingredient.js';
import { Menu } from '../menus/Menu.js';
import { broadcastIngredientSnapshot } from '../../realtime/ingredientSocket.js';

const normalizeOrderItemQuantity = (quantity) => {
  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity) || numericQuantity < 1) return 1;
  return Math.trunc(numericQuantity);
};

const buildIngredientRequirements = async (orderList = []) => {
  const requirements = new Map();
  const menuIds = [
    ...new Set(
      orderList
        .map((item) => item?.menu_id)
        .filter(Boolean)
        .map((menuId) => String(menuId)),
    ),
  ];

  if (menuIds.length === 0) return requirements;

  const menus = await Menu.find({ _id: { $in: menuIds } }).populate('ingredients.ingredient');
  const menuMap = new Map(menus.map((menu) => [String(menu._id), menu]));

  orderList.forEach((item) => {
    const menu = menuMap.get(String(item.menu_id || ''));
    if (!menu) return;

    const orderQuantity = normalizeOrderItemQuantity(item.quantity);
    menu.ingredients.forEach((entry) => {
      const ingredient = entry.ingredient;
      if (!ingredient) return;

      const ingredientId = String(ingredient._id);
      const requiredQuantity = Number(entry.quantity || 0) * orderQuantity;
      const current = requirements.get(ingredientId) || {
        ingredient,
        requiredQuantity: 0,
      };
      current.requiredQuantity += requiredQuantity;
      requirements.set(ingredientId, current);
    });
  });

  return requirements;
};

const validateIngredientRequirements = (requirements) => {
  for (const { ingredient, requiredQuantity } of requirements.values()) {
    if (ingredient.active_status === false) {
      return `${ingredient.name} is not active`;
    }
    if (Number(ingredient.quantity || 0) < requiredQuantity) {
      return `${ingredient.name} stock is not enough`;
    }
  }
  return '';
};

const deductIngredientRequirements = async (requirements) => {
  const updates = [...requirements.entries()].map(([ingredientId, { requiredQuantity }]) =>
    Ingredient.updateOne(
      { _id: ingredientId },
      { $inc: { quantity: -requiredQuantity } },
    ),
  );

  await Promise.all(updates);
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const orderList = Array.isArray(req.body.orderList)
      ? req.body.orderList.map((item) => ({
          ...item,
          quantity: normalizeOrderItemQuantity(item.quantity),
        }))
      : [];

    const requirements = await buildIngredientRequirements(orderList);
    const stockError = validateIngredientRequirements(requirements);
    if (stockError) {
      return res.status(400).json({ message: stockError });
    }

    const order = new Order({ ...req.body, orderList });
    const newOrder = await order.save();
    await deductIngredientRequirements(requirements);
    await broadcastIngredientSnapshot();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateOrderItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['InKitchen', 'Cook', 'finished', 'cancel', 'pending', 'preparing', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid item status' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, 'orderList._id': itemId },
      { $set: { 'orderList.$.status': status } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order or item not found' });

    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
