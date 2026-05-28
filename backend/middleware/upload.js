const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory storage for all uploads (process then upload to Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  const allowed = allowedTypes.includes(ext) || allowedTypes.includes(mime);
  if (allowed) return cb(null, true);
  cb(new AppError(`Only ${allowedTypes.join(', ')} files are allowed`, 400));
};

const documentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter(['.pdf', '.jpg', '.jpeg', '.png', 'application/pdf', 'image/jpeg', 'image/png']),
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter(['.jpg', '.jpeg', '.png', '.webp', 'image/jpeg', 'image/png', 'image/webp']),
});

const uploadToCloudinary = async (buffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `scholarsgate/${folder}`, ...options },
      (error, result) => {
        if (error) return reject(new AppError('File upload failed', 500));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
};

module.exports = { documentUpload, imageUpload, uploadToCloudinary, deleteFromCloudinary };
