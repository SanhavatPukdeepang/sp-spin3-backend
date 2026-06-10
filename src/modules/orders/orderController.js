import mongoose from 'mongoose';
import { Order } from './Order.js';
import { getNextOrderId } from './orderId.js';
import { Ingredient } from '../ingredients/Ingredient.js';
import { IngredientLot } from '../ingredients/IngredientLot.js';
import { Menu } from '../menus/Menu.js';
import { User } from '../users/User.js';
import { Delivery } from '../delivery/Delivery.js';
import { Waste } from '../wastes/Waste.js';
import cloudinary from '../../configs/cloudinary.js';
import { processExpiredIngredientLots, consumeFromLots, syncIngredientState } from '../ingredients/inventoryLifecycle.js';
import { broadcastIngredientSnapshot } from '../../realtime/ingredientSocket.js';
import { broadcastTableOrderUpdate } from '../../realtime/tableOrderSocket.js';

const normalizeOrderItemQuantity = (quantity) => {
  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity) || numericQuantity < 1) return 1;
  return Math.trunc(numericQuantity);
};

const getTodayDateValue = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const PICKUP_COOK_LEAD_MINUTES = 30;
const RESERVATION_COOK_LEAD_MINUTES = 30;

const getOrderMode = (orderBody) => String(orderBody?.customer?.note || '').split('|')[0];

export const isReservationOrder = (orderBody) =>
  getOrderMode(orderBody) === 'reserve' ||
  Boolean(orderBody?.reservationPax && orderBody?.bookingDate && orderBody?.bookingTime);

export const isFutureReservationOrder = (orderBody) => {
  const orderMode = getOrderMode(orderBody);
  return (orderMode === 'reserve' || isReservationOrder(orderBody)) &&
    String(orderBody?.bookingDate || '') > getTodayDateValue();
};

const isDueReservationOrder = (order) =>
  isReservationOrder(order) && String(order?.bookingDate || '') <= getTodayDateValue();

const getScheduledCookStartAt = (order) => {
  const orderMode = getOrderMode(order);
  if (!['pickup', 'reserve'].includes(orderMode) && !isReservationOrder(order)) return null;
  if (!order?.bookingDate || !order?.bookingTime) return null;

  const serviceTime = String(order.bookingTime).match(/\d{1,2}:\d{2}/)?.[0];
  if (!serviceTime) return null;

  const serviceAt = new Date(`${order.bookingDate}T${serviceTime}:00+07:00`);
  if (Number.isNaN(serviceAt.getTime())) return null;

  const leadMinutes =
    orderMode === 'reserve' || isReservationOrder(order)
      ? RESERVATION_COOK_LEAD_MINUTES
      : PICKUP_COOK_LEAD_MINUTES;
  return new Date(serviceAt.getTime() - leadMinutes * 60 * 1000);
};

const assertScheduledCookWindow = (order) => {
  const cookStartAt = getScheduledCookStartAt(order);
  if (!cookStartAt || Date.now() >= cookStartAt.getTime()) return;

  const error = new Error(
    `This scheduled order is not ready for cooking yet.`,
  );
  error.statusCode = 409;
  throw error;
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

export const buildIngredientRequirements = async (orderList = [], { session } = {}) => {
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

  const menus = await Menu.find({ _id: { $in: menuIds } })
    .populate('ingredients.ingredient')
    .session(session || null);
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
  }
  return '';
};

export const deductIngredientRequirements = async (requirements, { session, order, reason = 'Order placed' } = {}) => {
  for (const [ingredientId, { requiredQuantity }] of requirements.entries()) {
    await consumeFromLots(ingredientId, requiredQuantity, 'OUT', reason, { session, order });
    await syncIngredientState(ingredientId, { session });
  }
};

const deductOrderInventoryIfNeeded = async (order, { session } = {}) => {
  if (!order || order.inventoryDeductedAt) return;

  const requirements = await buildIngredientRequirements(order.orderList, { session });
  const stockError = validateIngredientRequirements(requirements);
  if (stockError) {
    const error = new Error(`Cannot send order to kitchen because ${stockError}.`);
    error.statusCode = 409;
    throw error;
  }

  await deductIngredientRequirements(requirements, { session, order: order._id });
  order.inventoryDeductedAt = new Date();
};

