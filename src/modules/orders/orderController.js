import { Order } from './Order.js';
import { Ingredient } from '../ingredients/Ingredient.js';
import { Menu } from '../menus/Menu.js';
import { processExpiredIngredientLots, consumeFromLots, syncIngredientState } from '../ingredients/inventoryLifecycle.js';
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
  for (const [ingredientId, { requiredQuantity }] of requirements.entries()) {
    await consumeFromLots(ingredientId, requiredQuantity, 'OUT', 'Order placed');
    await syncIngredientState(ingredientId);
  }
};

const ITEM_DONE_STATUSES = new Set(['finished', 'completed', 'cancel', 'cancelled']);
const ITEM_ACTIVE_STATUSES = new Set(['Cook', 'preparing']);
const ORDER_TERMINAL_STATUSES = new Set(['completed', 'delivered', 'cancelled']);

const getNextOrderStatusFromItems = (order) => {
  const items = Array.isArray(order?.orderList) ? order.orderList : [];
  if (items.length === 0 || ORDER_TERMINAL_STATUSES.has(order.status)) return order.status;

  const itemStatuses = items.map((item) => item?.status || 'InKitchen');
  if (itemStatuses.every((status) => status === 'cancel' || status === 'cancelled')) return 'cancelled';
  if (itemStatuses.every((status) => ITEM_DONE_STATUSES.has(status))) {
    return order.type === 'delivery' ? 'delivery' : 'finished';
  }
  if (itemStatuses.some((status) => ITEM_ACTIVE_STATUSES.has(status))) return 'preparing';
  return order.status;
};

const reconcileOrderStatus = async (order) => {
  if (!order) return order;
  const nextStatus = getNextOrderStatusFromItems(order);
  if (!nextStatus || nextStatus === order.status) return order;

  order.status = nextStatus;
  await order.save();
  return order;
};

export const getOrders = async (req, res) => {
  try {
    await processExpiredIngredientLots();
    const orders = await Order.find().sort({ createdAt: -1 });
    const reconciledOrders = await Promise.all(orders.map(reconcileOrderStatus));
    res.json(reconciledOrders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    await processExpiredIngredientLots();
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(await reconcileOrderStatus(order));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    await processExpiredIngredientLots({ broadcast: false });
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

    res.json(await reconcileOrderStatus(order));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const allowedStatuses = ['pending', 'preparing', 'completed', 'delivery', 'finished', 'delivered', 'cancelled'];
    const updates = {};

    if (req.body.status) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }
      updates.status = req.body.status;
      if (req.body.status === 'delivered') updates.deliveredAt = new Date();
    }

    if (req.body.riderNote !== undefined) updates.riderNote = req.body.riderNote;

    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
