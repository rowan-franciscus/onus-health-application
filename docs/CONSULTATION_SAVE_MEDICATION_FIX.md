# Consultation Save Medication Dosage Fix

## Issue
When trying to save a draft consultation as completed, the "Save Consultation" button would not work due to a validation error:
```
medication[0].dosage must be a object type, but the final value was: "Test 10"
```

## Root Cause
There was a data structure mismatch in the medication dosage field:

1. **MedicationTab component** expects dosage as an object:
   ```javascript
   dosage: {
     value: '500',
     unit: 'mg'
   }
   ```

2. **getInitialFormValues** was incorrectly structuring it as separate fields when loading existing data:
   ```javascript
   dosage: med.dosage?.value || '',
   dosageUnit: med.dosage?.unit || '',
   ```

3. **Validation schema** expects dosage as an object with nested value and unit properties

## Solution

### 1. Fixed getInitialFormValues in AddConsultation.jsx
Changed the medication mapping to maintain the correct object structure:
```javascript
medication: consultationData.medications?.map(med => ({
  name: med.name || '',
  dosage: {
    value: med.dosage?.value || '',
    unit: med.dosage?.unit || ''
  },
  frequency: med.frequency || '',
  reason: med.reasonForPrescription || '',
  startDate: med.startDate ? new Date(med.startDate).toISOString().substr(0, 10) : '',
  endDate: med.endDate ? new Date(med.endDate).toISOString().substr(0, 10) : ''
})) || [],
```

### 2. Fixed transformedMedication in handleSubmit and handleSaveDraft
Updated to maintain the dosage object structure when sending to backend:
```javascript
const transformedMedication = formData.medication.map(med => ({
  name: med.name,
  dosage: med.dosage, // Keep dosage as object with value and unit
  frequency: med.frequency,
  reasonForPrescription: med.reason,
  startDate: med.startDate,
  endDate: med.endDate
}));
```

### 3. Cleaned up debug logging
Removed the temporary debug console logs from ConsultationForm.jsx that were added to identify the issue.

## Result
The medication dosage field now maintains consistent object structure throughout:
- Form component expects object
- Validation schema validates object
- Data loading creates object
- Data submission sends object

This ensures the form validation passes and consultations can be saved successfully.
