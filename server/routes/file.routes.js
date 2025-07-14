const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticateJWT, isProvider, isPatient, isAdmin } = require('../middleware/auth.middleware');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const logger = require('../utils/logger');

// Security: Sanitize query params for logging to avoid exposing tokens
const sanitizeQueryForLogging = (query) => {
  const sanitized = { ...query };
  if (sanitized.token) {
    sanitized.token = '[REDACTED]';
  }
  return sanitized;
};

/**
 * Get file info without downloading
 */
router.get('/:type/:filename/info', authenticateJWT, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', type, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Check permissions based on file type
    const hasPermission = await checkFilePermission(req.user, type, filename);
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({
      filename,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      type: path.extname(filename),
      accessible: true
    });
  } catch (error) {
    logger.error('Error getting file info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Download/view file with authentication
 * 
 * SECURITY NOTE: This route accepts JWT tokens via query parameter as a fallback
 * when Authorization header is not present. This is necessary for file viewing
 * in new browser windows/tabs (via window.open()) which don't send custom headers.
 * 
 * Security measures:
 * - Token in query params is only used if Authorization header is missing
 * - Tokens are sanitized from logs to prevent exposure
 * - All permission checks remain in place
 * - Should only be used over HTTPS in production
 * 
 * Consider implementing temporary signed URLs for better security in the future.
 */
router.get('/:type/:filename', async (req, res, next) => {
  try {
    // Check for token in query parameter if no Authorization header
    if (!req.headers.authorization && req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    
    // Apply authentication middleware
    authenticateJWT(req, res, async (err) => {
      if (err) return next(err);
      
      try {
        const { type, filename } = req.params;
        const filePath = path.join(__dirname, '../uploads', type, filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: 'File not found' });
        }
        
        // Check permissions based on file type
        const hasPermission = await checkFilePermission(req.user, type, filename);
        if (!hasPermission) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        // Determine if this should be viewed inline or downloaded
        const isInline = req.query.inline === 'true';
        const mimeType = getMimeType(filename);
        
        // Set appropriate headers
        res.setHeader('Content-Type', mimeType);
        
        if (isInline && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        } else {
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        // Log access (with sanitized query to avoid exposing tokens)
        logger.info(`File accessed: ${type}/${filename} by user ${req.user.id}`, {
          query: sanitizeQueryForLogging(req.query)
        });
      } catch (error) {
        logger.error('Error serving file:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });
  } catch (error) {
    logger.error('Error in file route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Delete file (admin and owner only)
 */
router.delete('/:type/:filename', authenticateJWT, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', type, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check delete permissions (stricter than view permissions)
    const canDelete = await checkDeletePermission(req.user, type, filename);
    if (!canDelete) {
      return res.status(403).json({ message: 'Delete access denied' });
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    // If it's a consultation attachment, remove from database
    if (type === 'consultations') {
      await Consultation.updateMany(
        { 'attachments.filename': filename },
        { $pull: { attachments: { filename: filename } } }
      );
    }
    
    logger.info(`File deleted: ${type}/${filename} by user ${req.user.id}`);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Error deleting file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get list of files for a specific consultation
 */
router.get('/consultation/:consultationId/attachments', authenticateJWT, async (req, res) => {
  try {
    const { consultationId } = req.params;
    
    // Find consultation and check permissions
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }
    
    // Check if user has access to this consultation
    const hasAccess = req.user.role === 'admin' || 
                     consultation.provider.toString() === req.user.id ||
                     consultation.patient.toString() === req.user.id;
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Return attachment info with secure URLs
    const attachments = consultation.attachments.map(attachment => ({
      id: attachment._id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      size: attachment.size,
      mimetype: attachment.mimetype,
      uploadDate: attachment.uploadDate,
      viewUrl: `/api/files/consultations/${attachment.filename}?inline=true`,
      downloadUrl: `/api/files/consultations/${attachment.filename}`
    }));
    
    res.json({ attachments });
  } catch (error) {
    logger.error('Error getting consultation attachments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Check if user has permission to access a file
 */
async function checkFilePermission(user, fileType, filename) {
  try {
    // Admins can access all files
    if (user.role === 'admin') {
      return true;
    }
    
    switch (fileType) {
      case 'licenses':
        // Providers can access their own license, admins can access all
        if (user.role === 'provider') {
          // Check if this license belongs to the user
          const userData = await User.findById(user.id);
          return userData?.providerProfile?.practiceLicense?.includes(filename);
        }
        return false;
        
      case 'consultations':
        // Check if user is involved in the consultation that has this attachment
        const consultation = await Consultation.findOne({
          'attachments.filename': filename
        });
        
        if (!consultation) return false;
        
        return consultation.provider.toString() === user.id ||
               consultation.patient.toString() === user.id;
        
      case 'profile-images':
        // Users can access their own profile images
        const profileUser = await User.findById(user.id);
        return profileUser?.profileImage?.includes(filename);
        
      default:
        return false;
    }
  } catch (error) {
    logger.error('Error checking file permission:', error);
    return false;
  }
}

/**
 * Check if user has permission to delete a file
 */
async function checkDeletePermission(user, fileType, filename) {
  try {
    // Admins can delete any file
    if (user.role === 'admin') {
      return true;
    }
    
    switch (fileType) {
      case 'licenses':
        // Only the provider who owns the license can delete it
        if (user.role === 'provider') {
          const userData = await User.findById(user.id);
          return userData?.providerProfile?.practiceLicense?.includes(filename);
        }
        return false;
        
      case 'consultations':
        // Only the provider who created the consultation can delete attachments
        const consultation = await Consultation.findOne({
          'attachments.filename': filename
        });
        
        if (!consultation) return false;
        
        return consultation.provider.toString() === user.id;
        
      case 'profile-images':
        // Users can delete their own profile images
        const profileUser = await User.findById(user.id);
        return profileUser?.profileImage?.includes(filename);
        
      default:
        return false;
    }
  } catch (error) {
    logger.error('Error checking delete permission:', error);
    return false;
  }
}

/**
 * Get MIME type for a file
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = router; 