import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    ingredient_index: { type: Number, required: true, default: 0 },
    name: { type: String, required: true, trim: true, unique: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true }, // เช่น kg, grams, liters
    price_per_unit: { type: Number, required: true },
    low_stock_threshold: { type: Number, required: true, default: 0 },
    active_status: { type: Boolean, default: true },
    expiryDate: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Ingredient = mongoose.model("Ingredient", ingredientSchema);
