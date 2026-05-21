import mongoose from "mongoose";

const wasteSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity_wasted: { type: Number, required: true, min: 0 },
  reason: { type: String },
  total_cost: { type: Number } // จะถูกคำนวณก่อน save
}, { timestamps: true });

// Pre-save hook เพื่อคำนวณ total_cost
wasteSchema.pre('save', async function(next) {
  try {
    // คำนวณเฉพาะตอนสร้างใหม่ หรือมีการแก้ไขจำนวน quantity_wasted
    if (this.isModified('quantity_wasted') || this.isNew) {
      const Ingredient = mongoose.model('Ingredient');
      const ingredientDoc = await Ingredient.findById(this.ingredient);
      
      if (ingredientDoc) {
        this.total_cost = this.quantity_wasted * ingredientDoc.price_per_unit;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

export const Waste = mongoose.model('Waste', wasteSchema);