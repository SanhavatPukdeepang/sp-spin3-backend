import mongoose from "mongoose";

const ingredientLotSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },
    quantity: { type: Number, required: true },
    unit: { type: String },
    expiryDate: { type: Date, default: null },
    type: {
      type: String,
      required: true,
      enum: ["IN", "OUT", "WASTE", "EXPIRED", "ADJUSTMENT"],
    },
    reason: { type: String, default: "" },
    // Only for type: "IN" entries, to track how much of this specific lot is left
    remainingQuantity: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Pre-save to set remainingQuantity for "IN" lots if not provided
ingredientLotSchema.pre("save", function () {
  if (this.quantity !== undefined) this.quantity = Math.round(Number(this.quantity || 0) * 100) / 100;
  if (this.remainingQuantity !== undefined) {
    this.remainingQuantity = Math.round(Number(this.remainingQuantity || 0) * 100) / 100;
  }
  if (this.type === "IN" && this.remainingQuantity === 0 && this.quantity > 0) {
    if (!this.isNew) return;
    this.remainingQuantity = this.quantity;
  }
});

export const IngredientLot = mongoose.model("IngredientLot", ingredientLotSchema);
