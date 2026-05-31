import mongoose from "mongoose";

const wasteSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    itemName: { type: String, trim: true, default: "" },
    quantity: { type: Number, min: 0 },
    unit: { type: String, trim: true, default: "" },
    estimatedCost: { type: Number, min: 0 },
    recordedBy: { type: String, trim: true, default: "" },
    date: { type: Date, default: Date.now },
    quantity_wasted: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    total_cost: { type: Number, required: true }, // จะถูกคำนวณก่อน save
  },
  { timestamps: true },
);

// Pre-save hook เพื่อคำนวณ total_cost
wasteSchema.pre("save", async function (next) {
  try {
    // คำนวณเฉพาะตอนสร้างใหม่ หรือมีการแก้ไขจำนวน quantity_wasted
    if (this.ingredient && (this.isModified("quantity_wasted") || this.isNew)) {
      const Ingredient = mongoose.model("Ingredient");
      const ingredientDoc = await Ingredient.findById(this.ingredient);

      if (ingredientDoc) {
        this.total_cost = this.quantity_wasted * ingredientDoc.price_per_unit;
        this.itemName = this.itemName || ingredientDoc.name;
        this.unit = this.unit || ingredientDoc.unit;
        this.quantity = this.quantity ?? this.quantity_wasted;
        this.estimatedCost = this.estimatedCost ?? this.total_cost;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

export const Waste = mongoose.model("Waste", wasteSchema);
