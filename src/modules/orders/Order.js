import mongoose from 'mongoose';
import { embeddedOrderItemSchema } from '../orderItems/OrderItem.js';
 
const orderSchema = new mongoose.Schema({
  type: { type: String, enum: ['delivery', 'Onsite'], required: true },
  customer: {
    userId: { type: String },
    email: { type: String },
    username: { type: String },
    name: { type: String },
    contact: { type: String },
    address: { type: String },
    note: { type: String }
  },
  bookingDate: { type: String },
  bookingTime: { type: String },
  orderList: [embeddedOrderItemSchema],
  payment: {
    method: { type: String },
    amount: { type: Number },
    transactionId: { type: String },
    paidAt: { type: Date }
  },
  riderNote: { type: String },
  deliveredAt: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'preparing', 'completed', 'delivery', 'finished', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

export const Order = mongoose.model('Order', orderSchema);
