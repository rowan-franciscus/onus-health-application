# Consultation Draft Fix Documentation - Version 2

## Fix Date: January 2025

## Issues Fixed

This document outlines the second round of fixes implemented to resolve remaining issues with consultation draft functionality.

### 1. Field Name Mapping Issues

**Problem:** Several fields were not displaying correctly when editing draft consultations:
- Immunization: Vaccine Name not displaying, Date Administered showed "Invalid Date"
- Lab Results: Test Date showed "Invalid Date"
- Radiology: Body Part Examined not displaying
- Surgery: Surgery Type not displaying

**Root Cause:** Mismatch between backend model field names and frontend form field names when loading data for editing.

**Fix:** Updated field mappings in `client/src/pages/provider/AddConsultation.jsx`:
```javascript
// Immunization mapping
immunization: consultationData.immunizations?.map(imm => ({
  name: imm.vaccineName || '',  // Changed from vaccineName to name
  date: imm.dateAdministered ? new Date(imm.dateAdministered).toISOString().substr(0, 10) : '',  // Changed from dateAdministered to date
  serialNumber: imm.vaccineSerialNumber || '',
  nextDueDate: imm.nextDueDate ? new Date(imm.nextDueDate).toISOString().substr(0, 10) : ''
})) || [],

// Lab Results mapping
labResults: consultationData.labResults?.map(lab => ({
  testName: lab.testName || '',
  labName: lab.labName || '',
  date: lab.dateOfTest ? new Date(lab.dateOfTest).toISOString().substr(0, 10) : '',  // Changed from dateOfTest to date
  results: lab.results || '',
  comments: lab.comments || ''
})) || [],

// Radiology mapping
radiology: consultationData.radiologyReports?.map(rad => ({
  scanType: rad.typeOfScan || '',
  date: rad.date ? new Date(rad.date).toISOString().substr(0, 10) : '',
  bodyPart: rad.bodyPartExamined || '',  // Changed from bodyPartExamined to bodyPart
  findings: rad.findings || '',
  recommendations: rad.recommendations || ''
})) || [],

// Surgery mapping
surgery: consultationData.surgeryRecords?.map(surg => ({
  type: surg.typeOfSurgery || '',  // Changed from surgeryType to type
  date: surg.date ? new Date(surg.date).toISOString().substr(0, 10) : '',
  reason: surg.reason || '',
  complications: surg.complications || '',
  recoveryNotes: surg.recoveryNotes || ''
})) || [],
```

### 2. File Attachments Not Persisting

**Problem:** Uploaded files didn't persist when editing draft consultations.

**Root Cause:** When updating consultations, the client was sending `attachments: []` which overwrote existing attachments on the server.

**Fix:** 
1. Updated `handleSaveDraft` and `handleSubmit` in `client/src/pages/provider/AddConsultation.jsx` to not send attachments field when updating:
```javascript
// Don't send attachments field when updating to avoid overwriting existing attachments
if (!isEditing) {
  consultationData.attachments = [];
}
```

2. Added protection in `server/controllers/consultation.controller.js` to prevent overwriting existing attachments:
```javascript
Object.keys(consultationData).forEach(key => {
  // Don't overwrite attachments with an empty array
  if (key === 'attachments' && Array.isArray(consultationData[key]) && 
      consultationData[key].length === 0 && consultation.attachments && 
      consultation.attachments.length > 0) {
    console.log('Skipping attachments update to preserve existing attachments');
    return;
  }
  consultation[key] = consultationData[key];
});
```

3. Ensured attachments array is properly initialized when creating new consultations:
```javascript
const consultation = new Consultation({
  patient: patientId,
  provider: providerId,
  ...consultationData,
  status: consultationData.status || 'draft',
  attachments: [] // Explicitly initialize attachments array
});
```

## Field Mapping Reference

### Form Field Names → Backend Model Field Names

**Immunization:**
- `name` → `vaccineName`
- `date` → `dateAdministered`
- `serialNumber` → `vaccineSerialNumber`

**Lab Results:**
- `date` → `dateOfTest`

**Radiology:**
- `bodyPart` → `bodyPartExamined`
- `scanType` → `typeOfScan`

**Surgery:**
- `type` → `typeOfSurgery`

## Testing Instructions

1. **Create a New Draft:**
   - Sign in as a provider
   - Create a new consultation
   - Fill in all fields, especially:
     - Immunization: Vaccine Name and Date Administered
     - Lab Results: Test Date
     - Radiology: Body Part Examined
     - Surgery: Surgery Type
   - Upload a file attachment
   - Save as draft

2. **Edit the Draft:**
   - Navigate back to consultations
   - Edit the draft consultation
   - Verify:
     - ✓ All immunization fields display correctly
     - ✓ Lab Results dates show properly (not "Invalid Date")
     - ✓ Radiology Body Part Examined displays
     - ✓ Surgery Type displays
     - ✓ File attachments are visible

3. **Update and Re-edit:**
   - Make changes to some fields
   - Upload another file
   - Save as draft again
   - Re-open to verify all data persists correctly

## Files Modified

- `client/src/pages/provider/AddConsultation.jsx` - Fixed field mappings and attachment handling
- `server/controllers/consultation.controller.js` - Added attachment protection and initialization

## Summary

All consultation draft functionality issues have been resolved. The system now correctly:
- Maps form field names to backend model field names when loading data
- Preserves file attachments when updating drafts
- Displays all medical record fields correctly
- Maintains data integrity across save/edit cycles
