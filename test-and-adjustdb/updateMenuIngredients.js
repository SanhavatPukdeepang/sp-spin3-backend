import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './src/configs/mongodb.js';
import { Ingredient } from './src/modules/ingredients/Ingredient.js';
import { Menu } from './src/modules/menus/Menu.js';

dotenv.config();

const countBasedUnits = new Set(['piece', 'pieces', 'jar', 'jars', 'bottle', 'bottles']);

const normalizeRecipeQuantity = (quantity, unit = '') => {
  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) return 1;
  if (countBasedUnits.has(String(unit).toLowerCase())) {
    return Math.max(1, Math.round(numericQuantity));
  }
  return numericQuantity;
};

const menuRecipes = {
  'Signature 8pc Bucket': [
    ['Chicken Drumsticks', 1.6],
    ['Chicken Wings', 1.2],
    ['All-Purpose Flour', 0.4],
    ['Fried Chicken Seasoning Mix', 0.12],
    ['Vegetable Oil', 0.5],
  ],
  'Party Pack 20pc': [
    ['Chicken Drumsticks', 3],
    ['Chicken Wings', 2],
    ['All-Purpose Flour', 0.9],
    ['Fried Chicken Seasoning Mix', 0.25],
    ['Vegetable Oil', 1],
  ],
  'Zabb Team Box': [
    ['Chicken Wings', 1],
    ['Chicken Breast', 0.6],
    ['All-Purpose Flour', 0.25],
    ['Fried Chicken Seasoning Mix', 0.1],
    ['Paprika Powder', 0.03],
    ['Vegetable Oil', 0.35],
  ],
  'Smile Bucket': [
    ['Chicken Drumsticks', 1],
    ['Chicken Wings', 0.8],
    ['All-Purpose Flour', 0.3],
    ['Fried Chicken Seasoning Mix', 0.1],
    ['Vegetable Oil', 0.4],
  ],
  'Chick N Share': [
    ['Chicken Breast', 0.8],
    ['All-Purpose Flour', 0.2],
    ['Fried Chicken Seasoning Mix', 0.08],
    ['Vegetable Oil', 0.3],
  ],
  'Spicy Chicken Sandwich': [
    ['Chicken Breast', 0.25],
    ['Burger Buns', 1],
    ['Lettuce', 0.03],
    ['Mayonnaise', 0.03],
    ['Hot Sauce', 0.03],
    ['All-Purpose Flour', 0.08],
    ['Vegetable Oil', 0.15],
  ],
  'Classic Sandwich': [
    ['Chicken Breast', 0.25],
    ['Burger Buns', 1],
    ['Lettuce', 0.03],
    ['Mayonnaise', 0.03],
    ['All-Purpose Flour', 0.08],
    ['Vegetable Oil', 0.15],
  ],
  'Zinger Double': [
    ['Chicken Breast', 0.5],
    ['Brioche Buns', 1],
    ['Lettuce', 0.04],
    ['Cheddar Cheese Slices', 0.04],
    ['Hot Sauce', 0.04],
    ['All-Purpose Flour', 0.14],
    ['Vegetable Oil', 0.25],
  ],
  Chickskate: [
    ['Chicken Breast', 0.3],
    ['Brioche Buns', 1],
    ['Lettuce', 0.03],
    ['Pickles', 0.03],
    ['Mayonnaise', 0.03],
    ['All-Purpose Flour', 0.08],
    ['Vegetable Oil', 0.15],
  ],
  'Golden Fries L': [
    ['Potatoes', 0.35],
    ['Vegetable Oil', 0.12],
    ['Fried Chicken Seasoning Mix', 0.02],
  ],
  Coleslaw: [
    ['Cabbage', 0.12],
    ['Onions', 0.02],
    ['Mayonnaise', 0.04],
    ['Sugar', 0.01],
  ],
  'Mac and Cheese': [
    ['Milk', 0.12],
    ['Butter', 0.03],
    ['Cheddar Cheese Slices', 0.08],
    ['Mozzarella Cheese', 0.04],
  ],
  Tteokbokki: [
    ['Rice Cakes (Tteok)', 0.25],
    ['Gochujang (Korean Red Chili Paste)', 0.05],
    ['Korean Broth Stock', 0.15],
    ['Green Onions/Scallions', 0.02],
  ],
  'Seafood Pajeon': [
    ['Seafood Mix (for Pajeon)', 0.2],
    ['All-Purpose Flour', 0.12],
    ['Eggs', 1],
    ['Green Onions/Scallions', 0.05],
    ['Vegetable Oil', 0.08],
  ],
  Japchae: [
    ['Glass Noodles (Dangmyeon)', 0.15],
    ['Soy Sauce', 0.04],
    ['Sesame Oil', 0.02],
    ['Onions', 0.04],
    ['Green Onions/Scallions', 0.03],
    ['Sesame Seeds', 0.01],
  ],
  'Hot Oden': [
    ['Korean Broth Stock', 0.4],
    ['Fish Sauce', 0.02],
    ['Green Onions/Scallions', 0.02],
  ],
  'Chocolate Cupcake': [
    ['Cocoa Powder', 0.04],
    ['All-Purpose Flour', 0.08],
    ['Sugar', 0.06],
    ['Butter', 0.04],
    ['Eggs', 1],
  ],
  'Soft Serve': [
    ['Milk', 0.2],
    ['Sugar', 0.04],
    ['Vanilla Extract', 0.01],
  ],
  'Coca-Cola': [
    ['Coca-Cola Syrup', 0.08],
    ['Carbonated Water', 0.35],
  ],
  'Chocolate Float': [
    ['Coca-Cola Syrup', 0.08],
    ['Carbonated Water', 0.25],
    ['Milk', 0.08],
    ['Cocoa Powder', 0.02],
    ['Vanilla Extract', 0.005],
  ],
  'Soju Original': [],
  Makgeolli: [],
  'Party Bucket Set': [
    ['Chicken Drumsticks', 1.6],
    ['Chicken Wings', 1.2],
    ['Potatoes', 0.35],
    ['Coca-Cola Syrup', 0.08],
    ['Carbonated Water', 0.35],
    ['All-Purpose Flour', 0.4],
    ['Fried Chicken Seasoning Mix', 0.12],
    ['Vegetable Oil', 0.6],
  ],
  'Spicy Sandwich Set': [
    ['Chicken Breast', 0.25],
    ['Burger Buns', 1],
    ['Lettuce', 0.03],
    ['Hot Sauce', 0.03],
    ['Potatoes', 0.2],
    ['Coca-Cola Syrup', 0.08],
    ['Carbonated Water', 0.35],
    ['Vegetable Oil', 0.2],
  ],
  'Chickskate Set': [
    ['Chicken Breast', 0.3],
    ['Brioche Buns', 1],
    ['Lettuce', 0.03],
    ['Pickles', 0.03],
    ['Potatoes', 0.2],
    ['Coca-Cola Syrup', 0.08],
    ['Carbonated Water', 0.35],
    ['Vegetable Oil', 0.2],
  ],
};