const COOK_STARTED_ITEM_STATUSES = new Set(['Cook', 'preparing', 'finished', 'completed', 'ready', 'delivery']);

const hasStartedCooking = (order) =>
  Array.isArray(order?.orderList) &&
  order.orderList.some((item) => COOK_STARTED_ITEM_STATUSES.has(item?.status));

const restoreOrderInventoryIfPossible = async (order, { session } = {}) => {
  if (!order?.inventoryDeductedAt || hasStartedCooking(order)) return false;

  const movements = await IngredientLot.find({
    order: order._id,
    type: 'OUT',
    sourceLots: { $exists: true, $ne: [] },
  }).session(session || null);

  if (movements.length === 0) return false;

  const affectedIngredientIds = new Set();

  for (const movement of movements) {
    for (const source of movement.sourceLots || []) {
      const quantity = Number(source.quantity || 0);
      if (!source.lot || quantity <= 0) continue;
      await IngredientLot.updateOne(
        { _id: source.lot },
        { $inc: { remainingQuantity: quantity } },
        { session },
      );
    }

    await IngredientLot.create([{
      ingredient: movement.ingredient,
      quantity: Math.abs(Number(movement.quantity || 0)),
      type: 'ADJUSTMENT',
      reason: `Returned cancelled order ${order.orderId || order._id}`,
      order: order._id,
    }], { session });

    affectedIngredientIds.add(String(movement.ingredient));
  }

  for (const ingredientId of affectedIngredientIds) {
    await syncIngredientState(ingredientId, { session });
  }

  order.inventoryDeductedAt = undefined;
  return affectedIngredientIds.size > 0;
};

export const processDueReservationInventory = async () => {
  const dueReservations = await Order.find({
    inventoryDeductedAt: { $exists: false },
    bookingDate: { $lte: getTodayDateValue() },
    reservationPax: { $exists: true },
    'payment.paidAt': { $exists: true },
    status: { $nin: ['cancelled', 'delivered', 'received'] },
  });

  let deductedCount = 0;
  const errors = [];

  for (const order of dueReservations) {
    try {
      if (!isDueReservationOrder(order)) continue;
      await deductOrderInventoryIfNeeded(order);
      await order.save();
      deductedCount += 1;
    } catch (err) {
      errors.push({ orderId: order.orderId || String(order._id), message: err.message });
    }
  }

  if (deductedCount > 0) {
    await broadcastIngredientSnapshot();
    await broadcastTableOrderUpdate();
  }

  return { checkedCount: dueReservations.length, deductedCount, errors };
};

const ITEM_DONE_STATUSES = new Set(['finished', 'completed', 'cancel', 'cancelled']);
const ITEM_ACTIVE_STATUSES = new Set(['Cook', 'preparing']);
const ORDER_TERMINAL_STATUSES = new Set(['completed', 'shipping', 'delivered', 'received', 'cancelled']);
const ITEM_CANCELLED_STATUSES = new Set(['cancel', 'cancelled']);
const REDO_SOURCE_ITEM_STATUSES = new Set(['finished', 'completed', 'cancel', 'cancelled']);

const formatMoney = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const appendStaffNoteLine = (order, line) => {
  const note = String(order.note_global || '').trim();
  order.note_global = note ? `${note}\n${line}` : line;
};

const appendRefundDifferenceNoteIfNeeded = (order, reason = '') => {
  if (!order?.payment?.paidAt || !Number.isFinite(Number(order.payment.amount))) return false;

  const paidAmount = Number(order.payment.amount || 0);
  const currentTotal = calculateOrderTotal(order);
  const refundAmount = Math.round(Math.max(0, paidAmount - currentTotal) * 100) / 100;
  if (refundAmount <= 0) return false;

  appendStaffNoteLine(
    order,
    [
      `Refund required: paid ${formatMoney(paidAmount)} - current total ${formatMoney(currentTotal)} = return ${formatMoney(refundAmount)} baht.`,
      reason ? `Reason: ${reason}` : '',
    ].filter(Boolean).join(' '),
  );
  return true;
};

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
  return [order.customerId, order.user_id, order.customer?.userId]
    .filter(Boolean)
    .some((value) => String(value) === String(user.id));
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

