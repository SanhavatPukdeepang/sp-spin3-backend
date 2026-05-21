
import mongoose from "mongoose";

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  order_type: { 
    type: String, 
    enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'COOKING', 'SERVED', 'COMPLETED', 'CANCELLED'], 
    required: true 
  },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  promotion: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' },
  totals: { type: Number, default: 0 },
  payment: { type: String } // เช่น CASH, CREDIT_CARD, PROMPTPAY
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);