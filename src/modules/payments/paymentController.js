import { Order } from '../orders/Order.js';
import {
  buildIngredientRequirements,
  calculateOrderTotal,
  isFutureReservationOrder,
  isReservationOrder,
  validateIngredientRequirements,
} from '../orders/orderController.js';
import { broadcastTableOrderUpdate } from '../../realtime/tableOrderSocket.js';

const isStaffPaymentUser = (user) => ['owner', 'cashier'].includes(user?.role);
const isOrderOwner = (order, user) => String(order.customer?.userId || '') === String(user?.id || '');

export const processPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.body.orderId;
    const { paymentMethod, amount } = req.body;

    if (!orderId) return res.status(400).json({ message: 'Missing orderId' });
    if (!paymentMethod) return res.status(400).json({ message: 'Missing paymentMethod' });
    
    // When slip is uploaded, amount might come as string from FormData
    const numericAmount = Number(amount);
    if (numericAmount == null || isNaN(numericAmount) || numericAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });

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
    if (Math.abs(numericAmount - expectedAmount) > 0.01) {
      return res.status(400).json({
        message: 'Payment amount does not match order total',
        expectedAmount,
      });
    }

    if (!isFutureReservationOrder(order)) {
      const requirements = await buildIngredientRequirements(order.orderList);
      const stockError = validateIngredientRequirements(requirements);
      if (stockError) {
        const shouldClearOrder = order.status === 'pending' && !order.payment?.paidAt;
        if (shouldClearOrder) {
          await Order.findByIdAndDelete(order._id);
          await broadcastTableOrderUpdate();
        }

        return res.status(409).json({
          message: shouldClearOrder
            ? `Cannot process payment because ${stockError}. The order has been cleared. Please create a new order with available menu quantities.`
            : `Cannot process payment because ${stockError}.`,
          reason: stockError,
          orderCleared: shouldClearOrder,
        });
      }
    }

    // Simulate payment gateway integration or handle manual slip
    const paymentResult = { success: true, transactionId: `txn_${Date.now()}` };

    if (!paymentResult.success) {
      return res.status(402).json({ message: 'Payment failed' });
    }

    order.status = 'pending';
    const slipUrl = req.file?.path || '';

    order.payment = {
      method: paymentMethod,
      amount: numericAmount,
      transactionId: paymentResult.transactionId,
      ...(slipUrl ? { slipUrl } : {}),
      paidAt: new Date()
    };

    if (slipUrl) {
      order.evidenceImage = slipUrl;
      order.receiptUrl = slipUrl;
    }

    await order.save();
    await broadcastTableOrderUpdate();

    res.json({
      success: true,
      message: 'Payment processed successfully',
      orderId: order._id,
      status: order.status,
      transactionId: paymentResult.transactionId,
      evidenceImage: order.evidenceImage,
      slipUrl: order.payment?.slipUrl || ''
    });
  } catch (err) {
    console.error('processPayment error', err);
    res.status(500).json({ message: err.message });
  }
};
