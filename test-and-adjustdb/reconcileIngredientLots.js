import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './src/configs/mongodb.js';
import { Ingredient } from './src/modules/ingredients/Ingredient.js';
import { IngredientLot } from './src/modules/ingredients/IngredientLot.js';
import { syncIngredientState } from './src/modules/ingredients/inventoryLifecycle.js';

dotenv.config();

const defaultExpiryDate = () => {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  return expiryDate;
};

const getMigrationExpiryDate = (ingredient) => {
  const expiryDate = ingredient.expiryDate ? new Date(ingredient.expiryDate) : null;
  return expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : defaultExpiryDate();
};

async function reconcileIngredientLots() {
  await connectDB();

  const ingredients = await Ingredient.find().sort({ ingredient_index: 1, name: 1 });
  let createdLots = 0;
  let syncedIngredients = 0;
  const mismatchesBeforeSync = [];

  for (const ingredient of ingredients) {
    const storedQuantity = Number(ingredient.quantity || 0);
    const activeLots = await IngredientLot.find({
      ingredient: ingredient._id,
      type: 'IN',
      remainingQuantity: { $gt: 0 },
    });
    const activeLotQuantity = activeLots.reduce(
      (total, lot) => total + Number(lot.remainingQuantity || 0),
      0,
    );

    if (storedQuantity !== activeLotQuantity) {
      mismatchesBeforeSync.push({
        name: ingredient.name,
        ingredientQuantity: storedQuantity,
        activeLotQuantity,
        activeLots: activeLots.length,
      });
    }

    if (storedQuantity > 0 && activeLotQuantity <= 0) {
      await IngredientLot.create({
        ingredient: ingredient._id,
        quantity: storedQuantity,
        remainingQuantity: storedQuantity,
        expiryDate: getMigrationExpiryDate(ingredient),
        type: 'IN',
        reason: 'Reconciled from ingredient stock',
      });
      createdLots += 1;
    }

    await syncIngredientState(ingredient._id);
    syncedIngredients += 1;
  }

  console.log(`Created ${createdLots} missing stock lot(s).`);
  console.log(`Synced ${syncedIngredients} ingredient(s) from lots.`);
  console.log(`Found ${mismatchesBeforeSync.length} ingredient quantity mismatch(es) before sync.`);
  mismatchesBeforeSync.slice(0, 20).forEach((item) => {
    console.log(
      `- ${item.name}: ingredient=${item.ingredientQuantity}, lots=${item.activeLotQuantity}, activeLots=${item.activeLots}`,
    );
  });
}

reconcileIngredientLots()
  .catch((err) => {
    console.error('Ingredient lot reconciliation failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
