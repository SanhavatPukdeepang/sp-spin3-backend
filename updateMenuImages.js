import mongoose from 'mongoose';
import { connectDB } from './src/configs/mongodb.js';
import { Menu } from './src/modules/menus/Menu.js';
import { menuImageByName } from './src/modules/menus/menuImages.js';

async function updateMenuImages() {
  try {
    await connectDB();

    const menus = await Menu.find({});
    let updatedCount = 0;
    let skippedCount = 0;

    for (const menu of menus) {
      const image = menuImageByName[menu.name];

      if (!image) {
        skippedCount += 1;
        console.log(`Skipped ${menu.name}: no local image mapping`);
        continue;
      }

      if (menu.image === image) {
        skippedCount += 1;
        continue;
      }

      menu.image = image;
      await menu.save();
      updatedCount += 1;
      console.log(`Updated ${menu.name} -> ${image}`);
    }

    console.log(`Menu image update complete. Updated: ${updatedCount}, skipped: ${skippedCount}`);
  } catch (err) {
    console.error('Menu image update failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

updateMenuImages();
