import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { Formik, Form } from 'formik';
import styles from './AddVitals.module.css';
import { formatDate } from '../../utils/dateUtils';

// Components
import PageContainer from '../../components/layouts/PageContainer';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import PatientVitalsForm from '../../components/forms/PatientVitalsForm';

// Services
import medicalRecordsService from '../../services/medicalRecords.service';

// Validation schema for vitals
const validationSchema = Yup.object().shape({
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
    .nullable(),
  notes: Yup.string().nullable()
});

const AddVitals = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues = {
    heartRate: '',
    bloodPressure: {
      systolic: '',
      diastolic: ''
    },
    bodyTemperature: '',
    respiratoryRate: '',
    bloodGlucose: '',
    bloodOxygenSaturation: '',
    bmi: '',
    bodyFatPercentage: '',
    weight: '',
    height: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    
    try {
      // Transform the values to match the API format
      const vitalsData = {
        date: values.date || new Date(),
        notes: values.notes || ''
      };

      // Add vitals fields with proper structure
      if (values.heartRate) {
        vitalsData.heartRate = {
          value: Number(values.heartRate),
          unit: 'bpm'
        };
      }

      if (values.bloodPressure?.systolic || values.bloodPressure?.diastolic) {
        vitalsData.bloodPressure = {
          systolic: values.bloodPressure.systolic ? Number(values.bloodPressure.systolic) : null,
          diastolic: values.bloodPressure.diastolic ? Number(values.bloodPressure.diastolic) : null,
          unit: 'mmHg'
        };
      }

      if (values.bodyTemperature) {
        vitalsData.bodyTemperature = {
          value: Number(values.bodyTemperature),
          unit: '°C'
        };
      }

      if (values.respiratoryRate) {
        vitalsData.respiratoryRate = {
          value: Number(values.respiratoryRate),
          unit: 'breaths/min'
        };
      }

      if (values.bloodGlucose) {
        vitalsData.bloodGlucose = {
          value: Number(values.bloodGlucose),
          unit: 'mg/dL'
        };
      }

      if (values.bloodOxygenSaturation) {
        vitalsData.bloodOxygenSaturation = {
          value: Number(values.bloodOxygenSaturation),
          unit: '%'
        };
      }

      if (values.bmi) {
        vitalsData.bmi = {
          value: Number(values.bmi)
        };
      }

      if (values.bodyFatPercentage) {
        vitalsData.bodyFatPercentage = {
          value: Number(values.bodyFatPercentage),
          unit: '%'
        };
      }

      if (values.weight) {
        vitalsData.weight = {
          value: Number(values.weight),
          unit: 'kg'
        };
      }

      if (values.height) {
        vitalsData.height = {
          value: Number(values.height),
          unit: 'cm'
        };
      }

      await medicalRecordsService.createPatientVitals(vitalsData);
      
      toast.success('Vitals record created successfully');
      navigate('/patient/medical-records/vitals');
    } catch (error) {
      console.error('Error creating vitals record:', error);
      toast.error(error.response?.data?.message || 'Failed to create vitals record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <div className={styles.header}>
        <h1>Add Vitals Record</h1>
        <p>Record your vital signs and measurements</p>
      </div>

      <Card className={styles.formCard}>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
            <Form>
              <div className={styles.dateField}>
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={values.date}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={styles.dateInput}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className={styles.vitalsContainer}>
                <PatientVitalsForm
                  values={values}
                  errors={errors}
                  touched={touched}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                />
              </div>

              <div className={styles.notesSection}>
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={values.notes}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={styles.notesTextarea}
                  placeholder="Add any additional notes about your vitals..."
                  rows={3}
                />
              </div>

              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/patient/medical-records/vitals')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  Save Vitals
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </Card>
    </PageContainer>
  );
};

export default AddVitals; 