const isRedoItemTransition = (fromStatus, toStatus) =>
  toStatus === 'InKitchen' && REDO_SOURCE_ITEM_STATUSES.has(fromStatus);

const getRedoWasteReason = (order, date = new Date()) =>
  `Redo order ${order.orderId || order._id} at ${date.toISOString()}`;

const createRedoWasteEntries = async (order, item, requirements, { session, user } = {}) => {
  const date = new Date();
  const reason = getRedoWasteReason(order, date);
  const recordedBy = user?.role ? `${user.role} ${user.id || ''}`.trim() : 'Cook';

  const wasteEntries = [...requirements.values()]
    .map(({ ingredient, requiredQuantity }) => {
      const quantity = Number(requiredQuantity || 0);
      if (!ingredient || quantity <= 0) return null;
      const pricePerUnit = Number(ingredient.price_per_unit || 0);

      return {
        ingredient: ingredient._id,
        user: user?.id || undefined,
        itemName: `${item?.name || 'Redo item'} - ${ingredient.name || 'Ingredient'}`,
        quantity,
        unit: ingredient.unit || '',
        estimatedCost: quantity * pricePerUnit,
        recordedBy,
        date,
        quantity_wasted: quantity,
        reason,
        total_cost: quantity * pricePerUnit,
      };
    })
    .filter(Boolean);

  if (wasteEntries.length > 0) {
    await Waste.create(wasteEntries, { session });
  }
};

const deductRedoItemInventory = async (order, item, { session, user } = {}) => {
  const requirements = await buildIngredientRequirements([item], { session });
  const stockError = validateIngredientRequirements(requirements);
  if (stockError) {
    const error = new Error(`Cannot redo item because ${stockError}.`);
    error.statusCode = 409;
    throw error;
  }

  await createRedoWasteEntries(order, item, requirements, { session, user });
  await deductIngredientRequirements(requirements, {
    session,
    order: order._id,
    reason: 'Order item redo',
  });
};

const reconcileOrderStatus = async (order) => {
  if (!order) return order;
  const nextStatus = getNextOrderStatusFromItems(order);
  if (!nextStatus || nextStatus === order.status) return order;

  order.status = nextStatus;
  await order.save();
  return order;
};

const toPublicRider = (rider) => {
  if (!rider) return null;
  return {
    _id: rider._id,
    name: [rider.name, rider.surname].filter(Boolean).join(' ').trim() || rider.username || 'Rider',
    phone: rider.phone || '',
  };
};

const attachDeliveryRider = async (order) => {
  if (!order) return order;

  const orderObject = typeof order.toObject === 'function' ? order.toObject() : { ...order };
  if (orderObject.type !== 'delivery') return orderObject;
  if (orderObject.rider?.name || orderObject.rider?.phone) {
    return orderObject;
  }

  const delivery = await Delivery.findOne({ order: orderObject._id })
    .populate('rider_id', 'name surname username phone')
    .sort({ updatedAt: -1, createdAt: -1 });

  const rider =
    delivery?.rider_id ||
    await User.findOne({ role: 'rider', active_status: { $ne: false } })
      .select('name surname username phone')
      .sort({ createdAt: 1 });

  return {
    ...orderObject,
    rider: toPublicRider(rider),
  };
};

