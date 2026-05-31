import { Router } from 'express';
import { router as authRouter } from './auth.js';
import { router as menuRouter } from './menu.js';
import { router as ownerRouter } from './owner.js';
import { router as tableRouter } from './table.js';
import { Order } from '../modules/orders/Order.js';

export const router = Router();

const toOwnerOrderType = (type) => {
  if (type === 'delivery') return 'Delivery';
  if (type === 'Onsite') return 'In-Restaurant';
  return 'Take Away';
};

const toOwnerOrderStatus = (status) => {
  const map = {
    pending: 'New',
    preparing: 'Cooking',
    completed: 'Ready',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
};

const toBackendOrderStatus = (status) => {
  const map = {
    New: 'pending',
    Cooking: 'preparing',
    Ready: 'completed',
    Paid: 'completed',
    Delivered: 'completed',
    Cancelled: 'cancelled',
  };
  return map[status] || status;
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

const toOwnerOrder = (order) => ({
  id: String(order._id),
  type: toOwnerOrderType(order.type),
  status: toOwnerOrderStatus(order.status),
  items: (order.orderList || []).map((item) => ({
    id: String(item._id),
    name: item.name || 'Menu item',
    quantity: item.quantity,
    price: item.price_at_purchase ?? item.price ?? 0,
  })),
  total: getOrderTotal(order),
  tableId: order.tableId || '',
  customer: order.customer,
  createdAt: order.createdAt,
});

router.use('/auth', authRouter);
router.use('/owner', ownerRouter);
router.use('/menus', menuRouter);
router.use('/tables', tableRouter);

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders.map(toOwnerOrder));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: toBackendOrderStatus(req.body.status) },
      { new: true, runValidators: true },
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(toOwnerOrder(order));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
