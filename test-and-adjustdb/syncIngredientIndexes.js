import mongoose from 'mongoose';
import { connectDB } from './src/configs/mongodb.js';
import { Ingredient } from './src/modules/ingredients/Ingredient.js';

async function syncIngredientIndexes() {
  try {
    await connectDB();

    const ingredients = await Ingredient.find().sort({ name: 1, createdAt: 1 });
    const usedIndexes = new Set(
      ingredients
        .map((ingredient) => Number(ingredient.ingredient_index || 0))
        .filter((index) => index > 0),
    );

    let nextIndex = 1;
    let updatedCount = 0;

    for (const ingredient of ingredients) {
      if (Number(ingredient.ingredient_index || 0) > 0) continue;

      while (usedIndexes.has(nextIndex)) {
        nextIndex += 1;
      }

      ingredient.ingredient_index = nextIndex;
      usedIndexes.add(nextIndex);
      nextIndex += 1;
      updatedCount += 1;
      await ingredient.save();
    }

    console.log(`Ingredient indexes synced. Updated ${updatedCount} ingredient(s).`);
  } catch (err) {
    console.error('Unable to sync ingredient indexes:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

syncIngredientIndexes();
