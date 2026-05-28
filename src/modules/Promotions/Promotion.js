import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["fixed", "percentage"], required: true },
    value: { type: Number, required: true },
    date_from: { type: Date, required: true },
    date_to: { type: Date, required: true },
    active_status: { type: Boolean, default: true },
  },

  { timestamps: true },
);
export const Promotion = mongoose.model("Promotion", promotionSchema);
