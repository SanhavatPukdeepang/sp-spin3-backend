import mongoose from 'mongoose';
import { embeddedOrderItemSchema } from '../orderItems/OrderItem.js';
 
const orderSchema = new mongoose.Schema({
  type: { type: String, enum: ['delivery', 'Onsite'], required: true },
  orderId: { type: String, unique: true },
  user_id: { type: String, required: true },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
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
  customerSnapshot: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    note: { type: String },
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
    slipUrl: { type: String },
    paidAt: { type: Date }
  },
  receiptUrl: { type: String },
  evidenceImage: { type: String },
  deliveredAt: { type: Date },
  inventoryDeductedAt: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'reserved', 'checked-in', 'preparing', 'completed', 'delivery', 'shipping', 'finished', 'delivered', 'received', 'cancelled'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ user_id: 1, createdAt: -1 });
orderSchema.index({ 'customer.userId': 1, createdAt: -1 });
orderSchema.index({ type: 1, status: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