async function updateMenuIngredients() {
  try {
    await connectDB();

    const ingredients = await Ingredient.find();
    const ingredientByName = new Map(ingredients.map((ingredient) => [ingredient.name, ingredient]));

    let updatedCount = 0;
    const missingIngredients = new Set();

    for (const [menuName, recipe] of Object.entries(menuRecipes)) {
      const ingredientsForMenu = recipe
        .map(([ingredientName, quantity]) => {
          const ingredient = ingredientByName.get(ingredientName);
          if (!ingredient) {
            missingIngredients.add(ingredientName);
            return null;
          }
          return {
            ingredient: ingredient._id,
            quantity: normalizeRecipeQuantity(quantity, ingredient.unit),
          };
        })
        .filter(Boolean);

      const result = await Menu.updateOne(
        { name: menuName },
        { $set: { ingredients: ingredientsForMenu } },
      );

      if (result.matchedCount > 0) {
        updatedCount += 1;
        console.log(`Updated ${menuName}: ${ingredientsForMenu.length} ingredients`);
      } else {
        console.log(`Skipped ${menuName}: menu not found`);
      }
    }

    if (missingIngredients.size > 0) {
      console.warn('Missing ingredient records:', [...missingIngredients].join(', '));
    }

    console.log(`Done. Updated ${updatedCount} menu records.`);
  } catch (err) {
    console.error('Update error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

updateMenuIngredients();
