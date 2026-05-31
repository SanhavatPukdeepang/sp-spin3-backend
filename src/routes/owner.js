import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { isAuth, isEligible } from '../middleware/auth.js';
import { Ingredient } from '../modules/ingredients/Ingredient.js';
import { Order } from '../modules/orders/Order.js';
import { Promotion } from '../modules/promotions/Promotion.js';
import { User } from '../modules/users/User.js';
import { Waste } from '../modules/wastes/Waste.js';

export const router = Router();

const ownerOnly = [isAuth, isEligible('owner')];
const staffRoles = ['owner', 'cashier', 'cook', 'rider', 'waitress'];

const roleToOwnerRole = (role) => {
  const map = {
    cook: 'kitchen',
    waitress: 'server',
    rider: 'server',
  };
  return map[role] || role;
};

const ownerRoleToUserRole = (role) => {
  const map = {
    kitchen: 'cook',
    server: 'waitress',
    manager: 'cashier',
  };
  return map[role] || role;
};

const buildDateFilter = (period) => {
  const now = new Date();
  const start = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  }

  return { $gte: start, $lte: now };
};

const getOrderTotal = (order) => {
  if (Number.isFinite(Number(order.payment?.amount))) {
    return Number(order.payment.amount);
  }

  return (order.orderList || []).reduce((sum, item) => {
    const price = Number(item.price_at_purchase ?? item.price ?? 0);
    const quantity = Number(item.quantity || 0);
    return sum + price * quantity;
  }, 0);
};

const getCustomerTier = (totalSpent) => {
  if (totalSpent >= 50000) return 'VIP';
  if (totalSpent >= 20000) return 'Gold';
  if (totalSpent >= 5000) return 'Silver';
  return 'Basic';
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeWasteReason = (reason) => {
  const validReasons = new Set(['Expired', 'Wrong Order', 'Accident/Spill', 'Quality Control']);
  return validReasons.has(reason) ? reason : 'Quality Control';
};

const toStockLot = (ingredient) => ({
  id: String(ingredient._id),
  ingredientName: ingredient.name,
  quantity: ingredient.quantity,
  unit: ingredient.unit,
  price: ingredient.price_per_unit,
  reorderPoint: ingredient.low_stock_threshold,
  expiryDate: null,
  active: ingredient.active_status,
});

const toWasteEntry = (entry) => {
  const ingredient = entry.ingredient;
  const user = entry.user;

  return {
    id: String(entry._id),
    itemName: entry.itemName || ingredient?.name || 'Unknown item',
    reason: normalizeWasteReason(entry.reason),
    quantity: entry.quantity ?? entry.quantity_wasted ?? 0,
    unit: entry.unit || ingredient?.unit || '',
    estimatedCost: entry.estimatedCost ?? entry.total_cost ?? 0,
    recordedBy: entry.recordedBy || user?.name || 'Owner',
    date: entry.date || entry.createdAt,
  };
};

const toPromotion = (promotion) => ({
  id: String(promotion._id),
  name: promotion.name,
  code: promotion.code || promotion.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, ''),
  discountType: promotion.type,
  discountValue: promotion.value,
  startDate: promotion.date_from,
  endDate: promotion.date_to,
  active: promotion.active_status,
  usageCount: promotion.usageCount || 0,
  totalAmountSaved: promotion.totalAmountSaved || 0,
});

const toStaffMember = (user) => ({
  id: String(user._id),
  name: `${user.name || ''} ${user.surname || ''}`.trim() || user.username,
  email: user.email,
  role: roleToOwnerRole(user.role),
  area: user.role === 'cook' ? 'Kitchen' : user.role === 'rider' ? 'Delivery' : 'Front of house',
  lastLogin: user.updatedAt || user.createdAt,
  isLocked: user.active_status === false,
  isPending: false,
});

