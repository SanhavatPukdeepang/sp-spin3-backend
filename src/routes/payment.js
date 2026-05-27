import { Router } from 'express';
import { Order } from '../modules/users/Order.js';

export const router = Router();

// Process payment (mock)
router.post('/:orderId/process', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod, amount } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // In a real app, you'd call a payment gateway here
    // For now, we'll just mark it as preparing if paid
    order.status = 'preparing';
    // We could add a payment field to the order model if needed
    await order.save();

    res.json({ 
      message: 'Payment processed successfully', 
      orderId: order._id,
      status: order.status
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
