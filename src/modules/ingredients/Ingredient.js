import mongoose from "mongoose";

const ingredienSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true }, // เช่น kg, grams, liters
    price_per_unit: { type: Number, required: true },
    low_stock_threshold: { type: Number, required: true, default: 0 },
    active_status: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Ingredient = mongoose.model("Ingredient", ingredienSchema);
