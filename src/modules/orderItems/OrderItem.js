import mongoose from "mongoose";

export const orderItemSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    menu_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    price_at_purchase: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "preparing", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const embeddedOrderItemSchema = new mongoose.Schema(
  {
    name: { type: String },
    menu_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
    },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number },
    price_at_purchase: { type: Number },
    image: { type: String },
    note: { type: String },
    cookingTime: { type: Number },
    status: {
      type: String,
      enum: ["InKitchen", "Cook", "finished", "cancel", "pending", "preparing", "completed", "cancelled"],
      default: "InKitchen",
    },
  },
  { timestamps: true },
);

export const OrderItem = mongoose.model("OrderItem", orderItemSchema);
