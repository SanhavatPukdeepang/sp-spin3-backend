import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Ingredient } from './src/modules/ingredients/Ingredient.js';
import { connectDB } from './src/configs/mongodb.js';

dotenv.config();

const ingredients = [
  // PROTEINS
  {
    name: 'Chicken Breast',
    quantity: 45,
    unit: 'kg',
    price_per_unit: 150,
    low_stock_threshold: 20,
    active_status: true,
  },
  {
    name: 'Chicken Drumsticks',
    quantity: 35,
    unit: 'kg',
    price_per_unit: 120,
    low_stock_threshold: 15,
    active_status: true,
  },
  {
    name: 'Chicken Wings',
    quantity: 50,
    unit: 'kg',
    price_per_unit: 140,
    low_stock_threshold: 25,
    active_status: true,
  },
  {
    name: 'Ground Chicken',
    quantity: 12,
    unit: 'kg',
    price_per_unit: 160,
    low_stock_threshold: 10,
    active_status: true,
  },

  // BREADING & SEASONING
  {
    name: 'All-Purpose Flour',
    quantity: 100,
    unit: 'kg',
    price_per_unit: 25,
    low_stock_threshold: 30,
    active_status: true,
  },
  {
    name: 'Fried Chicken Seasoning Mix',
    quantity: 8,
    unit: 'kg',
    price_per_unit: 180,
    low_stock_threshold: 5,
    active_status: true,
  },
  {
    name: 'Paprika Powder',
    quantity: 5,
    unit: 'kg',
    price_per_unit: 120,
    low_stock_threshold: 2,
    active_status: true,
  },
  {
    name: 'Black Pepper',
    quantity: 3,
    unit: 'kg',
    price_per_unit: 200,
    low_stock_threshold: 1,
    active_status: true,
  },
  {
    name: 'Garlic Powder',
    quantity: 2,
    unit: 'kg',
    price_per_unit: 150,
    low_stock_threshold: 1,
    active_status: true,
  },

  // OILS & FRYING
  {
    name: 'Vegetable Oil',
    quantity: 150,
    unit: 'liters',
    price_per_unit: 45,
    low_stock_threshold: 50,
    active_status: true,
  },
  {
    name: 'Sesame Oil',
    quantity: 5,
    unit: 'liters',
    price_per_unit: 280,
    low_stock_threshold: 2,
    active_status: true,
  },

  // BREADS & BUNS
  {
    name: 'Burger Buns',
    quantity: 200,
    unit: 'pieces',
    price_per_unit: 8,
    low_stock_threshold: 100,
    active_status: true,
  },
  {
    name: 'Brioche Buns',
    quantity: 80,
    unit: 'pieces',
    price_per_unit: 12,
    low_stock_threshold: 40,
    active_status: true,
  },

  // VEGETABLES
  {
    name: 'Potatoes',
    quantity: 200,
    unit: 'kg',
    price_per_unit: 35,
    low_stock_threshold: 50,
    active_status: true,
  },
  {
    name: 'Cabbage',
    quantity: 30,
    unit: 'kg',
    price_per_unit: 30,
    low_stock_threshold: 10,
    active_status: true,
  },
  {
    name: 'Lettuce',
    quantity: 15,
    unit: 'kg',
    price_per_unit: 40,
    low_stock_threshold: 5,
    active_status: true,
  },
  {
    name: 'Tomatoes',
    quantity: 20,
    unit: 'kg',
    price_per_unit: 45,
    low_stock_threshold: 8,
    active_status: true,
  },
  {
    name: 'Onions',
    quantity: 25,
    unit: 'kg',
    price_per_unit: 25,
    low_stock_threshold: 10,
    active_status: true,
  },
  {
    name: 'Pickles',
    quantity: 8,
    unit: 'jars',
    price_per_unit: 85,
    low_stock_threshold: 3,
    active_status: true,
  },

  // DAIRY & CHEESE
  {
    name: 'Cheddar Cheese Slices',
    quantity: 25,
    unit: 'kg',
    price_per_unit: 280,
    low_stock_threshold: 10,
    active_status: true,
  },
  {
    name: 'Mozzarella Cheese',
    quantity: 15,
    unit: 'kg',
    price_per_unit: 250,
    low_stock_threshold: 5,
    active_status: true,
  },
  {
    name: 'Milk',
    quantity: 50,
    unit: 'liters',
    price_per_unit: 35,
    low_stock_threshold: 20,
    active_status: true,
  },
  {
    name: 'Butter',
    quantity: 10,
    unit: 'kg',
    price_per_unit: 180,
    low_stock_threshold: 5,
    active_status: true,
  },
  {
    name: 'Mayonnaise',
    quantity: 12,
    unit: 'jars',
    price_per_unit: 95,
    low_stock_threshold: 5,
    active_status: true,
  },

  // CONDIMENTS & SAUCES
  {
    name: 'Ketchup',
    quantity: 15,
    unit: 'bottles',
    price_per_unit: 65,
    low_stock_threshold: 5,
    active_status: true,
  },
  {
    name: 'Soy Sauce',
    quantity: 8,
    unit: 'liters',
    price_per_unit: 85,
    low_stock_threshold: 3,
    active_status: true,
  },
  {
    name: 'Hot Sauce',
    quantity: 6,
    unit: 'bottles',
    price_per_unit: 120,
    low_stock_threshold: 2,
    active_status: true,
  },
  {
    name: 'Gochujang (Korean Red Chili Paste)',
    quantity: 4,
    unit: 'kg',
    price_per_unit: 150,
    low_stock_threshold: 1,
    active_status: true,
  },
  {
    name: 'Fish Sauce',
    quantity: 3,
    unit: 'liters',
    price_per_unit: 95,
    low_stock_threshold: 1,
    active_status: true,
  },

  // KOREAN SPECIALTY ITEMS
  {
    name: 'Rice Cakes (Tteok)',
    quantity: 20,
    unit: 'kg',
    price_per_unit: 120,
    low_stock_threshold: 8,
    active_status: true,
  },
  {
    name: 'Glass Noodles (Dangmyeon)',
    quantity: 5,
    unit: 'kg',
    price_per_unit: 180,
    low_stock_threshold: 2,
    active_status: true,
  },
  {
    name: 'Seafood Mix (for Pajeon)',
    quantity: 0,
    unit: 'kg',
    price_per_unit: 280,
    low_stock_threshold: 3,
    active_status: true,
  },
  {
    name: 'Korean Broth Stock',
    quantity: 25,
    unit: 'liters',
    price_per_unit: 65,
    low_stock_threshold: 10,
    active_status: true,
  },

  // DESSERT INGREDIENTS
  {
    name: 'Cocoa Powder',
    quantity: 4,
    unit: 'kg',
    price_per_unit: 200,
    low_stock_threshold: 2,
    active_status: true,
  },
  {
    name: 'Sugar',
    quantity: 80,
    unit: 'kg',
    price_per_unit: 30,
    low_stock_threshold: 25,
    active_status: true,
  },
  {
    name: 'Eggs',
    quantity: 150,
    unit: 'pieces',
    price_per_unit: 4,
    low_stock_threshold: 50,
    active_status: true,
  },
  {
    name: 'Vanilla Extract',
    quantity: 2,
    unit: 'liters',
    price_per_unit: 320,
    low_stock_threshold: 0.5,
    active_status: true,
  },

  // BEVERAGES
  {
    name: 'Coca-Cola Syrup',
    quantity: 30,
    unit: 'liters',
    price_per_unit: 85,
    low_stock_threshold: 10,
    active_status: true,
  },
  {
    name: 'Carbonated Water',
    quantity: 100,
    unit: 'liters',
    price_per_unit: 25,
    low_stock_threshold: 30,
    active_status: true,
  },

  // MISCELLANEOUS
  {
    name: 'Sesame Seeds',
    quantity: 2,
    unit: 'kg',
    price_per_unit: 250,
    low_stock_threshold: 0.5,
    active_status: true,
  },
  {
    name: 'Green Onions/Scallions',
    quantity: 8,
    unit: 'kg',
    price_per_unit: 60,
    low_stock_threshold: 3,
    active_status: true,
  },
  {
    name: 'Garlic',
    quantity: 12,
    unit: 'kg',
    price_per_unit: 50,
    low_stock_threshold: 5,
    active_status: true,
  },
  {
    name: 'Ginger',
    quantity: 5,
    unit: 'kg',
    price_per_unit: 80,
    low_stock_threshold: 2,
    active_status: true,
  },
];

