const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const streamToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(new Error(error.message));
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
};

const uploadToCloud = async (file, folder = 'uploads') => {
  const result = await streamToCloudinary(file.buffer, {
    resource_type: 'auto',           // handles images + PDFs
    folder: `college-bus/${folder}`,
    use_filename: false,
    unique_filename: true,
  });

  return {
    url:      result.secure_url,
    publicId: result.public_id,
    format:   result.format,
    bytes:    result.bytes,
  };
};

const deleteFromCloud = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
  } catch {
    // Ignore — file may already be removed
  }
};

module.exports = { upload, uploadToCloud, deleteFromCloud };
