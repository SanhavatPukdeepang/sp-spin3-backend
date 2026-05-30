import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from './src/configs/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '../frontend/public/images');
const FOLDER_NAME = 'sfc_assets'; // Folder in Cloudinary

async function uploadImages() {
  try {
    if (!fs.existsSync(IMAGES_DIR)) {
      console.error(`Directory not found: ${IMAGES_DIR}`);
      return;
    }

    const files = fs.readdirSync(IMAGES_DIR);
    console.log(`Found ${files.length} images to upload...`);

    const results = {};

    for (const file of files) {
      const filePath = path.join(IMAGES_DIR, file);
      
      // Skip directories if any
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log(`Uploading ${file}...`);
      
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: FOLDER_NAME,
          public_id: path.parse(file).name, // Use filename without extension as public_id
          overwrite: true,
        });
        
        results[file] = result.secure_url;
        console.log(`✅ Uploaded ${file} -> ${result.secure_url}`);
      } catch (err) {
        console.error(`❌ Failed to upload ${file}:`, err.message);
      }
    }

    // Save mapping to a JSON file for reference
    const mappingPath = path.join(__dirname, 'cloudinary_mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(results, null, 2));
    
    console.log('\n--- Upload Complete ---');
    console.log(`Mapping saved to: ${mappingPath}`);
    console.log('You can use this mapping to update your seed data or database.');

  } catch (err) {
    console.error('An error occurred during bulk upload:', err.message);
  } finally {
    process.exit(0);
  }
}

uploadImages();