async function seedIngredients() {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    // Clear existing ingredients
    await Ingredient.deleteMany({});
    console.log('🗑️  Cleared existing ingredients');

    // Insert new ingredients
    const result = await Ingredient.insertMany(ingredients);
    console.log(`\n✅ Seeded ${result.length} ingredients\n`);

    // Display grouped by category
    console.log('📦 PROTEINS:');
    result.filter(i => ['Chicken'].some(cat => i.name.includes(cat))).forEach(item => {
      console.log(`  • ${item.name}: ${item.quantity} ${item.unit} ${item.quantity < item.low_stock_threshold ? '⚠️  LOW STOCK' : '✓'}`);
    });

    console.log('\n🌶️  BREADING & SEASONING:');
    result.filter(i => ['Flour', 'Seasoning', 'Powder', 'Pepper'].some(cat => i.name.includes(cat))).forEach(item => {
      console.log(`  • ${item.name}: ${item.quantity} ${item.unit} ${item.quantity < item.low_stock_threshold ? '⚠️  LOW STOCK' : '✓'}`);
    });

    console.log('\n🛢️  OILS:');
    result.filter(i => i.name.includes('Oil')).forEach(item => {
      console.log(`  • ${item.name}: ${item.quantity} ${item.unit}`);
    });

    console.log('\n🥔 VEGETABLES:');
    result.filter(i => ['Potatoes', 'Cabbage', 'Lettuce', 'Tomatoes', 'Onions', 'Pickles'].some(cat => i.name.includes(cat))).forEach(item => {
      console.log(`  • ${item.name}: ${item.quantity} ${item.unit} ${item.quantity < item.low_stock_threshold ? '⚠️  LOW STOCK' : '✓'}`);
    });

    console.log('\n🧀 DAIRY & CHEESE:');
    result.filter(i => ['Cheese', 'Milk', 'Butter', 'Mayo'].some(cat => i.name.includes(cat))).forEach(item => {
      console.log(`  • ${item.name}: ${item.quantity} ${item.unit} ${item.quantity < item.low_stock_threshold ? '⚠️  LOW STOCK' : '✓'}`);
    });

    console.log('\n🌶️  SAUCES & CONDIMENTS:');
    result.filter(i => ['Ketchup', 'Sauce', 'Soy', 'Hot', 'Fish', 'Paste'].some(cat => i.name.includes(cat))).forEach(item => {
      console.log(`  • ${item.name}: ${item.quantity} ${item.unit} ${item.quantity < item.low_stock_threshold ? '⚠️  LOW STOCK' : '✓'}`);
    });

    console.log('\n🇰🇷 KOREAN SPECIALTIES:');
    result.filter(i => ['Tteok', 'Glass', 'Seafood', 'Broth'].some(cat => i.name.includes(cat))).forEach(item => {
      if (item.quantity === 0) {
        console.log(`  • ${item.name}: ${item.quantity} ${item.unit} ❌ OUT OF STOCK`);
      } else {
        console.log(`  • ${item.name}: ${item.quantity} ${item.unit} ${item.quantity < item.low_stock_threshold ? '⚠️  LOW STOCK' : '✓'}`);
      }
    });

    console.log('\n🍰 DESSERT INGREDIENTS:');
    result.filter(i => ['Cocoa', 'Sugar', 'Eggs', 'Vanilla'].some(cat => i.name.includes(cat))).forEach(item => {
      console.log(`  • ${item.name}: ${item.quantity} ${item.unit} ${item.quantity < item.low_stock_threshold ? '⚠️  LOW STOCK' : '✓'}`);
    });

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    process.exit(0);
  }
}

seedIngredients();
