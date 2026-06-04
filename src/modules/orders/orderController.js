import { Order } from './Order.js';
import { Ingredient } from '../ingredients/Ingredient.js';
import { Menu } from '../menus/Menu.js';
import { User } from '../users/User.js';
import cloudinary from '../../configs/cloudinary.js';
import { processExpiredIngredientLots, consumeFromLots, syncIngredientState } from '../ingredients/inventoryLifecycle.js';

const normalizeOrderItemQuantity = (quantity) => {
  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity) || numericQuantity < 1) return 1;
  return Math.trunc(numericQuantity);
};

const isDataImage = (value) =>
  typeof value === 'string' && /^data:image\/(png|jpe?g|webp);base64,/i.test(value);

const uploadDeliveryEvidence = async (image, orderId) => {
  if (!isDataImage(image)) return image;

  const result = await cloudinary.uploader.upload(image, {
    folder: 'delivered picture',
    public_id: `order-${orderId}-${Date.now()}`,
    resource_type: 'image',
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
  });

  return result.secure_url;
};

export const buildIngredientRequirements = async (orderList = []) => {
  const requirements = new Map();
  requirements.errors = [];
  const addRequirementError = (message) => {
    if (!requirements.errors.includes(message)) requirements.errors.push(message);
  };
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
    if (!menu) {
      addRequirementError(`${item?.name || 'Menu item'} is not available`);
      return;
    }

    const orderQuantity = normalizeOrderItemQuantity(item.quantity);
    menu.ingredients.forEach((entry) => {
      const ingredient = entry.ingredient;
      if (!ingredient) {
        addRequirementError(`${menu.name || item?.name || 'Menu item'} has missing stock data`);
        return;
      }

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

export const validateIngredientRequirements = (requirements) => {
  if (Array.isArray(requirements?.errors) && requirements.errors.length > 0) {
    return requirements.errors[0];
  }

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

export const deductIngredientRequirements = async (requirements) => {
  for (const [ingredientId, { requiredQuantity }] of requirements.entries()) {
    await consumeFromLots(ingredientId, requiredQuantity, 'OUT', 'Order placed');
    await syncIngredientState(ingredientId);
  }
};

const ITEM_DONE_STATUSES = new Set(['finished', 'completed', 'cancel', 'cancelled']);
const ITEM_ACTIVE_STATUSES = new Set(['Cook', 'preparing']);
const ORDER_TERMINAL_STATUSES = new Set(['completed', 'delivered', 'cancelled']);
const ITEM_CANCELLED_STATUSES = new Set(['cancel', 'cancelled']);

export const calculateOrderTotal = (order) => {
  const items = Array.isArray(order?.orderList) ? order.orderList : [];
  const subtotal = items.reduce((sum, item) => {
    if (ITEM_CANCELLED_STATUSES.has(item?.status)) return sum;
    const quantity = normalizeOrderItemQuantity(item.quantity);
    return sum + Number(item.price || item.price_at_purchase || 0) * quantity;
  }, 0);
  const tax = subtotal * 0.07;
  return Math.round((subtotal + tax) * 100) / 100;
};

const isOrderOwner = (order, user) => {
  if (!order || !user?.id) return false;
  return String(order.user_id || order.customer?.userId || '') === String(user.id);
};

const canReadOrder = (order, user) => {
  if (['owner', 'cook', 'cashier', 'rider'].includes(user?.role)) return true;
  return user?.role === 'customer' && isOrderOwner(order, user);
};

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
    const query =
      req.user?.role === 'customer'
        ? { $or: [{ user_id: String(req.user.id) }, { 'customer.userId': String(req.user.id) }] }
        : {};
    const orders = await Order.find(query).sort({ createdAt: -1 });
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
    if (!canReadOrder(order, req.user)) return res.status(403).json({ message: 'Access denied' });
    res.json(await reconcileOrderStatus(order));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    await processExpiredIngredientLots({ broadcast: false });
    const user = await User.findById(req.user.id).select('phone');
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

    const order = new Order({
      ...req.body,
      user_id: String(req.user.id),
      customer: {
        ...(req.body.customer || {}),
        contact: req.body.customer?.contact || req.body.customer?.phone || user?.phone || '',
        userId: String(req.user.id),
      },
      orderList,
      status: 'pending',
    });
    const newOrder = await order.save();
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

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isCustomer = req.user?.role === 'customer';
    if (isCustomer) {
      if (!isOrderOwner(order, req.user)) return res.status(403).json({ message: 'Access denied' });
      if (req.body.status !== 'cancelled' || order.status !== 'pending') {
        return res.status(403).json({ message: 'Customers can only cancel pending orders' });
      }
    } else if (!['owner', 'cook', 'cashier', 'rider'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.body.status) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }
      updates.status = req.body.status;
      if (req.body.status === 'delivered') updates.deliveredAt = new Date();
    }

    if (req.body.evidenceImage !== undefined) {
      updates.evidenceImage = await uploadDeliveryEvidence(req.body.evidenceImage, order._id);
    }

    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
