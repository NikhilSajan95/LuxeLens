const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
// This tells the Cloudinary package who you are.
// It automatically reads from your .env file.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure CloudinaryStorage
// This tells Multer *how* and *where* to send your files.
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        // The folder name in your Cloudinary account
        folder: 'luxe-lens-products', 
        
        // A list of file formats to allow
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp','svg'],
        
        // Optional: Apply a transformation on upload.
        // This one resizes images to be a max of 1000x1000
        // while maintaining aspect ratio, which is great for e-commerce.
        transformation: [
            { width: 1000, height: 1000, crop: 'limit' }
        ]
    }
});

// 3. File Filter (Your Zod schema already does this)
// This is a basic check. Your Zod `fileSchema` will
// perform a more robust validation on the file stream.
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};


// storage for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'luxe-lens-profiles',
    format: async (req, file) => file.mimetype.split('/')[1],
    public_id: (req, file) => `profile_${req.session?.user?._id || 'anon'}_${Date.now()}`,
  },
});


// 4. Initialize Multer
const upload = multer({
    storage: storage,         // Use Cloudinary for storage
    fileFilter: fileFilter,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB file size limit
    } 
});

const uploadProfile = multer({ storage: profileStorage, fileFilter });

module.exports = {upload,uploadProfile};