import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Menu } from './src/modules/menus/Menu.js';
import { connectDB } from './src/configs/mongodb.js';

dotenv.config();

async function checkMenus() {
  try {
    await connectDB();
    const menus = await Menu.find({});
    console.log('--- Current Menus in DB ---');
    menus.forEach(m => {
      console.log(`Name: "${m.name}", Image: "${m.image}"`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkMenus();
