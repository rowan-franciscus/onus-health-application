/**
 * File Upload Middleware
 * Configures multer for handling file uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('./error.middleware');
const config = require('../config/environment');

// Determine base upload directory based on environment
const getBaseUploadDir = () => {
  // Check if running on Render with persistent storage
  if (process.env.RENDER && fs.existsSync('/mnt/data')) {
    return path.join('/mnt/data', 'uploads');
  }
  // Fall back to local uploads directory
  return path.join(__dirname, '../uploads');
};

// Create uploads directory if it doesn't exist
const uploadDir = getBaseUploadDir();
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure consultation uploads directory
const consultationUploadDir = path.join(uploadDir, 'consultations');
if (!fs.existsSync(consultationUploadDir)) {
  fs.mkdirSync(consultationUploadDir, { recursive: true });
}

// Configure physical records uploads directory
const physicalRecordsUploadDir = path.join(uploadDir, 'physical-records');
if (!fs.existsSync(physicalRecordsUploadDir)) {
  fs.mkdirSync(physicalRecordsUploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Place files in type-specific folders
    let destinationPath = uploadDir;
    
    // If file type is for medical records, organize by type
    if (req.path.includes('/medical-records/')) {
      const recordType = req.path.split('/medical-records/')[1].split('/')[0];
      destinationPath = path.join(uploadDir, 'medical-records', recordType);
      
      // Create nested directory if it doesn't exist
      if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, { recursive: true });
      }
    } else if (req.path.includes('/profile-images/')) {
      destinationPath = path.join(uploadDir, 'profile-images');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, { recursive: true });
      }
    } else if (req.path.includes('/attachments')) {
      // For consultation attachments
      destinationPath = consultationUploadDir;
    } else if (req.path.includes('/physical-records')) {
      destinationPath = physicalRecordsUploadDir;
    }
    
    cb(null, destinationPath);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types by mime type
  const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const documentMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  // Check if file is an allowed image or document
  if (imageMimeTypes.includes(file.mimetype) || documentMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Unsupported file type. Please upload an image (JPEG, PNG, GIF) or document (PDF, DOC, DOCX).'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize // Default 5MB
  }
});

// Specific upload instances for different parts of the application
const uploadConsultationFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize // Default 5MB
  }
});

// Dedicated filter for physical records: PDF + images (including WEBP)
const physicalRecordsFileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only PDF, JPG, PNG, or WEBP files are allowed.'), false);
  }
};

const uploadPhysicalRecordFile = multer({
  storage,
  fileFilter: physicalRecordsFileFilter,
  limits: {
    fileSize: config.maxFileSize // Default 5MB
  }
});

// Signed paper consent forms (Add Patient). Kept in memory so nothing is
// written to disk until the content is checked and the patient is created.
const CONSENT_FORM_MAX_SIZE = 10 * 1024 * 1024;
const CONSENT_FORM_FIELD = 'consentForm';
const CONSENT_FORM_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'application/pdf': '.pdf'
};
const CONSENT_FORM_TYPE_MESSAGE = 'The consent form must be a JPEG, PNG, HEIC image or a PDF.';
const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'];
const HEIF_BRANDS = ['heif', 'mif1', 'msf1'];
// HEIC and HEIF share a container; browsers report either for the same photo
const isHeifType = (type) => type === 'image/heic' || type === 'image/heif';

const fileTooLargeMessage = (maxBytes) => `File too large. Maximum size is ${maxBytes / (1024 * 1024)}MB.`;

/**
 * Type from the file's leading bytes, or null. The declared mimetype comes
 * from the client, so it is only trusted when the content agrees.
 */
const sniffConsentFormType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'image/png';
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buffer.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('latin1');
    if (HEIC_BRANDS.includes(brand)) return 'image/heic';
    if (HEIF_BRANDS.includes(brand)) return 'image/heif';
  }
  return null;
};

/** Error message for an unacceptable consent form, or null when it is fine. */
const consentFormError = (file) => {
  if (!file) return null;
  if (!file.buffer || file.size === 0) return 'The consent form file is empty.';
  if (file.size > CONSENT_FORM_MAX_SIZE) return fileTooLargeMessage(CONSENT_FORM_MAX_SIZE);
  const sniffed = sniffConsentFormType(file.buffer);
  if (!sniffed) return CONSENT_FORM_TYPE_MESSAGE;
  const declared = file.mimetype;
  if (declared !== sniffed && !(isHeifType(declared) && isHeifType(sniffed))) return CONSENT_FORM_TYPE_MESSAGE;
  return null;
};

const uploadConsentForm = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (CONSENT_FORM_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new ApiError(400, CONSENT_FORM_TYPE_MESSAGE), false);
    }
  },
  // busboy flags a file that reaches the limit exactly, so allow one byte
  // more here; consentFormError() enforces the real maximum
  limits: { fileSize: CONSENT_FORM_MAX_SIZE + 1, files: 1 }
});

// Optional single consent form; JSON (non-multipart) requests pass straight through
const consentFormUpload = (req, res, next) => {
  req.consentFormUpload = true;
  uploadConsentForm.single(CONSENT_FORM_FIELD)(req, res, next);
};

// Handle multer errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const limit = req.consentFormUpload ? CONSENT_FORM_MAX_SIZE : config.maxFileSize;
      return next(new ApiError(400, fileTooLargeMessage(limit)));
    }
    return next(new ApiError(400, err.message));
  }
  next(err);
};

module.exports = {
  upload,
  uploadConsultationFile,
  uploadPhysicalRecordFile,
  consentFormUpload,
  consentFormError,
  sniffConsentFormType,
  CONSENT_FORM_TYPES,
  physicalRecordsUploadDir,
  handleUploadErrors
}; 