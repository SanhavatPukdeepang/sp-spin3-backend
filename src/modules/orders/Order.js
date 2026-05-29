import mongoose from 'mongoose';
import { embeddedOrderItemSchema } from '../orderItems/OrderItem.js';
 
const orderSchema = new mongoose.Schema({
  type: { type: String, enum: ['delivery', 'Onsite'], required: true },
  customer: {
    name: { type: String, required: true },
    contact: { type: String },
    address: { type: String },
    note: { type: String }
  },
  orderList: [embeddedOrderItemSchema],
  payment: {
    method: { type: String },
    amount: { type: Number },
    transactionId: { type: String },
    paidAt: { type: Date }
  },
  status: { 
    type: String, 
    enum: ['pending', 'preparing', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

export const Order = mongoose.model('Order', orderSchema);
