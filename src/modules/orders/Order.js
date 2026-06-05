import mongoose from 'mongoose';
import { embeddedOrderItemSchema } from '../orderItems/OrderItem.js';
 
const orderSchema = new mongoose.Schema({
  type: { type: String, enum: ['delivery', 'Onsite'], required: true },
  orderId: { type: String, unique: true },
  user_id: { type: String, required: true },
  customer: {
    userId: { type: String },
    email: { type: String },
    username: { type: String },
    name: { type: String },
    contact: { type: String },
    address: { type: String },
    note: { type: String },
    kitchenNote: { type: String }
  },
  bookingDate: { type: String },
  bookingTime: { type: String },
  tableId: { type: String },
  reservationPax: { type: Number },
  note_global: { type: String },
  orderList: [embeddedOrderItemSchema],
  payment: {
    method: { type: String },
    amount: { type: Number },
    transactionId: { type: String },
    paidAt: { type: Date }
  },
  evidenceImage: { type: String },
  deliveredAt: { type: Date },
  inventoryDeductedAt: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'reserved', 'checked-in', 'preparing', 'completed', 'delivery', 'finished', 'delivered', 'received', 'cancelled'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

export const Order = mongoose.model('Order', orderSchema);
