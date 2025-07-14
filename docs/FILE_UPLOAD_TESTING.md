# File Upload Testing Guide for Consultation Creation

## Issue Fixed

The file upload functionality during consultation creation was not working because:
1. Files were being sent as JSON objects instead of being uploaded
2. The consultation creation endpoint doesn't handle file uploads directly
3. Files need to be uploaded separately using the attachment endpoint

## Solution Implemented

Modified the consultation creation workflow to:
1. Create the consultation first (without attachments)
2. Upload each file separately using the `/api/consultations/:id/attachments` endpoint
3. Show appropriate success/warning messages based on upload results

## Testing Steps

### As a Provider:

1. **Create a New Consultation with Attachments**
   - Login as a provider
   - Go to "Add New Consultation"
   - Fill in consultation details
   - In the Attachments section, upload one or more files
   - Save the consultation (either as draft or completed)
   - Verify you see "Consultation saved successfully with attachments"
   - Navigate to the consultation view
   - Verify all uploaded files appear in the attachments section

2. **Edit a Consultation with New Attachments**
   - Edit an existing consultation
   - Add new files in the Attachments section
   - Save the consultation
   - Verify new files are uploaded and appear in the consultation view

3. **View and Download Attachments**
   - View a consultation with attachments
   - Click "View" for images/PDFs to preview
   - Click "Download" to download any file
   - Verify files open/download correctly

### Testing File Types

Test with various file types:
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`
- Documents: `.pdf`, `.doc`, `.docx`
- Maximum file size: 5MB

### Expected Console Output

When uploading files during consultation creation, you should see:
```
Uploading 2 files for consultation 6874e0fb7176d7024c34b713
Uploading file: test-document.pdf
Uploading file: test-image.jpg
```

### Troubleshooting

1. **"Failed to upload files" error**
   - Check if the file size is under 5MB
   - Verify the file type is supported
   - Check browser console for detailed errors

2. **Files not appearing after upload**
   - Refresh the consultation view page
   - Check if the consultation was saved successfully first
   - Verify the server uploads/consultations directory has write permissions

3. **Network errors**
   - Ensure the server is running
   - Check if authentication token is valid
   - Monitor network tab for failed requests

## Technical Details

- Files are uploaded using `multipart/form-data` via the FileService
- Each file is uploaded individually after consultation creation
- The server stores files in `server/uploads/consultations/`
- File metadata is stored in the consultation's attachments array
- Authentication is required for all file operations 