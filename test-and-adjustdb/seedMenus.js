import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Menu } from '../src/modules/menus/Menu.js';
import { menuImageByName } from '../src/modules/menus/menuImages.js';
import { connectDB } from '../src/configs/mongodb.js';

dotenv.config();

const menuItems = [
  // CHICKEN
  { name: 'Signature 8pc Bucket', description: 'Classic Original Recipe chicken.', price: 299, image: menuImageByName['Signature 8pc Bucket'], category: 'chicken', cookingTime: 600 },
  { name: 'Party Pack 20pc', description: 'Extra spicy bucket.', price: 555, image: menuImageByName['Party Pack 20pc'], category: 'chicken', cookingTime: 600 },
  { name: 'Zabb Team Box', description: 'Wingz Zabb + nuggets combo.', price: 149, image: menuImageByName['Zabb Team Box'], category: 'chicken', cookingTime: 600 },
  { name: 'Smile Bucket', description: 'Limited time smile bucket.', price: 199, image: menuImageByName['Smile Bucket'], category: 'chicken', cookingTime: 600 },
  { name: 'Chick N Share', description: 'Perfect for sharing.', price: 99, image: menuImageByName['Chick N Share'], category: 'chicken', cookingTime: 600 },

  // BURGER
  { name: 'Spicy Chicken Sandwich', description: 'Crispy, spicy, and juicy.', price: 89, image: menuImageByName['Spicy Chicken Sandwich'], category: 'burger', cookingTime: 480 },
  { name: 'Classic Sandwich', description: 'Original crispy chicken.', price: 69, image: menuImageByName['Classic Sandwich'], category: 'burger', cookingTime: 480 },
  { name: 'Zinger Double', description: 'Double patty, double flavor.', price: 199, image: menuImageByName['Zinger Double'], category: 'burger', cookingTime: 480 },
  { name: 'Chickskate', description: 'New street style sandwich.', price: 199, image: menuImageByName.Chickskate, category: 'burger', cookingTime: 480 },

  // SIDE
  { name: 'Golden Fries L', description: 'Golden crispy fries.', price: 49, image: menuImageByName['Golden Fries L'], category: 'side', cookingTime: 180 },
  { name: 'Coleslaw', description: 'Creamy classic slaw.', price: 39, image: menuImageByName.Coleslaw, category: 'side', cookingTime: 180 },
  { name: 'Mac and Cheese', description: 'Creamy cheesey goodness.', price: 49, image: menuImageByName['Mac and Cheese'], category: 'side', cookingTime: 180 },
  { name: 'Tteokbokki', description: 'Spicy Korean rice cakes.', price: 89, image: menuImageByName.Tteokbokki, category: 'side', cookingTime: 180 },
  { name: 'Seafood Pajeon', description: 'Korean savory pancake.', price: 99, image: menuImageByName['Seafood Pajeon'], category: 'side', cookingTime: 180 },
  { name: 'Japchae', description: 'Stir-fried glass noodles.', price: 79, image: menuImageByName.Japchae, category: 'side', cookingTime: 180 },
  { name: 'Hot Oden', description: 'Light and savory broth.', price: 59, image: menuImageByName['Hot Oden'], category: 'side', cookingTime: 180 },

  // DESSERT
  { name: 'Chocolate Cupcake', description: 'Rich chocolate treat.', price: 45, image: menuImageByName['Chocolate Cupcake'], category: 'dessert', cookingTime: 0 },
  { name: 'Soft Serve', description: 'Vanilla swirl.', price: 39, image: menuImageByName['Soft Serve'], category: 'dessert', cookingTime: 0 },

  // DRINK
  { name: 'Coca-Cola', description: 'Ice cold refreshment.', price: 39, image: menuImageByName['Coca-Cola'], category: 'drink', cookingTime: 0 },
  { name: 'Chocolate Float', description: 'Choco blend with vanilla top.', price: 65, image: menuImageByName['Chocolate Float'], category: 'drink', cookingTime: 0 },
  { name: 'Soju Original', description: 'Classic Korean spirit.', price: 150, image: menuImageByName['Soju Original'], category: 'drink', cookingTime: 0 },
  { name: 'Makgeolli', description: 'Korean rice wine.', price: 180, image: menuImageByName.Makgeolli, category: 'drink', cookingTime: 0 },

  // COMBO
  { name: 'Party Bucket Set', description: 'Combo deal -10%', price: 383, image: menuImageByName['Party Bucket Set'], category: 'combo', cookingTime: 600 },
  { name: 'Spicy Sandwich Set', description: 'Combo deal -10%', price: 115, image: menuImageByName['Spicy Sandwich Set'], category: 'combo', cookingTime: 600 },
  { name: 'Chickskate Set', description: 'Try me -5%', price: 189, image: menuImageByName['Chickskate Set'], category: 'combo', cookingTime: 600 },
]

