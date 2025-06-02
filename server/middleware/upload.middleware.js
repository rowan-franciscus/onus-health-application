/**
 * File Upload Middleware
 * Configures multer for handling file uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('./error.middleware');
const config = require('../config/environment');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure consultation uploads directory
const consultationUploadDir = path.join(uploadDir, 'consultations');
if (!fs.existsSync(consultationUploadDir)) {
  fs.mkdirSync(consultationUploadDir, { recursive: true });
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

// Handle multer errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, `File too large. Maximum size is ${config.maxFileSize / (1024 * 1024)}MB.`));
    }
    return next(new ApiError(400, err.message));
  }
  next(err);
};

module.exports = {
  upload,
  uploadConsultationFile,
  handleUploadErrors
}; 