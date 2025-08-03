# Profile Picture Implementation

## Overview

This document outlines the implementation of profile picture functionality for the Onus Health application. The feature allows all user types (patients, providers, and admins) to upload, view, and manage their profile pictures.

## 🏗️ Architecture

### Backend Components

#### 1. **Database Schema Update**
- Added `profileImage` field to the User model (`server/models/User.js`)
- Field type: String (stores the path to the profile image)
- Default value: null

#### 2. **File Storage Configuration**
- Updated all file handling modules to support Render's persistent storage at `/mnt/data`
- Files are stored at:
  - Production (Render): `/mnt/data/uploads/profile-images/`
  - Development: `server/uploads/profile-images/`

#### 3. **API Endpoints**
- **Upload Profile Picture**: `POST /api/users/profile-picture`
  - Accepts multipart/form-data with single image file
  - Supported formats: PNG, JPG, JPEG, GIF
  - Max file size: 2MB
  - Returns: Profile image URL

- **Delete Profile Picture**: `DELETE /api/users/profile-picture`
  - Removes profile picture from storage and database
  - Returns: Success message

#### 4. **File Access**
- Profile pictures are served through authenticated file routes
- URL format: `/api/files/profile-images/{filename}?inline=true&token={jwt}`
- Permission checks ensure users can only access their own profile pictures

### Frontend Components

#### 1. **ProfilePictureUpload Component**
Location: `client/src/components/common/ProfilePictureUpload/`

Features:
- Drag-and-drop or click to upload
- Real-time preview before upload
- Loading states during upload/delete
- Customizable sizes (small, medium, large)
- Shape options (round, square)
- Integrated error handling with toast notifications

Props:
```javascript
{
  currentImage: string,    // Current profile image URL
  onUpload: function,      // Handler for file upload
  onDelete: function,      // Handler for image deletion
  disabled: boolean,       // Disable interactions
  size: string,           // 'small' | 'medium' | 'large'
  shape: string,          // 'round' | 'square'
  placeholder: string     // Default placeholder image URL
}
```

#### 2. **File Service Updates**
Added methods to `client/src/services/file.service.js`:
- `uploadProfilePicture(file)`: Handles profile picture upload
- `deleteProfilePicture()`: Handles profile picture deletion
- `getProfilePictureUrl(profileImagePath)`: Generates authenticated URLs

#### 3. **Settings Pages Integration**
Profile picture upload has been added to all user settings pages:
- Patient Settings: `/patient/settings`
- Provider Settings: `/provider/settings`
- Admin Settings: `/admin/settings`

Each settings page includes:
- Profile picture upload section
- Real-time updates to Redux store
- Synchronized state management

#### 4. **Header Display**
- Updated `DashboardLayout` component to pass profile image URLs
- Header component displays profile pictures in the user menu
- Falls back to initials if no profile picture is set

## 🔒 Security Considerations

1. **File Type Validation**
   - Server-side MIME type validation
   - Client-side file extension checks
   - Prevents upload of non-image files

2. **File Size Limits**
   - 2MB maximum file size for profile pictures
   - Prevents storage abuse

3. **Access Control**
   - JWT authentication required for all endpoints
   - Users can only access/modify their own profile pictures
   - File permissions checked on every access

4. **Storage Security**
   - Files stored outside web root
   - Served through authenticated API endpoints
   - No direct file access

## 🚀 Deployment Considerations

### Render Configuration
1. Ensure persistent storage is mounted at `/mnt/data`
2. Set environment variable: `RENDER=true`
3. Files persist across deployments
4. Regular backups recommended

### Local Development
- Files stored in `server/uploads/profile-images/`
- Directory created automatically if missing
- Git ignores upload directories

## 🧪 Testing

### Manual Testing Steps
1. **Upload Profile Picture**
   - Navigate to Settings page
   - Click on profile picture area
   - Select an image file (< 2MB)
   - Verify upload success and display

2. **Change Profile Picture**
   - Click on existing profile picture
   - Select new image
   - Verify old image is replaced

3. **Delete Profile Picture**
   - Click delete button on profile picture
   - Confirm deletion
   - Verify picture is removed

4. **Cross-Page Verification**
   - Upload picture in settings
   - Navigate to dashboard
   - Verify picture appears in header

### Error Scenarios
- Upload file > 2MB: Should show size error
- Upload non-image file: Should show type error
- Network failure: Should show appropriate error message

## 📝 Future Enhancements

1. **Image Processing**
   - Automatic resizing for optimal performance
   - Thumbnail generation
   - Image compression

2. **Additional Features**
   - Image cropping before upload
   - Multiple preset avatars
   - Gravatar integration

3. **Performance**
   - CDN integration for faster delivery
   - Lazy loading for profile pictures
   - Browser caching optimization

## 🛠️ Maintenance

### Cleanup Tasks
- Periodically remove orphaned profile images
- Monitor storage usage
- Update file size limits as needed

### Monitoring
- Track upload success/failure rates
- Monitor storage capacity
- Log access patterns for security

## 📚 Related Documentation
- [File Upload Implementation](./FILE_UPLOAD_IMPLEMENTATION.md)
- [Render Deployment Guide](./RENDER_DEPLOYMENT.md)
- [API Documentation](../server/routes/api.md) 