//   // BURGER
//   { name: 'Spicy Chicken Sandwich', description: 'Crispy, spicy, and juicy.', price: 89, image: '', category: 'burger', cookingTime: 480 },
//   { name: 'Classic Sandwich', description: 'Original crispy chicken.', price: 69, image: '', category: 'burger', cookingTime: 480 },
//   { name: 'Zinger Double', description: 'Double patty, double flavor.', price: 199, image: '', category: 'burger', cookingTime: 480 },
//   { name: 'Chickskate', description: 'New street style sandwich.', price: 199, image: '', category: 'burger', cookingTime: 480 },

//   // SIDE
//   { name: 'Golden Fries L', description: 'Golden crispy fries.', price: 49, image: '', category: 'side', cookingTime: 180 },
//   { name: 'Coleslaw', description: 'Creamy classic slaw.', price: 39, image: '', category: 'side', cookingTime: 180 },
//   { name: 'Mac and Cheese', description: 'Creamy cheesey goodness.', price: 49, image: '', category: 'side', cookingTime: 180 },
//   { name: 'Tteokbokki', description: 'Spicy Korean rice cakes.', price: 89, image: '', category: 'side', cookingTime: 180 },
//   { name: 'Seafood Pajeon', description: 'Korean savory pancake.', price: 99, image: '', category: 'side', cookingTime: 180 },
//   { name: 'Japchae', description: 'Stir-fried glass noodles.', price: 79, image: '', category: 'side', cookingTime: 180 },
//   { name: 'Hot Oden', description: 'Light and savory broth.', price: 59, image: '', category: 'side', cookingTime: 180 },

//   // DESSERT
//   { name: 'Chocolate Cupcake', description: 'Rich chocolate treat.', price: 45, image: '', category: 'dessert', cookingTime: 0 },
//   { name: 'Soft Serve', description: 'Vanilla swirl.', price: 39, image: '', category: 'dessert', cookingTime: 0 },

//   // DRINK
//   { name: 'Coca-Cola', description: 'Ice cold refreshment.', price: 39, image: '', category: 'drink', cookingTime: 0 },
//   { name: 'Chocolate Float', description: 'Choco blend with vanilla top.', price: 65, image: '', category: 'drink', cookingTime: 0 },
//   { name: 'Soju Original', description: 'Classic Korean spirit.', price: 150, image: '', category: 'drink', cookingTime: 0 },
//   { name: 'Makgeolli', description: 'Korean rice wine.', price: 180, image: '', category: 'drink', cookingTime: 0 },

//   // COMBO
//   { name: 'Party Bucket Set', description: 'Combo deal -10%', price: 383, image: '', category: 'combo', cookingTime: 600 },
//   { name: 'Spicy Sandwich Set', description: 'Combo deal -10%', price: 115, image: '', category: 'combo', cookingTime: 600 },
//   { name: 'Chickskate Set', description: 'Try me -5%', price: 189, image: '', category: 'combo', cookingTime: 600 },
// ]

async function seedMenus() {
  try {
    await connectDB();
    console.log('Connected to database');

    // Clear existing menus
    await Menu.deleteMany({});
    console.log('Cleared existing menus');

    // Insert new menus
    const result = await Menu.insertMany(menuItems);
    console.log(`✅ Seeded ${result.length} menu items`);
    
    result.forEach(item => {
      console.log(`  - ${item.name} (${item.cookingTime}s cooking time)`);
    });

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    process.exit(0);
  }
}

seedMenus();
