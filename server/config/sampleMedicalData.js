/**
 * Sample medical data for test accounts
 * This data will be used when seeding the database
 */

module.exports = {
  consultations: [
    {
      // First consultation (with all record types)
      general: {
        specialistName: 'Dr. Provider Test',
        specialty: 'General Practice',
        practice: 'Test Medical Center',
        reasonForVisit: 'Annual physical examination',
        notes: 'Patient came in for routine check-up. Overall health is good with controlled hypertension and diabetes.'
      },
      status: 'completed',
      date: new Date('2023-06-15T10:30:00'),
      isSharedWithPatient: true
    },
    {
      // Second consultation (with partial record types)
      general: {
        specialistName: 'Dr. Provider Test',
        specialty: 'General Practice',
        practice: 'Test Medical Center',
        reasonForVisit: 'Follow-up visit for diabetes management',
        notes: 'Patient reports generally good glucose control. Some occasional spikes after meals.'
      },
      status: 'completed',
      date: new Date('2023-09-03T14:15:00'),
      isSharedWithPatient: true
    },
    {
      // Third consultation for second patient
      general: {
        specialistName: 'Dr. Provider Test',
        specialty: 'General Practice',
        practice: 'Test Medical Center',
        reasonForVisit: 'Asthma follow-up',
        notes: 'Patient reports mild wheezing during exercise. Otherwise controlled.'
      },
      status: 'completed',
      date: new Date('2023-08-12T09:00:00'),
      isSharedWithPatient: true
    }
  ],
  vitals: [
    {
      // For first consultation
      heartRate: {
        value: 72,
        unit: 'bpm'
      },
      bloodPressure: {
        systolic: 135,
        diastolic: 85,
        unit: 'mmHg'
      },
      bodyFatPercentage: {
        value: 24.5,
        unit: '%'
      },
      bmi: {
        value: 26.4
      },
      weight: {
        value: 82.3,
        unit: 'kg'
      },
      height: {
        value: 176.5,
        unit: 'cm'
      },
      bodyTemperature: {
        value: 36.7,
        unit: '°C'
      },
      bloodGlucose: {
        value: 132,
        unit: 'mg/dL',
        measurementType: 'random'
      },
      bloodOxygenSaturation: {
        value: 98,
        unit: '%'
      },
      respiratoryRate: {
        value: 14,
        unit: 'breaths/min'
      }
    },
    {
      // For second consultation
      heartRate: {
        value: 76,
        unit: 'bpm'
      },
      bloodPressure: {
        systolic: 132,
        diastolic: 83,
        unit: 'mmHg'
      },
      weight: {
        value: 81.1,
        unit: 'kg'
      },
      bloodGlucose: {
        value: 145,
        unit: 'mg/dL',
        measurementType: 'fasting'
      },
      bloodOxygenSaturation: {
        value: 99,
        unit: '%'
      }
    },
    {
      // For third consultation (second patient)
      heartRate: {
        value: 68,
        unit: 'bpm'
      },
      bloodPressure: {
        systolic: 118,
        diastolic: 75,
        unit: 'mmHg'
      },
      bmi: {
        value: 22.8
      },
      weight: {
        value: 63.5,
        unit: 'kg'
      },
      height: {
        value: 167,
        unit: 'cm'
      },
      bodyTemperature: {
        value: 36.5,
        unit: '°C'
      },
      bloodOxygenSaturation: {
        value: 97,
        unit: '%'
      },
      respiratoryRate: {
        value: 18,
        unit: 'breaths/min'
      }
    }
  ],
  medications: [
    {
      // For first consultation
      name: 'Lisinopril',
      dosage: {
        value: '10',
        unit: 'mg'
      },
      frequency: 'Once daily',
      reasonForPrescription: 'Hypertension management',
      startDate: new Date('2022-01-10'),
      instructions: 'Take in the morning with food',
      sideEffects: 'May cause dizziness',
      isActive: true
    },
    {
      // For first consultation
      name: 'Metformin',
      dosage: {
        value: '500',
        unit: 'mg'
      },
      frequency: 'Twice daily',
      reasonForPrescription: 'Type 2 Diabetes management',
      startDate: new Date('2022-03-15'),
      instructions: 'Take with meals',
      sideEffects: 'May cause gastrointestinal discomfort',
      isActive: true
    },
    {
      // For second consultation
      name: 'Metformin',
      dosage: {
        value: '750',
        unit: 'mg'
      },
      frequency: 'Twice daily',
      reasonForPrescription: 'Type 2 Diabetes management - dosage increase',
      startDate: new Date('2023-09-03'),
      endDate: null,
      instructions: 'Take with meals, replaces previous 500mg prescription',
      isActive: true
    },
    {
      // For third consultation (second patient)
      name: 'Albuterol',
      dosage: {
        value: '90',
        unit: 'mcg'
      },
      frequency: 'As needed',
      reasonForPrescription: 'Asthma management',
      startDate: new Date('2022-05-20'),
      instructions: '1-2 puffs every 4-6 hours as needed for wheezing',
      isActive: true
    },
    {
      // For third consultation (second patient)
      name: 'Sertraline',
      dosage: {
        value: '50',
        unit: 'mg'
      },
      frequency: 'Once daily',
      reasonForPrescription: 'Anxiety management',
      startDate: new Date('2023-02-10'),
      instructions: 'Take in the morning',
      isActive: true
    }
  ],
  immunizations: [
    {
      // For first consultation
      vaccineName: 'Influenza',
      dateAdministered: new Date('2023-06-15'),
      vaccineSerialNumber: 'FLU2023-ABC123',
      nextDueDate: new Date('2024-06-15'),
      administeredBy: 'Dr. Provider Test',
      manufacturer: 'Pfizer',
      lotNumber: 'LOT-12345-FL',
      site: 'left arm',
      route: 'intramuscular',
      doseNumber: 1
    },
    {
      // For third consultation (second patient)
      vaccineName: 'Pneumococcal',
      dateAdministered: new Date('2023-08-12'),
      vaccineSerialNumber: 'PNEU2023-XYZ789',
      administeredBy: 'Dr. Provider Test',
      manufacturer: 'Moderna',
      lotNumber: 'LOT-67890-PN',
      site: 'right arm',
      route: 'intramuscular',
      doseNumber: 1
    }
  ],
  labResults: [
    {
      // For first consultation
      testName: 'Comprehensive Metabolic Panel',
      labName: 'Quest Diagnostics',
      dateOfTest: new Date('2023-06-15'),
      results: 'Glucose: 132 mg/dL (High), Creatinine: 0.9 mg/dL (Normal), BUN: 15 mg/dL (Normal), eGFR: 90 mL/min (Normal)',
      referenceRange: 'Glucose: 70-99 mg/dL, Creatinine: 0.6-1.2 mg/dL, BUN: 7-20 mg/dL, eGFR: >60 mL/min',
      status: 'completed',
      orderedBy: 'Dr. Provider Test',
      comments: 'Elevated glucose levels consistent with diabetes diagnosis'
    },
    {
      // For first consultation
      testName: 'Lipid Panel',
      labName: 'LabCorp',
      dateOfTest: new Date('2023-06-15'),
      results: 'Total Cholesterol: 210 mg/dL (High), HDL: 45 mg/dL (Normal), LDL: 140 mg/dL (High), Triglycerides: 180 mg/dL (High)',
      referenceRange: 'Total Cholesterol: <200 mg/dL, HDL: >40 mg/dL, LDL: <100 mg/dL, Triglycerides: <150 mg/dL',
      status: 'completed',
      orderedBy: 'Dr. Provider Test',
      comments: 'Elevated lipid levels. Consider lifestyle modifications and possible statin therapy.'
    },
    {
      // For second consultation
      testName: 'Hemoglobin A1C',
      labName: 'Quest Diagnostics',
      dateOfTest: new Date('2023-09-03'),
      results: 'HbA1c: 7.2% (High)',
      referenceRange: 'HbA1c: <5.7% (Normal), 5.7-6.4% (Prediabetes), >6.5% (Diabetes)',
      status: 'completed',
      orderedBy: 'Dr. Provider Test',
      comments: 'Slightly elevated A1C levels. Adjust medication dosage.'
    },
    {
      // For third consultation (second patient)
      testName: 'Respiratory Function Test',
      labName: 'PulmoLab',
      dateOfTest: new Date('2023-08-12'),
      results: 'FEV1: 80% of predicted, FVC: 85% of predicted, FEV1/FVC: 0.75',
      referenceRange: 'FEV1: >80% of predicted, FVC: >80% of predicted, FEV1/FVC: >0.7',
      status: 'completed',
      orderedBy: 'Dr. Provider Test',
      comments: 'Mild obstructive pattern consistent with controlled asthma.'
    }
  ],
  radiologyReports: [
    {
      // For first consultation
      typeOfScan: 'X-Ray',
      date: new Date('2023-06-15'),
      bodyPartExamined: 'Chest',
      findings: 'Clear lung fields. No evidence of pneumonia, edema, or pleural effusion. Heart size within normal limits.',
      radiologist: 'Dr. Imaging Specialist',
      contrastUsed: false,
      facilityName: 'City Radiology Center',
      impression: 'Normal chest X-ray.'
    },
    {
      // For third consultation (second patient)
      typeOfScan: 'CT Scan',
      date: new Date('2023-08-12'),
      bodyPartExamined: 'Chest',
      findings: 'No evidence of bronchiectasis. Mild bronchial wall thickening consistent with asthma. No masses or nodules identified.',
      recommendations: 'Follow-up as clinically indicated.',
      radiologist: 'Dr. CT Reader',
      contrastUsed: true,
      contrastDetails: 'IV contrast 75ml Omnipaque 350',
      facilityName: 'Advanced Imaging Center',
      technique: 'Non-gated, helical acquisition with 1.25mm slice thickness',
      impression: 'Findings consistent with mild asthma. No acute abnormalities.'
    }
  ],
  hospitalRecords: [
    {
      // For patient 1 history
      admissionDate: new Date('2019-03-10'),
      dischargeDate: new Date('2019-03-15'),
      hospitalName: 'General Hospital',
      reasonForHospitalization: 'Community-acquired pneumonia',
      treatmentsReceived: ['IV antibiotics', 'Supplemental oxygen', 'Chest physiotherapy'],
      attendingDoctors: [
        { name: 'Dr. Pulmonary Specialist', specialty: 'Pulmonology' },
        { name: 'Dr. Internal Medicine', specialty: 'Internal Medicine' }
      ],
      dischargeSummary: 'Patient responded well to antibiotic therapy. Symptoms resolved. Discharged in stable condition.',
      investigationsDone: ['Chest X-ray', 'Blood cultures', 'Sputum analysis'],
      diagnosis: 'Community-acquired pneumonia, right lower lobe',
      roomNumber: '412',
      ward: 'Internal Medicine',
      admissionType: 'Emergency',
      followUpInstructions: 'Follow up with PCP in 1 week. Complete oral antibiotics for 7 more days.',
      isReadmission: false
    }
  ],
  surgeryRecords: [
    {
      // For second patient history
      typeOfSurgery: 'Laparoscopic Appendectomy',
      date: new Date('2018-07-22'),
      reason: 'Acute appendicitis',
      surgeon: {
        name: 'Dr. Surgical Expert',
        specialty: 'General Surgery'
      },
      assistingSurgeons: [
        { name: 'Dr. Surgical Resident', specialty: 'General Surgery' }
      ],
      anesthesiaType: 'General',
      anesthesiologist: {
        name: 'Dr. Anesthesia Provider'
      },
      duration: {
        hours: 1,
        minutes: 15
      },
      complications: 'None',
      recoveryNotes: 'Uneventful recovery. Patient discharged on postoperative day 1.',
      hospitalName: 'Surgical Center',
      preOpDiagnosis: 'Acute appendicitis',
      postOpDiagnosis: 'Acute appendicitis, confirmed',
      procedureDetails: 'Standard 3-port laparoscopic appendectomy with stapled appendiceal base.',
      followUpInstructions: 'Follow up in clinic in 2 weeks. No heavy lifting for 4 weeks.'
    }
  ],
  connections: [
    {
      // Connection between provider and patient
      status: 'approved',
      initiatedAt: new Date('2023-01-05'),
      statusUpdatedAt: new Date('2023-01-06'),
      notes: 'Primary care physician for patient',
      permissions: {
        viewConsultations: true,
        viewVitals: true,
        viewMedications: true,
        viewImmunizations: true,
        viewLabResults: true,
        viewRadiologyReports: true,
        viewHospitalRecords: true,
        viewSurgeryRecords: true
      }
    },
    {
      // Connection between provider and second patient
      status: 'approved',
      initiatedAt: new Date('2023-02-10'),
      statusUpdatedAt: new Date('2023-02-11'),
      notes: 'Primary care physician for second patient',
      permissions: {
        viewConsultations: true,
        viewVitals: true,
        viewMedications: true,
        viewImmunizations: true,
        viewLabResults: true,
        viewRadiologyReports: true,
        viewHospitalRecords: true,
        viewSurgeryRecords: true
      }
    }
  ]
}; 