router.get('/summary', ownerOnly, async (req, res) => {
  try {
    const createdAt = buildDateFilter(req.query.period);
    const orders = await Order.find({ createdAt });
    const revenue = orders.reduce((sum, order) => sum + getOrderTotal(order), 0);
    const activeTables = await Order.countDocuments({
      status: { $in: ['pending', 'preparing'] },
      type: 'Onsite',
    });

    res.json({
      revenue,
      orders: orders.length,
      aov: orders.length ? revenue / orders.length : 0,
      activeTables,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/stock', ownerOnly, async (req, res) => {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    res.json(ingredients.map(toStockLot));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/stock/:id', ownerOnly, async (req, res) => {
  try {
    const updates = {};
    if (req.body.quantity !== undefined) updates.quantity = Number(req.body.quantity);
    if (req.body.price !== undefined) updates.price_per_unit = Number(req.body.price);
    if (req.body.reorderPoint !== undefined) updates.low_stock_threshold = Number(req.body.reorderPoint);
    if (req.body.active !== undefined) updates.active_status = Boolean(req.body.active);

    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!ingredient) return res.status(404).json({ message: 'Stock item not found' });
    res.json(toStockLot(ingredient));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/waste', ownerOnly, async (req, res) => {
  try {
    const waste = await Waste.find()
      .populate('ingredient')
      .populate('user', 'name surname email')
      .sort({ createdAt: -1 });

    res.json(waste.map(toWasteEntry));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/waste', ownerOnly, async (req, res) => {
  try {
    const entries = Array.isArray(req.body) ? req.body : [req.body];
    const created = [];

    for (const entry of entries) {
      const ingredient = entry.ingredient
        ? await Ingredient.findById(entry.ingredient)
        : await Ingredient.findOne({ name: new RegExp(`^${escapeRegex(entry.itemName)}$`, 'i') });

      const waste = await Waste.create({
        ingredient: ingredient?._id,
        user: req.user.id,
        itemName: entry.itemName || ingredient?.name,
        reason: normalizeWasteReason(entry.reason),
        quantity: Number(entry.quantity || 0),
        unit: entry.unit || ingredient?.unit || '',
        estimatedCost: Number(entry.estimatedCost || 0),
        recordedBy: entry.recordedBy || 'Owner',
        date: entry.date ? new Date(entry.date) : new Date(),
        quantity_wasted: Number(entry.quantity || 0),
        total_cost: Number(entry.estimatedCost || 0),
      });
      created.push(waste);
    }

    res.status(201).json(created.map(toWasteEntry));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/promotions', ownerOnly, async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ date_from: -1 });
    res.json(promotions.map(toPromotion));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/promotions/:id', ownerOnly, async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.discountType !== undefined) updates.type = req.body.discountType;
    if (req.body.discountValue !== undefined) updates.value = Number(req.body.discountValue);
    if (req.body.startDate !== undefined) updates.date_from = req.body.startDate;
    if (req.body.endDate !== undefined) updates.date_to = req.body.endDate;
    if (req.body.active !== undefined) updates.active_status = Boolean(req.body.active);

    const promotion = await Promotion.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!promotion) return res.status(404).json({ message: 'Promotion not found' });
    res.json(toPromotion(promotion));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/promotions/:id', ownerOnly, async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) return res.status(404).json({ message: 'Promotion not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/customers', ownerOnly, async (req, res) => {
  try {
    const [customers, orders] = await Promise.all([
      User.find({ role: 'customer' }).sort({ name: 1 }),
      Order.find().sort({ createdAt: -1 }),
    ]);

    const ordersByCustomer = new Map();
    orders.forEach((order) => {
      const keys = [
        order.customer?.contact,
        order.customer?.name,
      ].filter(Boolean);

      keys.forEach((key) => {
        const normalizedKey = String(key).toLowerCase();
        const list = ordersByCustomer.get(normalizedKey) || [];
        list.push(order);
        ordersByCustomer.set(normalizedKey, list);
      });
    });

    const result = customers.map((customer) => {
      const name = `${customer.name || ''} ${customer.surname || ''}`.trim();
      const matchedOrders = [
        ...(ordersByCustomer.get(String(customer.email).toLowerCase()) || []),
        ...(ordersByCustomer.get(String(customer.username).toLowerCase()) || []),
        ...(ordersByCustomer.get(name.toLowerCase()) || []),
      ];
      const uniqueOrders = [...new Map(matchedOrders.map((order) => [String(order._id), order])).values()];
      const totalSpent = uniqueOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
      const lastOrder = uniqueOrders[0];

      return {
        id: String(customer._id),
        name,
        phone: customer.username,
        email: customer.email,
        tier: getCustomerTier(totalSpent),
        points: Math.floor(totalSpent / 10),
        totalSpent,
        lastVisit: lastOrder?.createdAt || customer.updatedAt || customer.createdAt,
        lastChannel: lastOrder?.type || 'online',
        active: customer.active_status,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/customers/:id', ownerOnly, async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.phone !== undefined) updates.username = req.body.phone;
    if (req.body.active !== undefined) updates.active_status = Boolean(req.body.active);

    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'customer' },
      updates,
      { new: true, runValidators: true },
    );

    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({
      id: String(customer._id),
      name: `${customer.name || ''} ${customer.surname || ''}`.trim(),
      phone: customer.username,
      email: customer.email,
      tier: 'Basic',
      points: 0,
      totalSpent: 0,
      lastVisit: customer.updatedAt,
      lastChannel: 'online',
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/staff', isAuth, isEligible('owner'), async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: staffRoles } }).sort({ role: 1, name: 1 });
    res.json(staff.map(toStaffMember));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/staff', isAuth, isEligible('owner'), async (req, res) => {
  try {
    const { email, role } = req.body;
    const userRole = ownerRoleToUserRole(role);
    const username = email?.split('@')[0];

    if (!email || !userRole) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    const password = await bcrypt.hash(`Temp-${Date.now()}`, 10);
    const user = await User.create({
      name: username,
      surname: 'Staff',
      username,
      email,
      password,
      role: userRole,
    });

    res.status(201).json(toStaffMember(user));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/staff/:id', isAuth, isEligible('owner'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.isLocked !== undefined) updates.active_status = !req.body.isLocked;
    if (req.body.role !== undefined) updates.role = ownerRoleToUserRole(req.body.role);

    const staff = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: staffRoles } },
      updates,
      { new: true, runValidators: true },
    );

    if (!staff) return res.status(404).json({ message: 'Staff member not found' });
    res.json(toStaffMember(staff));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
