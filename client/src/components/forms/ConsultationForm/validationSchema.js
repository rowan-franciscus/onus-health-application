import * as Yup from 'yup';

export const validationSchema = Yup.object().shape({
  general: Yup.object().shape({
    date: Yup.date().nullable(),
    specialistName: Yup.string().nullable(),
    specialty: Yup.string().nullable(),
    practiceName: Yup.string().nullable(),
    reasonForVisit: Yup.string().nullable(),
    notes: Yup.string().nullable()
  }),
  
  vitals: Yup.object().shape({
    heartRate: Yup.number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'Heart rate must be a positive number')
      .nullable(),
    bloodPressure: Yup.object().shape({
      systolic: Yup.number()
        .transform((value) => (isNaN(value) ? undefined : value))
        .min(0, 'Systolic pressure must be a positive number')
        .nullable(),
      diastolic: Yup.number()
        .transform((value) => (isNaN(value) ? undefined : value))
        .min(0, 'Diastolic pressure must be a positive number')
        .nullable()
    }),
    bodyTemperature: Yup.number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'Body temperature must be a positive number')
      .nullable(),
    respiratoryRate: Yup.number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'Respiratory rate must be a positive number')
      .nullable(),
    bloodGlucose: Yup.number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'Blood glucose must be a positive number')
      .nullable(),
    bloodOxygenSaturation: Yup.number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'Blood oxygen saturation must be a positive number')
      .max(100, 'Blood oxygen saturation must be less than or equal to 100')
      .nullable(),
    bmi: Yup.number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'BMI must be a positive number')
      .nullable(),
    bodyFatPercentage: Yup.number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'Body fat percentage must be a positive number')
      .max(100, 'Body fat percentage must be less than or equal to 100')
      .nullable(),
    weight: Yup.number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'Weight must be a positive number')
      .nullable(),
    height: Yup.number()
      .transform((value) => (isNaN(value) ? undefined : value))
      .min(0, 'Height must be a positive number')
      .nullable()
  }),
  
  medication: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().nullable(),
      dosage: Yup.object().shape({
        value: Yup.string().nullable(),
        unit: Yup.string().nullable()
      }),
      frequency: Yup.string().nullable(),
      reason: Yup.string().nullable(),
      startDate: Yup.date().nullable(),
      endDate: Yup.date().min(
        Yup.ref('startDate'),
        'End date cannot be before start date'
      ).nullable()
    })
  ),
  
  immunization: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().nullable(),
      date: Yup.date().nullable(),
      serialNumber: Yup.string().nullable(),
      nextDueDate: Yup.date().min(
        Yup.ref('date'),
        'Next due date cannot be before administered date'
      ).nullable()
    })
  ),
  
  labResults: Yup.array().of(
    Yup.object().shape({
      testName: Yup.string().nullable(),
      labName: Yup.string().nullable(),
      date: Yup.date().nullable(),
      results: Yup.string().nullable(),
      comments: Yup.string().nullable()
    })
  ),
  
  radiology: Yup.array().of(
    Yup.object().shape({
      scanType: Yup.string().nullable(),
      date: Yup.date().nullable(),
      bodyPart: Yup.string().nullable(),
      findings: Yup.string().nullable(),
      recommendations: Yup.string().nullable()
    })
  ),
  
  hospital: Yup.array().of(
    Yup.object().shape({
      admissionDate: Yup.date().nullable(),
      dischargeDate: Yup.date()
        .min(Yup.ref('admissionDate'), 'Discharge date cannot be before admission date')
        .nullable(),
      reason: Yup.string().nullable(),
      treatments: Yup.string().nullable(),
      attendingDoctors: Yup.string().nullable(),
      dischargeSummary: Yup.string().nullable(),
      investigations: Yup.string().nullable()
    })
  ),
  
  surgery: Yup.array().of(
    Yup.object().shape({
      type: Yup.string().nullable(),
      date: Yup.date().nullable(),
      reason: Yup.string().nullable(),
      complications: Yup.string().nullable(),
      recoveryNotes: Yup.string().nullable()
    })
  )
}); 