export const getOrders = async (req, res) => {
  try {
    await processExpiredIngredientLots();
    const query =
      req.user?.role === 'customer'
        ? {
            $or: [
              { customerId: req.user.id },
              { user_id: String(req.user.id) },
              { 'customer.userId': String(req.user.id) },
            ],
          }
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
    const reconciledOrder = await reconcileOrderStatus(order);
    res.json(await attachDeliveryRider(reconciledOrder));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createOrder = async (req, res) => {
  let session;
  try {
    await processExpiredIngredientLots({ broadcast: false });
    
    const orderIdStr = await getNextOrderId();

    const user = await User.findById(req.user.id).select('phone role');
    const isCashier = user?.role === 'cashier' || req.user.role === 'cashier';

    const safeOrderBody = { ...req.body };
    delete safeOrderBody.payment;
    delete safeOrderBody.status;
    delete safeOrderBody.user_id;
    delete safeOrderBody.deliveredAt;
    delete safeOrderBody.evidenceImage;
    const orderList = Array.isArray(req.body.orderList)
      ? req.body.orderList.map((item) => ({
          ...item,
          quantity: normalizeOrderItemQuantity(item.quantity),
        }))
      : [];

    if (!isFutureReservationOrder(req.body)) {
      const requirements = await buildIngredientRequirements(orderList);
      const stockError = validateIngredientRequirements(requirements);
      if (stockError) {
        return res.status(400).json({ message: stockError });
      }
    }

    // Default customer logic for cashiers
    let customerData = req.body.customer || {};
    if (isCashier && !customerData.name) {
      customerData.name = 'Walk-in Customer';
    }

    const order = new Order({
      ...safeOrderBody,
      orderId: orderIdStr,
      user_id: String(req.user.id),
      customerId: req.user.id,
      customer: {
        ...customerData,
        contact: customerData.contact || customerData.phone || user?.phone || '',
        userId: customerData.userId || String(req.user.id),
      },
      customerSnapshot: {
        name: customerData.name || '',
        phone: customerData.phone || customerData.contact || user?.phone || '',
        email: customerData.email || '',
        address: customerData.address || '',
        note: customerData.note || '',
      },
      orderList,
      status: 'pending',
    });
    let shouldBroadcastIngredientSnapshot = false;
    let newOrder;
    if (!isFutureReservationOrder(order)) {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        await deductOrderInventoryIfNeeded(order, { session });
        newOrder = await order.save({ session });
      });
      shouldBroadcastIngredientSnapshot = true;
    } else {
      newOrder = await order.save();
    }

    if (shouldBroadcastIngredientSnapshot) {
      await broadcastIngredientSnapshot();
    }
    await broadcastTableOrderUpdate();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  } finally {
    if (session) await session.endSession();
  }
};

export const updateOrderItemStatus = async (req, res) => {
  let session;
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['InKitchen', 'Cook', 'finished', 'cancel', 'pending', 'preparing', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid item status' });
    }

    const existingOrder = await Order.findOne({ _id: orderId, 'orderList._id': itemId });
    if (!existingOrder) return res.status(404).json({ message: 'Order or item not found' });
    if (status === 'Cook' || status === 'preparing') {
      assertScheduledCookWindow(existingOrder);
    }

    const existingItem = existingOrder.orderList.id(itemId);
    const shouldDeductRedoInventory = isRedoItemTransition(existingItem?.status, status);
    let shouldBroadcastIngredientSnapshot = false;
    let reconciled;

    if (shouldDeductRedoInventory) {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        const lockedOrder = await Order.findOne({ _id: orderId, 'orderList._id': itemId }).session(session);
        if (!lockedOrder) {
          const error = new Error('Order or item not found');
          error.statusCode = 404;
          throw error;
        }

        const lockedItem = lockedOrder.orderList.id(itemId);
        if (isRedoItemTransition(lockedItem?.status, status)) {
          await deductRedoItemInventory(lockedOrder, lockedItem, { session, user: req.user });
          shouldBroadcastIngredientSnapshot = true;
        }

        lockedItem.status = status;
        const nextStatus = getNextOrderStatusFromItems(lockedOrder);
        if (nextStatus) lockedOrder.status = nextStatus;
        reconciled = await lockedOrder.save({ session });
      });
    } else {
      const order = await Order.findOneAndUpdate(
        { _id: orderId, 'orderList._id': itemId },
        { $set: { 'orderList.$.status': status } },
        { new: true }
      );

      reconciled = await reconcileOrderStatus(order);
      const restoredInventory =
        reconciled.status === 'cancelled' &&
        await restoreOrderInventoryIfPossible(reconciled);
      const addedRefundNote = appendRefundDifferenceNoteIfNeeded(reconciled, 'Order item changed or cancelled after payment.');
      if (restoredInventory) await reconciled.save();
      if (addedRefundNote && !restoredInventory) await reconciled.save();
      shouldBroadcastIngredientSnapshot = restoredInventory;
    }

    if (shouldBroadcastIngredientSnapshot) await broadcastIngredientSnapshot();
    await broadcastTableOrderUpdate();
    res.json(reconciled);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  } finally {
    if (session) await session.endSession();
  }
};

