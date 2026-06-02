import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const ingredientSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  unit: String,
  expiryDate: Date,
  active_status: Boolean,
  price_per_unit: Number
});

const lotSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
  quantity: Number,
  remainingQuantity: Number,
  expiryDate: Date,
  type: String,
  reason: String
}, { timestamps: true });

const Ingredient = mongoose.model('Ingredient', ingredientSchema);
const IngredientLot = mongoose.model('IngredientLot', lotSchema);

async function refresh() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { dbName: 'serious-spin3' });
    console.log('✅ Connected to serious-spin3');

    // 1. Delete all existing lots
    await IngredientLot.deleteMany({});
    console.log('🗑️  Deleted all existing ingredient lots');

    const ingredients = await Ingredient.find({});
    console.log(`Found ${ingredients.length} ingredients to seed lots for.`);

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    for (const ing of ingredients) {
      // Create 3 batches for each ingredient
      
      // Batch 1: Expired (10 units)
      await IngredientLot.create({
        ingredient: ing._id,
        quantity: 10,
        remainingQuantity: 10,
        expiryDate: new Date(now.getTime() - (5 * oneDay)), // 5 days ago
        type: 'IN',
        reason: 'Mock: Expired batch'
      });

      // Batch 2: Expiring Soon (15 units)
      await IngredientLot.create({
        ingredient: ing._id,
        quantity: 15,
        remainingQuantity: 15,
        expiryDate: new Date(now.getTime() + (2 * oneDay)), // In 2 days
        type: 'IN',
        reason: 'Mock: Expiring soon batch'
      });

      // Batch 3: Fresh (20 units)
      await IngredientLot.create({
        ingredient: ing._id,
        quantity: 20,
        remainingQuantity: 20,
        expiryDate: new Date(now.getTime() + (30 * oneDay)), // In 30 days
        type: 'IN',
        reason: 'Mock: Fresh batch'
      });

      // Sync the ingredient total
      ing.quantity = 45; // 10 + 15 + 20
      ing.expiryDate = new Date(now.getTime() - (5 * oneDay)); // Earliest (the expired one)
      await ing.save();
      
      console.log(`  • Seeded 3 batches for ${ing.name}`);
    }

    console.log('\n✅ Mock seeding and sync completed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

refresh();
