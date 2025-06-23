# File Upload & Management System Implementation

## Overview

This document outlines the comprehensive file upload and management system implemented for the Onus Health application. The system provides secure, role-based file handling for provider licenses, consultation attachments, and other document types.

## 🏗️ Architecture

### Backend Components

#### 1. **Upload Middleware** (`server/middleware/upload.middleware.js`)
- **Multer Configuration**: Handles multipart/form-data uploads
- **Storage Strategy**: Disk storage with organized directory structure
- **File Filtering**: Validates file types (images, PDFs, documents)
- **Size Limits**: Configurable file size restrictions (default: 5MB)
- **Error Handling**: Comprehensive error responses for upload failures

#### 2. **File Routes** (`server/routes/file.routes.js`)
- **Secure Access**: All endpoints require authentication
- **Permission-Based**: Role-based access control for different file types
- **CRUD Operations**: Create, read, and delete file operations
- **Metadata API**: File information without downloading

#### 3. **File Storage Structure**
```
server/uploads/
├── licenses/          # Provider license documents
├── consultations/     # Consultation attachments
├── profile-images/    # User profile pictures
└── medical-records/   # Medical record attachments
    ├── vitals/
    ├── medications/
    ├── lab-results/
    └── ...
```

### Frontend Components

#### 1. **FileUpload Component** (`client/src/components/forms/FileUpload/`)
- **Drag & Drop**: Modern file upload interface
- **Validation**: Client-side file type and size validation
- **Progress**: Upload progress indication
- **Multiple Files**: Support for single or multiple file uploads
- **Error Handling**: User-friendly error messages

#### 2. **FileViewer Component** (`client/src/components/common/FileViewer/`)
- **File Listing**: Display uploaded files with metadata
- **Actions**: View, download, and delete capabilities
- **Icons**: File type-specific icons
- **Responsive**: Mobile-friendly design

#### 3. **File Service** (`client/src/services/file.service.js`)
- **API Integration**: Handles all file-related API calls
- **Utility Functions**: File validation, formatting, and URL generation
- **Progress Callbacks**: Upload/download progress tracking

## 🔒 Security Features

### Authentication & Authorization
- **JWT Protection**: All file access requires valid authentication
- **Role-Based Access**: Users can only access files they own or are authorized to view
- **Permission Checks**: Granular permissions for different file types

### File Validation
- **Type Restrictions**: Only allowed file types are accepted
- **Size Limits**: Configurable maximum file sizes
- **Sanitization**: Filename sanitization to prevent path traversal

### Secure URLs
- **Temporary Access**: Files served through authenticated endpoints
- **No Direct Access**: Direct file system access is blocked
- **Audit Logging**: All file access is logged for security auditing

## 📁 File Types & Use Cases

### 1. **Provider Licenses** (`/licenses/`)
- **Purpose**: Medical practice license verification
- **Access**: Provider owners and admins only
- **Integration**: Provider onboarding process
- **Formats**: PDF, JPG, PNG

### 2. **Consultation Attachments** (`/consultations/`)
- **Purpose**: Medical documents, test results, images
- **Access**: Consultation participants (provider, patient) and admins
- **Integration**: Consultation creation and viewing
- **Formats**: PDF, DOC, DOCX, images

### 3. **Profile Images** (`/profile-images/`)
- **Purpose**: User profile pictures
- **Access**: User owners and admins
- **Integration**: User profile management
- **Formats**: JPG, PNG, GIF

## 🔌 API Endpoints

### File Management Endpoints

#### Get File Info
```http
GET /api/files/{type}/{filename}/info
Authorization: Bearer {jwt_token}
```

#### View/Download File
```http
GET /api/files/{type}/{filename}?inline=true
Authorization: Bearer {jwt_token}
```

#### Delete File
```http
DELETE /api/files/{type}/{filename}
Authorization: Bearer {jwt_token}
```

#### Get Consultation Attachments
```http
GET /api/files/consultation/{consultationId}/attachments
Authorization: Bearer {jwt_token}
```

### Upload Endpoints

#### Upload Consultation Attachment
```http
POST /api/consultations/{id}/attachments
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

file: [binary data]
```

#### Upload Provider License
```http
POST /api/users/provider-onboarding
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

licenseFile: [binary data]
professionalInfo: {...}
practiceInfo: {...}
...
```

