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

const uploadToCloudinary = (file, folder = 'sfc_menu') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
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
  single: (fieldName, folder = 'sfc_menu') => [
    multer({ storage, fileFilter }).single(fieldName),
    async (req, res, next) => {
      if (!req.file) {
        next();
        return;
      }

      try {
        const result = await uploadToCloudinary(req.file, folder);
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
 




