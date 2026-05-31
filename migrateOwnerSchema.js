import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './src/configs/mongodb.js';
import { Ingredient } from './src/modules/ingredients/Ingredient.js';
import { Menu } from './src/modules/menus/Menu.js';
import { Order } from './src/modules/orders/Order.js';
import { Promotion } from './src/modules/promotions/Promotion.js';
import { User } from './src/modules/users/User.js';
import { Waste } from './src/modules/wastes/Waste.js';

dotenv.config();

const validOrderStatuses = new Set(['pending', 'preparing', 'completed', 'cancelled']);
const validItemStatuses = new Set([
  'InKitchen',
  'Cook',
  'finished',
  'cancel',
  'pending',
  'preparing',
  'completed',
  'cancelled',
]);
const validMenuCategories = new Set(['chicken', 'burger', 'combo', 'drink', 'side', 'dessert']);
const validPromotionTypes = new Set(['fixed', 'percentage']);
const validUserRoles = new Set(['owner', 'cashier', 'cook', 'rider', 'waitress', 'customer']);

const now = () => new Date();

const slug = (value, fallback) =>
  String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback;

const normalizeOrderStatus = (status) => {
  const map = {
    New: 'pending',
    Cooking: 'preparing',
    Ready: 'completed',
    Paid: 'completed',
    Delivered: 'completed',
    Cancelled: 'cancelled',
  };
  const normalized = map[status] || status;
  return validOrderStatuses.has(normalized) ? normalized : 'pending';
};

const normalizeOrderType = (type) => {
  if (type === 'Delivery') return 'delivery';
  if (type === 'In-Restaurant' || type === 'Take Away') return 'Onsite';
  return type === 'delivery' || type === 'Onsite' ? type : 'Onsite';
};

const normalizeItemStatus = (status) => {
  const map = {
    New: 'pending',
    Cooking: 'preparing',
    Ready: 'completed',
    Cancelled: 'cancelled',
  };
  const normalized = map[status] || status;
  return validItemStatuses.has(normalized) ? normalized : 'InKitchen';
};

const normalizePromotionType = (promotion) => {
  const type = promotion.type || promotion.discountType;
  return validPromotionTypes.has(type) ? type : 'fixed';
};

const normalizeMenuCategory = (category) =>
  validMenuCategories.has(category) ? category : 'chicken';

const ensureOwnerAccount = async () => {
  const existingOwner = await User.findOne({ role: 'owner' });
  if (existingOwner) return 0;

  const hashedPassword = await bcrypt.hash('owner123', 10);
  await User.create({
    name: 'Owner',
    surname: 'Admin',
    username: 'owner',
    email: 'owner@spc.com',
    password: hashedPassword,
    role: 'owner',
    active_status: true,
  });
  return 1;
};

const migrateUsers = async () => {
  const users = await User.find();
  let changed = 0;

  for (const user of users) {
    const fallbackName = user.email?.split('@')[0] || `user_${String(user._id).slice(-6)}`;
    if (!user.name) user.name = fallbackName;
    if (!user.surname) user.surname = user.role === 'owner' ? 'Admin' : 'User';
    if (!user.username) user.username = slug(user.email || user.name, `user_${String(user._id).slice(-6)}`);
    if (!user.email) user.email = `${user.username}@local.invalid`;
    if (!validUserRoles.has(user.role)) user.role = 'customer';
    if (user.active_status === undefined) user.active_status = true;

    if (user.isModified()) {
      await user.save();
      changed += 1;
    }
  }

  return changed;
};

const migrateIngredients = async () => {
  const ingredients = await Ingredient.find().sort({ ingredient_index: 1, createdAt: 1 });
  let changed = 0;
  let nextIndex = 1;

  for (const ingredient of ingredients) {
    if (!ingredient.ingredient_index || ingredient.ingredient_index < 1) {
      ingredient.ingredient_index = nextIndex;
    }
    nextIndex = Math.max(nextIndex, Number(ingredient.ingredient_index || 0) + 1);

    if (!ingredient.name) ingredient.name = `Ingredient ${ingredient.ingredient_index}`;
    if (ingredient.quantity === undefined || Number.isNaN(Number(ingredient.quantity))) ingredient.quantity = 0;
    if (!ingredient.unit) ingredient.unit = 'piece';
    if (ingredient.price_per_unit === undefined || Number.isNaN(Number(ingredient.price_per_unit))) {
      ingredient.price_per_unit = 0;
    }
    if (ingredient.low_stock_threshold === undefined || Number.isNaN(Number(ingredient.low_stock_threshold))) {
      ingredient.low_stock_threshold = 0;
    }
    if (ingredient.active_status === undefined) ingredient.active_status = true;

    if (ingredient.isModified()) {
      await ingredient.save();
      changed += 1;
    }
  }

  return changed;
};

