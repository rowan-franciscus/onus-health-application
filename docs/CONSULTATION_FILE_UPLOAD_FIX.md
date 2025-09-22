# Consultation File Upload Fix Documentation

## Issue Description
When updating a draft consultation with file attachments, the files were not being uploaded properly. The consultation would save, but the attached files would fail to upload. This issue only occurred when:
- Editing an existing draft consultation
- Adding new file attachments
- Clicking either "Save Draft" or "Save Consultation"

Creating new consultations with files worked correctly.

## Root Cause
The bug was in the file upload logic in `AddConsultation.jsx`. When uploading files after updating a consultation, the code was using the wrong consultation ID:

```javascript
// Bug: Using consultationId from URL params instead of response
await FileService.uploadConsultationFile(consultationId, file);
```

The `consultationId` variable refers to the URL parameter, but after updating a consultation, we need to use the ID from the API response to ensure we're uploading to the correct consultation.

## Solution Implemented

### 1. Fixed Consultation ID Usage
Updated both `handleSaveDraft` and `handleSubmit` functions to use the consultation ID from the response:

```javascript
// Fixed: Using responseConsultationId from the API response
const responseConsultationId = response._id || response.id;
await FileService.uploadConsultationFile(responseConsultationId, file);
```

### 2. Enhanced Logging
Added detailed logging to help debug file upload issues:
- Log number and names of files to upload
- Log consultation ID being used
- Log successful uploads
- Log when skipping non-File objects

### 3. Error Handling
Added fallback handling for cases where the response might not contain an ID:
- Display appropriate error message
- Still navigate to consultations page
- Prevent application crash

## Code Changes

### `client/src/pages/provider/AddConsultation.jsx`

1. **Variable Naming**: Changed from reusing `consultationId` to `responseConsultationId`
2. **Logging**: Added console logs for debugging
3. **Error Handling**: Added fallback for missing response ID

## Testing Recommendations

1. **Update Draft with Files**:
   - Open an existing draft consultation
   - Add one or more file attachments
   - Click "Save Draft" or "Save Consultation"
   - Verify files upload successfully

2. **Multiple Files**:
   - Test with multiple files at once
   - Test with different file types (PDF, images, documents)

3. **Edge Cases**:
   - Test with maximum file size (5MB)
   - Test with existing attachments already present

## Prevention Measures

1. Use distinct variable names to avoid confusion between URL params and API responses
2. Always validate API response structure before using data
3. Add comprehensive logging for file operations
4. Test file uploads in both create and update scenarios

## Deployment Notes

This is a frontend-only fix that:
- Requires no backend changes
- Is backward compatible
- Should work immediately upon deployment

Monitor browser console logs after deployment to verify file uploads are working correctly.
