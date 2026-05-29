import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    rider_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference ไปที่ User ที่เป็น Rider
    status: {
      type: String,
      enum: ["waiting", "picked-up", "delivered", "failed"],
      default: "waiting",
    },
    proof_photo_url: { type: String, default: null },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Delivery = mongoose.model("Delivery", deliverySchema);
