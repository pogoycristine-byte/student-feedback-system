const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: 'student-feedback',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
      transformation: isVideo ? [] : [{ width: 1200, crop: 'limit', quality: 'auto' }],
      public_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
  },
});

// ── Blocked extensions (double extension attack prevention) ──
const blockedExtensions = [
  'php', 'php3', 'php4', 'php5', 'phtml',
  'exe', 'sh', 'bash', 'bat', 'cmd',
  'py', 'rb', 'pl', 'cgi',
  'js', 'jsx', 'ts', 'tsx',
  'html', 'htm', 'svg',
  'htaccess', 'htpasswd',
  'xml', 'xsl',
];

// ── Allowed mime types ──
const allowedMimes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/avi',
];

// ── Allowed mime types for profile (stricter) ──
const allowedProfileMimes = [
  'image/jpeg',
  'image/png',
];

const fileFilter = (req, file, cb) => {
  // Check 1: blocked extensions (catches double extension attacks)
  // e.g. malicious.php.jpg or malicious.php%00.jpg
  const originalName = file.originalname.toLowerCase();
  const nameParts = originalName.split('.');

  // Check every part of the filename for blocked extensions
  const hasBlockedExt = nameParts.some(part => blockedExtensions.includes(part));
  if (hasBlockedExt) {
    return cb(new Error('File type not allowed'), false);
  }

  // Check 2: null byte attack prevention
  // e.g. malicious.php%00.jpg
  if (file.originalname.includes('\0')) {
    return cb(new Error('Invalid filename'), false);
  }

  // Check 3: mime type whitelist
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Only images and videos are allowed'), false);
  }

  cb(null, true);
};

// ── Profile picture filter (stricter — images only) ──
const profileFileFilter = (req, file, cb) => {
  // Check 1: blocked extensions
  const originalName = file.originalname.toLowerCase();
  const nameParts = originalName.split('.');

  const hasBlockedExt = nameParts.some(part => blockedExtensions.includes(part));
  if (hasBlockedExt) {
    return cb(new Error('File type not allowed'), false);
  }

  // Check 2: null byte attack prevention
  if (file.originalname.includes('\0')) {
    return cb(new Error('Invalid filename'), false);
  }

  // Check 3: images only for profile pictures
  if (!allowedProfileMimes.includes(file.mimetype)) {
    return cb(new Error('Only JPG and PNG images are allowed for profile pictures'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Profile picture upload ──
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'student-feedback/profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' }],
    public_id: `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }),
});

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: profileFileFilter, // ← stricter filter for profile pictures
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { upload, uploadProfile, cloudinary };