const migrateMenus = async () => {
  const menus = await Menu.find();
  let changed = 0;

  for (const menu of menus) {
    if (!menu.name) menu.name = `Menu ${String(menu._id).slice(-6)}`;
    if (menu.description === undefined) menu.description = '';
    if (menu.price === undefined || Number.isNaN(Number(menu.price))) menu.price = 0;
    if (!menu.category || !validMenuCategories.has(menu.category)) {
      menu.category = normalizeMenuCategory(menu.category);
    }
    if (menu.cookingTime === undefined || Number.isNaN(Number(menu.cookingTime))) menu.cookingTime = 0;
    if (menu.available === undefined) menu.available = true;
    if (!Array.isArray(menu.ingredients)) menu.ingredients = [];

    if (menu.isModified()) {
      await menu.save();
      changed += 1;
    }
  }

  return changed;
};

const migrateOrders = async () => {
  const orders = await Order.find();
  let changed = 0;

  for (const order of orders) {
    order.type = normalizeOrderType(order.type);
    if (!order.customer) order.customer = {};
    if (!order.customer.name) order.customer.name = order.type === 'Onsite' ? 'Walk-in Customer' : 'Customer';
    if (!Array.isArray(order.orderList)) order.orderList = [];
    order.orderList.forEach((item) => {
      if (!item.quantity || item.quantity < 1) item.quantity = 1;
      if (item.price_at_purchase === undefined && item.price !== undefined) item.price_at_purchase = item.price;
      if (item.price === undefined && item.price_at_purchase !== undefined) item.price = item.price_at_purchase;
      item.status = normalizeItemStatus(item.status);
    });
    order.status = normalizeOrderStatus(order.status);
    if (!order.createdAt) order.createdAt = now();

    if (order.isModified()) {
      await order.save();
      changed += 1;
    }
  }

  return changed;
};

const migratePromotions = async () => {
  const promotions = await Promotion.find();
  let changed = 0;

  for (const promotion of promotions) {
    if (!promotion.name) promotion.name = `Promotion ${String(promotion._id).slice(-6)}`;
    promotion.type = normalizePromotionType(promotion);
    if (promotion.value === undefined || Number.isNaN(Number(promotion.value))) {
      promotion.value = Number(promotion.discountValue || 0);
    }
    if (!promotion.date_from) promotion.date_from = promotion.startDate || now();
    if (!promotion.date_to) {
      const end = new Date(promotion.date_from);
      end.setDate(end.getDate() + 30);
      promotion.date_to = promotion.endDate || end;
    }
    if (promotion.active_status === undefined) {
      promotion.active_status = promotion.active !== undefined ? Boolean(promotion.active) : true;
    }

    if (promotion.isModified()) {
      await promotion.save();
      changed += 1;
    }
  }

  return changed;
};

const migrateWastes = async () => {
  const wastes = await Waste.find().populate('ingredient').populate('user');
  let changed = 0;

  for (const waste of wastes) {
    if (!waste.itemName) waste.itemName = waste.ingredient?.name || 'Unknown item';
    if (waste.quantity === undefined) waste.quantity = waste.quantity_wasted ?? 0;
    if (!waste.unit) waste.unit = waste.ingredient?.unit || '';
    if (waste.estimatedCost === undefined) waste.estimatedCost = waste.total_cost ?? 0;
    if (!waste.recordedBy) waste.recordedBy = waste.user?.name || 'Owner';
    if (!waste.date) waste.date = waste.createdAt || now();
    if (waste.quantity_wasted === undefined) waste.quantity_wasted = waste.quantity ?? 0;
    if (!waste.reason) waste.reason = 'Quality Control';
    if (waste.total_cost === undefined) waste.total_cost = waste.estimatedCost ?? 0;

    if (waste.isModified()) {
      await waste.save();
      changed += 1;
    }
  }

  return changed;
};

const reportCounts = async () => ({
  users: await User.countDocuments(),
  ingredients: await Ingredient.countDocuments(),
  menus: await Menu.countDocuments(),
  orders: await Order.countDocuments(),
  promotions: await Promotion.countDocuments(),
  wastes: await Waste.countDocuments(),
});

const run = async () => {
  await connectDB();

  const before = await reportCounts();
  const createdOwner = await ensureOwnerAccount();
  const changed = {
    users: await migrateUsers(),
    ingredients: await migrateIngredients(),
    menus: await migrateMenus(),
    orders: await migrateOrders(),
    promotions: await migratePromotions(),
    wastes: await migrateWastes(),
  };
  const after = await reportCounts();

  console.log('Owner schema migration complete');
  console.log(JSON.stringify({ before, after, createdOwner, changed }, null, 2));
};

run()
  .catch((err) => {
    console.error('Owner schema migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
