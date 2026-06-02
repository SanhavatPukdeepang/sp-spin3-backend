import { Order } from '../orders/Order.js';
import {
  buildIngredientRequirements,
  calculateOrderTotal,
  deductIngredientRequirements,
  validateIngredientRequirements,
} from '../orders/orderController.js';
import { broadcastIngredientSnapshot } from '../../realtime/ingredientSocket.js';

const isStaffPaymentUser = (user) => ['owner', 'cashier'].includes(user?.role);
const isOrderOwner = (order, user) => String(order.customer?.userId || '') === String(user?.id || '');

export const processPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.body.orderId;
    const { paymentMethod, amount } = req.body;

    if (!orderId) return res.status(400).json({ message: 'Missing orderId' });
    if (!paymentMethod) return res.status(400).json({ message: 'Missing paymentMethod' });
    if (amount == null || typeof amount !== 'number' || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!isStaffPaymentUser(req.user) && !isOrderOwner(order, req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (order.payment?.paidAt) return res.status(400).json({ message: 'Order already paid' });
    if (['completed', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot pay an order with status ${order.status}` });
    }

    const expectedAmount = calculateOrderTotal(order);
    if (Math.abs(amount - expectedAmount) > 0.01) {
      return res.status(400).json({
        message: 'Payment amount does not match order total',
        expectedAmount,
      });
    }

    const requirements = await buildIngredientRequirements(order.orderList);
    const stockError = validateIngredientRequirements(requirements);
    if (stockError) {
      return res.status(400).json({ message: stockError });
    }

    // Simulate payment gateway integration (replace with real gateway call)
    const paymentResult = { success: true, transactionId: `txn_${Date.now()}` };

    if (!paymentResult.success) {
      return res.status(402).json({ message: 'Payment failed' });
    }

    order.status = 'preparing';
    order.payment = {
      method: paymentMethod,
      amount,
      transactionId: paymentResult.transactionId,
      paidAt: new Date()
    };
    await deductIngredientRequirements(requirements);
    await order.save();
    await broadcastIngredientSnapshot();

    res.json({
      success: true,
      message: 'Payment processed successfully',
      orderId: order._id,
      status: order.status,
      transactionId: paymentResult.transactionId
    });
  } catch (err) {
    console.error('processPayment error', err);
    res.status(500).json({ message: err.message });
  }
};
