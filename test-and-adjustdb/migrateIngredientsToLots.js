import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import Models
const ingredientSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  unit: String,
  expiryDate: Date,
  active_status: Boolean
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

async function migrate() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName: 'serious-spin3' });
    console.log('Connected successfully to serious-spin3.');

    const ingredients = await Ingredient.find({ quantity: { $gt: 0 } });
    console.log(`Found ${ingredients.length} ingredients with stock to migrate.`);

    for (const ing of ingredients) {
      // Check if lots already exist for this ingredient
      const existingLots = await IngredientLot.countDocuments({ ingredient: ing._id });
      
      if (existingLots > 0) {
        console.log(`Skipping ${ing.name} - already has lots.`);
        continue;
      }

      console.log(`Migrating ${ing.name}: ${ing.quantity} ${ing.unit}...`);

      await IngredientLot.create({
        ingredient: ing._id,
        quantity: ing.quantity,
        remainingQuantity: ing.quantity,
        expiryDate: ing.expiryDate || null,
        type: 'IN',
        reason: 'Migration: Initial batch creation'
      });
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