## 🎨 Frontend Integration

### Provider Onboarding
```jsx
import FileUpload from '../../../components/forms/FileUpload';

<FileUpload
  name="practiceLicense"
  accept=".pdf,.jpg,.jpeg,.png"
  multiple={false}
  label="Upload Practice License"
  helpText="Upload a copy of your medical practice license"
  maxSize={5 * 1024 * 1024}
  onChange={(file) => setFieldValue('professionalInfo.practiceLicense', file)}
  error={errors.professionalInfo?.practiceLicense}
/>
```

### Consultation Attachments
```jsx
import FileViewer from '../../common/FileViewer';

<FileViewer
  files={consultation.attachments}
  onView={(file) => window.open(file.viewUrl, '_blank')}
  onDownload={(file) => FileService.downloadFile('consultations', file.filename, file.originalName)}
  onDelete={(file) => deleteAttachment(file.id)}
  canDelete={isProvider}
  showActions={true}
/>
```

### File Service Usage
```javascript
import FileService from '../services/file.service';

// Upload consultation file
const result = await FileService.uploadConsultationFile(
  consultationId, 
  file, 
  (progress) => setUploadProgress(progress)
);

// Download file
await FileService.downloadFile('consultations', filename, originalName);

// Get secure URLs
const { viewUrl, downloadUrl } = FileService.getFileUrls('licenses', filename);
```

## ⚙️ Configuration

### Environment Variables
```env
# File upload settings
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_PATH=./uploads

# Storage settings (for cloud storage integration)
STORAGE_TYPE=local  # local | aws-s3 | gcp
AWS_S3_BUCKET=your-bucket-name
```

### Server Configuration
```javascript
// server/config/environment.js
maxFileSize: parseInt(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024)
```

## 🚀 Usage Examples

### Complete File Upload Flow

1. **Frontend File Selection**
   ```jsx
   const handleFileUpload = (file) => {
     // Validate file
     const validation = FileService.validateFile(file);
     if (!validation.isValid) {
       setError(validation.errors.join(', '));
       return;
     }
     
     // Upload file
     uploadFile(file);
   };
   ```

2. **Server Processing**
   ```javascript
   // File is automatically processed by Multer middleware
   // Available in req.file with metadata
   ```

3. **Database Storage**
   ```javascript
   // File metadata stored in consultation/user documents
   consultation.attachments.push({
     filename: req.file.filename,
     originalName: req.file.originalname,
     mimetype: req.file.mimetype,
     size: req.file.size,
     path: req.file.path
   });
   ```

4. **Secure Access**
   ```javascript
   // Files served through authenticated endpoints
   // with permission validation
   ```

## 🧪 Testing

### Demo Page
A comprehensive demo page (`client/src/pages/test/FileUploadDemo.jsx`) showcases:
- File upload with validation
- Progress indication
- File listing and management
- Error handling
- All supported file types

### Access Demo
Navigate to `/file-upload-demo` in the application to test the functionality.

## 🔧 Troubleshooting

### Common Issues

1. **File Too Large**
   - Check `MAX_FILE_SIZE` environment variable
   - Verify client-side validation

2. **Unsupported File Type**
   - Review accepted MIME types in middleware
   - Update FileUpload component props

3. **Permission Denied**
   - Verify user authentication
   - Check role-based permissions in file routes

4. **Upload Directory Issues**
   - Ensure upload directories exist and are writable
   - Check file system permissions

## 🚗 Future Enhancements

### Planned Features
- **Cloud Storage Integration**: AWS S3, Google Cloud Storage
- **Image Processing**: Automatic resizing and optimization
- **Virus Scanning**: Malware detection for uploaded files
- **File Versioning**: Track file history and changes
- **Bulk Operations**: Multiple file uploads and management
- **File Sharing**: Share files with external users securely

### Performance Optimizations
- **Chunked Uploads**: For large file support
- **CDN Integration**: Faster file delivery
- **Caching**: File metadata and access patterns
- **Compression**: Automatic file compression

## 📚 Related Documentation

- [API Documentation](./API.md)
- [Security Guide](./SECURITY.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Database Schema](./DATABASE.md)

---

**Last Updated**: December 2024  
**Version**: 1.0.0 