export const updateOrderStatus = async (req, res) => {
  let session;
  try {
  const allowedStatuses = ['pending', 'reserved', 'checked-in', 'preparing', 'completed', 'delivery', 'shipping', 'finished', 'delivered', 'received', 'cancelled'];
    const updates = {};

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isCustomer = req.user?.role === 'customer';
    if (isCustomer) {
      if (!isOrderOwner(order, req.user)) return res.status(403).json({ message: 'Access denied' });
      if (req.body.status !== 'cancelled') {
        return res.status(403).json({ message: 'Customers can only cancel orders' });
      }
      if (hasStartedCooking(order) || ORDER_TERMINAL_STATUSES.has(order.status)) {
        return res.status(403).json({ message: 'This order can no longer be cancelled' });
      }
    } else if (!['owner', 'cook', 'cashier', 'rider'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let shouldBroadcastIngredientSnapshot = false;

    if (req.body.status) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }
      updates.status = req.body.status;
      if (req.body.status === 'delivered') updates.deliveredAt = new Date();
    }

    if (req.body.note_global !== undefined) updates.note_global = req.body.note_global;
    if (req.body.cancelReason !== undefined) updates.cancelReason = req.body.cancelReason;
    if (req.body.status === 'cancelled') {
      updates.cancelledBy = {
        userId: req.user?.id || req.user?._id || '',
        name: [req.user?.name, req.user?.surname].filter(Boolean).join(' ').trim() || req.user?.username || req.user?.role || 'Staff',
        role: req.user?.role || '',
      };
    }
    if (req.body.rider !== undefined) updates.rider = req.body.rider;
    if (req.body.evidenceImage !== undefined) {
      updates.evidenceImage = await uploadDeliveryEvidence(req.body.evidenceImage, order._id);
    }
    if (req.body.tableId !== undefined) updates.tableId = req.body.tableId;
    if (req.body.reservationPax !== undefined) updates.reservationPax = Number(req.body.reservationPax) || undefined;

    Object.assign(order, updates);

    let updatedOrder;
    if (req.body.status === 'cancelled' && order.inventoryDeductedAt && !hasStartedCooking(order)) {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        const lockedOrder = await Order.findById(req.params.id).session(session);
        if (!lockedOrder) {
          const error = new Error('Order not found');
          error.statusCode = 404;
          throw error;
        }

        Object.assign(lockedOrder, updates);
        const restoredInventory = await restoreOrderInventoryIfPossible(lockedOrder, { session });
        appendRefundDifferenceNoteIfNeeded(lockedOrder, req.body.cancelReason || 'Order cancelled after payment.');
        updatedOrder = await lockedOrder.save({ session });
        shouldBroadcastIngredientSnapshot = restoredInventory;
      });
    } else if (req.body.status === 'preparing' && !order.inventoryDeductedAt && !isFutureReservationOrder(order)) {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        const lockedOrder = await Order.findById(req.params.id).session(session);
        if (!lockedOrder) {
          const error = new Error('Order not found');
          error.statusCode = 404;
          throw error;
        }

        Object.assign(lockedOrder, updates);
        await deductOrderInventoryIfNeeded(lockedOrder, { session });
        updatedOrder = await lockedOrder.save({ session });
      });
      shouldBroadcastIngredientSnapshot = true;
    } else {
      if (req.body.status === 'cancelled') {
        appendRefundDifferenceNoteIfNeeded(order, req.body.cancelReason || 'Order cancelled after payment.');
      }
      updatedOrder = await order.save();
    }

    if (shouldBroadcastIngredientSnapshot) {
      await broadcastIngredientSnapshot();
    }
    await broadcastTableOrderUpdate();
    res.json(updatedOrder);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  } finally {
    if (session) await session.endSession();
  }
};

export const uploadOrderReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Check ownership
    if (req.user.role === 'customer' && String(order.user_id) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'No receipt file uploaded' });
    }

    order.receiptUrl = req.file.path;
    // Also update slipUrl for consistency if needed
    if (!order.payment) order.payment = {};
    order.payment.slipUrl = req.file.path;
    
    await order.save();
    await broadcastTableOrderUpdate();

    res.json({
      message: 'Receipt uploaded successfully',
      receiptUrl: order.receiptUrl
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
