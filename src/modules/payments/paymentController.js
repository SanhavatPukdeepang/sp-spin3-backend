import { Order } from '../orders/Order.js';

export const processPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.body.orderId;
    const { paymentMethod, amount } = req.body;

    if (!orderId) return res.status(400).json({ message: 'Missing orderId' });
    if (!paymentMethod) return res.status(400).json({ message: 'Missing paymentMethod' });
    if (amount == null || typeof amount !== 'number' || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'completed') return res.status(400).json({ message: 'Order already completed' });

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
    await order.save();

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
