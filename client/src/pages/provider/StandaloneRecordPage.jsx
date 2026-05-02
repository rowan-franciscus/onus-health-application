import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import { toast } from 'react-toastify';

import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ProviderPatientList from './ProviderPatientList';

/**
 * Generic page that renders a patient list where each row has an
 * "Add New <Record>" button. Clicking the button opens a modal
 * containing the supplied `TabComponent` wrapped in Formik.
 *
 * On submit, every record the user has added (via the tab's own
 * "Add ..." button) is POSTed independently through `createRecord`.
 *
 * Props:
 *  - title, subtitle: header text for the patient list
 *  - addButtonLabel:  text of the action button on each patient row
 *  - modalTitle:      modal title
 *  - TabComponent:    one of ImmunizationTab | HospitalTab | SurgeryTab
 *  - tabPropName:     prop name the tab expects for its array
 *                      ('immunizations' | 'hospitalRecords' | 'surgeryRecords')
 *  - formikFieldName: Formik field name the tab writes to
 *                      ('immunization' | 'hospital' | 'surgery')
 *  - mapToPayload:    function(item) -> server payload
 *  - createRecord:    async function(patientId, payload) -> POSTs to server
 */
const StandaloneRecordPage = ({
  title,
  subtitle,
  addButtonLabel,
  modalTitle,
  TabComponent,
  tabPropName,
  formikFieldName,
  mapToPayload,
  createRecord
}) => {
  const [searchParams] = useSearchParams();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePatientsLoaded = (patients) => {
    const targetId = searchParams.get('patientId');
    if (targetId && !selectedPatient) {
      const match = patients.find(p => p.id === targetId);
      if (match) setSelectedPatient(match);
    }
  };

  const handleOpen = (patient) => setSelectedPatient(patient);
  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedPatient(null);
  };

  const renderActions = (patient) => (
    <button
      className="standaloneAddButton"
      onClick={() => handleOpen(patient)}
      style={{
        padding: '6px 12px',
        background: '#3f51b5',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      {addButtonLabel}
    </button>
  );

  const initialValues = { [formikFieldName]: [] };

  const handleSubmit = async (values, { resetForm }) => {
    const items = values[formikFieldName] || [];
    if (items.length === 0) {
      toast.warn('Add at least one record before saving');
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        items.map(item => createRecord(selectedPatient.id, mapToPayload(item)))
      );
      toast.success(`Saved ${items.length} record${items.length === 1 ? '' : 's'}`);
      resetForm();
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error saving record(s):', error);
      toast.error(error?.response?.data?.message || 'Failed to save record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ProviderPatientList
        title={title}
        subtitle={subtitle}
        renderActions={renderActions}
        onPatientsLoaded={handlePatientsLoaded}
      />

      <Modal
        isOpen={!!selectedPatient}
        onClose={handleClose}
        title={selectedPatient ? `${modalTitle} — ${selectedPatient.name}` : modalTitle}
        size="large"
      >
        {selectedPatient && (
          <Formik initialValues={initialValues} onSubmit={handleSubmit}>
            {({ values, errors, touched, setFieldValue, submitForm }) => {
              const tabProps = {
                [tabPropName]: values[formikFieldName] || [],
                errors,
                touched,
                setFieldValue
              };
              return (
                <Form>
                  <TabComponent {...tabProps} />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                    <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={submitForm}
                      disabled={isSubmitting || (values[formikFieldName] || []).length === 0}
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </Form>
              );
            }}
          </Formik>
        )}
      </Modal>
    </>
  );
};

export default StandaloneRecordPage;
