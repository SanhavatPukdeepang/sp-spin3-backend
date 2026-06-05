import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Menu } from '../src/modules/menus/Menu.js';
import { connectDB } from '../src/configs/mongodb.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAPPING_FILE = path.join(__dirname, 'cloudinary_mapping.json');

// Manual mapping of Menu Names to Image Filenames (if they don't match exactly)
// Based on frontend/src/assets/menuData.js
const nameToFilename = {
  'Signature 8pc Bucket': 'menu-sig8pcbuc.png',
  'Party Pack 20pc': 'menu-partypack.png',
  'Zabb Team Box': 'menu-zabbteambox.png',
  'Smile Bucket': 'menu-smilebucket2.png', // Note: frontend uses smilebucket2
  'Chick N Share': 'menu-chicknshare.png',
  'Spicy Chicken Sandwich': 'menu-spicychicksand.png',
  'Classic Sandwich': 'menu-classsandwich.png',
  'Zinger Double': 'menu-zinger.png',
  'Chickskate': 'menu-chickskate.png',
  'Golden Fries L': 'menu-goldenfries.png',
  'Coleslaw': 'menu-coleslaw.png',
  'Mac and Cheese': 'menu-maccheese.png',
  'Tteokbokki': 'menu-tteokbokki.png',
  'Seafood Pajeon': 'menu-pajeon.png',
  'Japchae': 'menu-japchae.png',
  'Hot Oden': 'menu-oden.png',
  'Chocolate Cupcake': 'menu-choccup.png',
  'Soft Serve': 'menu-soft.png',
  'Coca-Cola': 'menu-cola.png',
  'Chocolate Float': 'menu-chocfloat.png',
  'Soju Original': 'menu-soju.png',
  'Makgeolli': 'menu-makgeolli.png',
  'Party Bucket Set': 'pro-combo-1.png',
  'Spicy Sandwich Set': 'pro-combo-2.png',
  'Chickskate Set': 'pro-chickskate.png',
};

async function updateDatabase() {
  try {
    if (!fs.existsSync(MAPPING_FILE)) {
      console.error(`Mapping file not found: ${MAPPING_FILE}. Please run "npm run upload:assets" first.`);
      return;
    }

    const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
    
    await connectDB();
    console.log('Connected to database');

    const menus = await Menu.find({});
    console.log(`Checking ${menus.length} menu items...`);

    const DEFAULT_IMAGE = 'https://placehold.co/600x400/e4002b/ffffff?text=Serious+Fried+Chicken';
    let updatedCount = 0;
    let defaultedCount = 0;

    for (const menu of menus) {
      const filename = nameToFilename[menu.name];
      const cloudinaryUrl = mapping[filename];

      if (cloudinaryUrl) {
        menu.image = cloudinaryUrl;
        await menu.save();
        console.log(`✅ Updated ${menu.name} -> ${cloudinaryUrl}`);
        updatedCount++;
      } else if (!menu.image || menu.image.startsWith('/images/')) {
        // If no image or still using local path, set to default
        menu.image = DEFAULT_IMAGE;
        await menu.save();
        console.log(`ℹ️ Set default for ${menu.name}`);
        defaultedCount++;
      }
    }

    console.log(`\n--- Update Complete ---`);
    console.log(`Successfully updated ${updatedCount} menu items with Cloudinary URLs.`);
    console.log(`Set ${defaultedCount} menu items to default placeholder.`);

  } catch (err) {
    console.error('An error occurred during database update:', err.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

updateDatabase();
