import React from 'react';
import { Link } from 'react-router-dom';
import styles from './MedicalRecords.module.css';

// Import icons
import vitalsIcon from '../../assets/icons/vitals-icon-large.svg';
import medicationsIcon from '../../assets/icons/medications-icon-large.svg';
import immunizationsIcon from '../../assets/icons/immunizations-icon-large.svg';
import labResultsIcon from '../../assets/icons/lab-results-icon-large.svg';
import radiologyIcon from '../../assets/icons/radiology-reports-icon-large.svg';
import hospitalIcon from '../../assets/icons/hospital-icon-large.svg';
import surgeryIcon from '../../assets/icons/surgery-icon-large.svg';

const MedicalRecords = () => {
  const recordTypes = [
    {
      id: 'vitals',
      name: 'Vitals',
      icon: vitalsIcon,
      path: '/patient/medical-records/vitals'
    },
    {
      id: 'medications',
      name: 'Medications',
      icon: medicationsIcon,
      path: '/patient/medical-records/medications'
    },
    {
      id: 'immunizations',
      name: 'Immunizations',
      icon: immunizationsIcon,
      path: '/patient/medical-records/immunizations'
    },
    {
      id: 'lab-results',
      name: 'Lab Results',
      icon: labResultsIcon,
      path: '/patient/medical-records/lab-results'
    },
    {
      id: 'radiology',
      name: 'Radiology Reports',
      icon: radiologyIcon,
      path: '/patient/medical-records/radiology'
    },
    {
      id: 'hospital',
      name: 'Hospital',
      icon: hospitalIcon,
      path: '/patient/medical-records/hospital'
    },
    {
      id: 'surgery',
      name: 'Surgery',
      icon: surgeryIcon,
      path: '/patient/medical-records/surgery'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Medical Records</h1>
        <p>View your medical records by category</p>
      </div>
      
      <div className={styles.recordsGrid}>
        {recordTypes.map(type => (
          <Link 
            key={type.id} 
            to={type.path} 
            className={styles.recordCard}
            aria-label={`View ${type.name} records`}
          >
            <div className={styles.iconContainer}>
              <img src={type.icon} alt={`${type.name} icon`} className={styles.icon} />
            </div>
            <h2 className={styles.recordName}>{type.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MedicalRecords; 