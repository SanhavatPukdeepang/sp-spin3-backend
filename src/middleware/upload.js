<<<<<<< HEAD
import multer from 'multer';
import cloudinary from '../configs/cloudinary.js';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    return;
  }
  cb(null, true);
};

const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'sfc_menu',
        resource_type: 'image',
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    stream.end(file.buffer);
  });

export const upload = {
  single: (fieldName) => [
    multer({ storage, fileFilter }).single(fieldName),
    async (req, res, next) => {
      if (!req.file) {
        next();
        return;
      }

      try {
        const result = await uploadToCloudinary(req.file);
        req.file.path = result.secure_url;
        req.file.filename = result.public_id;
        next();
      } catch (err) {
        next(err);
      }
    },
  ],
};

export const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
=======
// import multer from 'multer';
// import { CloudinaryStorage } from 'multer-storage-cloudinary';
// import cloudinary from '../configs/cloudinary.js';

// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: {
//     folder: 'sfc_menu',
//     allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
//     transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
//   },
// });

// export const upload = multer({ storage: storage });

import multer from "multer";
import cloudinaryStorage from "multer-storage-cloudinary";
import cloudinary from "../configs/cloudinary.js";

const storage = cloudinaryStorage({
  cloudinary: cloudinary,
  folder: "sfc_menu",
  allowedFormats: ["jpg", "jpeg", "png", "webp"],
  transformation: [{ width: 1000, height: 1000, crop: "limit" }],
});

export const upload = multer({ storage });
>>>>>>> 4a5f4ae7e1dc1368ebcd3ee29aa77c645291c34a
