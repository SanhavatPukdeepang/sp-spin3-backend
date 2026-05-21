import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true }
  },
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Reference ไปที่ User ที่เป็น Rider
}, { timestamps: true });

export const Delivery = mongoose.model('Delivery', deliverySchema);