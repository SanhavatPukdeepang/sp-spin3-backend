import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  menu: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price_at_purchase: { type: Number, required: true }
}, { timestamps: true });

export const OrderItem = mongoose.model('OrderItem', orderItemSchema);