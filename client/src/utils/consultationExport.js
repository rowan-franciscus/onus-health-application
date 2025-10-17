import { jsPDF } from 'jspdf';
import { formatDate as formatDateUtil } from './dateUtils';
import 'jspdf-autotable';

/**
 * Export consultation data as JSON
 * @param {Object} consultation - The consultation data
 * @returns {void}
 */
export const exportAsJSON = (consultation) => {
  const dataStr = JSON.stringify(consultation, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `consultation_${consultation.id}_${formatDateForFilename(consultation.date)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export consultation data as CSV
 * @param {Object} consultation - The consultation data
 * @returns {void}
 */
export const exportAsCSV = (consultation) => {
  // Prepare CSV data
  const csvRows = [];
  
  // Header section
  csvRows.push(['CONSULTATION DETAILS']);
  csvRows.push([]);
  csvRows.push(['Field', 'Value']);
  csvRows.push(['Consultation ID', consultation.id || 'N/A']);
  csvRows.push(['Date', formatDate(consultation.date) || 'N/A']);
  csvRows.push(['Type', consultation.type || 'N/A']);
  csvRows.push(['Specialist', consultation.specialist || 'N/A']);
  csvRows.push(['Specialty', consultation.specialty || 'N/A']);
  csvRows.push(['Clinic', consultation.clinic || 'N/A']);
  csvRows.push(['Reason for Visit', consultation.reason || 'N/A']);
  
  // General Information
  if (consultation.general) {
    csvRows.push([]);
    csvRows.push(['GENERAL INFORMATION']);
    csvRows.push(['Practice', consultation.general.practice || 'N/A']);
    csvRows.push(['Observations', consultation.general.observations || 'N/A']);
  }
  
  // Vitals
  if (consultation.vitals && Object.keys(consultation.vitals).length > 0) {
    csvRows.push([]);
    csvRows.push(['VITALS']);
    
    // Helper to format vital values
    const formatVital = (vital) => {
      if (!vital) return 'N/A';
      if (typeof vital === 'object' && vital.value !== undefined) {
        return vital.unit ? `${vital.value} ${vital.unit}` : vital.value;
      }
      return vital;
    };
    
    if (consultation.vitals.heartRate) {
      csvRows.push(['Heart Rate', formatVital(consultation.vitals.heartRate)]);
    }
    if (consultation.vitals.bloodPressure && (consultation.vitals.bloodPressure.systolic || consultation.vitals.bloodPressure.diastolic)) {
      csvRows.push(['Blood Pressure', `${consultation.vitals.bloodPressure.systolic || 'N/A'}/${consultation.vitals.bloodPressure.diastolic || 'N/A'} ${consultation.vitals.bloodPressure.unit || 'mmHg'}`]);
    }
    if (consultation.vitals.bodyTemperature) {
      csvRows.push(['Body Temperature', formatVital(consultation.vitals.bodyTemperature)]);
    }
    if (consultation.vitals.weight) {
      csvRows.push(['Weight', formatVital(consultation.vitals.weight)]);
    }
    if (consultation.vitals.height) {
      csvRows.push(['Height', formatVital(consultation.vitals.height)]);
    }
    if (consultation.vitals.bmi) {
      csvRows.push(['BMI', formatVital(consultation.vitals.bmi)]);
    }
    if (consultation.vitals.bloodOxygenSaturation) {
      csvRows.push(['Blood Oxygen Saturation', formatVital(consultation.vitals.bloodOxygenSaturation)]);
    }
    if (consultation.vitals.respiratoryRate) {
      csvRows.push(['Respiratory Rate', formatVital(consultation.vitals.respiratoryRate)]);
    }
  }
  
  // Medications
  if (consultation.medications && consultation.medications.length > 0) {
    csvRows.push([]);
    csvRows.push(['MEDICATIONS']);
    csvRows.push(['Name', 'Dosage', 'Frequency', 'Start Date', 'End Date', 'Reason']);
    
    consultation.medications.forEach(med => {
      csvRows.push([
        med.name || 'N/A',
        med.dosage ? `${med.dosage.value || ''} ${med.dosage.unit || ''}`.trim() : 'N/A',
        med.frequency || 'N/A',
        formatDate(med.startDate) || 'N/A',
        formatDate(med.endDate) || 'N/A',
        med.reasonForPrescription || 'N/A'
      ]);
    });
  }
  
  // Immunizations
  if (consultation.immunizations && consultation.immunizations.length > 0) {
    csvRows.push([]);
    csvRows.push(['IMMUNIZATIONS']);
    csvRows.push(['Vaccine Name', 'Date Administered', 'Next Due Date', 'Administered By']);
    
    consultation.immunizations.forEach(immunization => {
      csvRows.push([
        immunization.vaccineName || 'N/A',
        formatDate(immunization.dateAdministered) || 'N/A',
        formatDate(immunization.nextDueDate) || 'N/A',
        immunization.administeredBy || 'N/A'
      ]);
    });
  }
  
  // Lab Results
  if (consultation.labResults && consultation.labResults.length > 0) {
    csvRows.push([]);
    csvRows.push(['LAB RESULTS']);
    csvRows.push(['Test Name', 'Lab Name', 'Date', 'Results', 'Reference Range', 'Status']);
    
    consultation.labResults.forEach(lab => {
      csvRows.push([
        lab.testName || 'N/A',
        lab.labName || 'N/A',
        formatDate(lab.dateOfTest) || 'N/A',
        lab.results || 'N/A',
        lab.referenceRange || 'N/A',
        lab.status || 'N/A'
      ]);
    });
  }
  
  // Convert to CSV string
  const csvContent = csvRows.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, newline, or quotes
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `consultation_${consultation.id}_${formatDateForFilename(consultation.date)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export consultation data as PDF
 * @param {Object} consultation - The consultation data
 * @returns {void}
 */
export const exportAsPDF = (consultation) => {
  try {
    const doc = new jsPDF();
    let yPosition = 20;
  
  // Helper to add section headers
  const addSectionHeader = (text) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(text, 20, yPosition);
    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
  };
  
  // Helper to add key-value pairs
  const addKeyValue = (key, value, indent = 20) => {
    const text = `${key}: ${value || 'N/A'}`;
    const lines = doc.splitTextToSize(text, 170);
    lines.forEach(line => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, indent, yPosition);
      yPosition += 6;
    });
  };
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSULTATION REPORT', 105, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Consultation Details
  addSectionHeader('CONSULTATION DETAILS');
  addKeyValue('Consultation ID', consultation.id);
  addKeyValue('Date', formatDate(consultation.date));
  addKeyValue('Type', consultation.type);
  addKeyValue('Specialist', consultation.specialist);
  addKeyValue('Specialty', consultation.specialty);
  addKeyValue('Clinic', consultation.clinic);
  addKeyValue('Reason for Visit', consultation.reason);
  yPosition += 5;
  
  // General Information
  if (consultation.general) {
    addSectionHeader('GENERAL INFORMATION');
    addKeyValue('Practice', consultation.general.practice);
    addKeyValue('Observations', consultation.general.observations);
    yPosition += 5;
  }
  
  // Vitals
  if (consultation.vitals && Object.keys(consultation.vitals).length > 0) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    addSectionHeader('VITALS');
    
    const vitalsData = [];
    const formatVital = (vital) => {
      if (!vital) return 'N/A';
      if (typeof vital === 'object' && vital.value !== undefined) {
        return vital.unit ? `${vital.value} ${vital.unit}` : vital.value;
      }
      return vital;
    };
    
    if (consultation.vitals.heartRate) {
      vitalsData.push(['Heart Rate', formatVital(consultation.vitals.heartRate)]);
    }
    if (consultation.vitals.bloodPressure && (consultation.vitals.bloodPressure.systolic || consultation.vitals.bloodPressure.diastolic)) {
      vitalsData.push(['Blood Pressure', `${consultation.vitals.bloodPressure.systolic || 'N/A'}/${consultation.vitals.bloodPressure.diastolic || 'N/A'} ${consultation.vitals.bloodPressure.unit || 'mmHg'}`]);
    }
    if (consultation.vitals.bodyTemperature) {
      vitalsData.push(['Body Temperature', formatVital(consultation.vitals.bodyTemperature)]);
    }
    if (consultation.vitals.weight) {
      vitalsData.push(['Weight', formatVital(consultation.vitals.weight)]);
    }
    if (consultation.vitals.height) {
      vitalsData.push(['Height', formatVital(consultation.vitals.height)]);
    }
    if (consultation.vitals.bmi) {
      vitalsData.push(['BMI', formatVital(consultation.vitals.bmi)]);
    }
    if (consultation.vitals.bloodOxygenSaturation) {
      vitalsData.push(['Blood Oxygen Saturation', formatVital(consultation.vitals.bloodOxygenSaturation)]);
    }
    if (consultation.vitals.respiratoryRate) {
      vitalsData.push(['Respiratory Rate', formatVital(consultation.vitals.respiratoryRate)]);
    }
    
    if (vitalsData.length > 0) {
      doc.autoTable({
        startY: yPosition,
        head: [['Measurement', 'Value']],
        body: vitalsData,
        theme: 'grid',
        headStyles: { fillColor: [94, 23, 235] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10 }
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    }
  }
  
  // Medications
  if (consultation.medications && consultation.medications.length > 0) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    addSectionHeader('MEDICATIONS');
    
    const medicationData = consultation.medications.map(med => [
      med.name || 'N/A',
      med.dosage ? `${med.dosage.value || ''} ${med.dosage.unit || ''}`.trim() : 'N/A',
      med.frequency || 'N/A',
      formatDate(med.startDate) || 'N/A',
      med.reasonForPrescription || 'N/A'
    ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Name', 'Dosage', 'Frequency', 'Start Date', 'Reason']],
      body: medicationData,
      theme: 'grid',
      headStyles: { fillColor: [94, 23, 235] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9 }
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }
  
  // Immunizations
  if (consultation.immunizations && consultation.immunizations.length > 0) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    addSectionHeader('IMMUNIZATIONS');
    
    const immunizationData = consultation.immunizations.map(imm => [
      imm.vaccineName || 'N/A',
      formatDate(imm.dateAdministered) || 'N/A',
      formatDate(imm.nextDueDate) || 'N/A',
      imm.administeredBy || 'N/A'
    ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Vaccine', 'Date Administered', 'Next Due', 'Administered By']],
      body: immunizationData,
      theme: 'grid',
      headStyles: { fillColor: [94, 23, 235] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9 }
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }
  
  // Lab Results
  if (consultation.labResults && consultation.labResults.length > 0) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    addSectionHeader('LAB RESULTS');
    
    const labData = consultation.labResults.map(lab => [
      lab.testName || 'N/A',
      lab.labName || 'N/A',
      formatDate(lab.dateOfTest) || 'N/A',
      lab.results || 'N/A',
      lab.status || 'N/A'
    ]);
    
    doc.autoTable({
      startY: yPosition,
      head: [['Test', 'Lab', 'Date', 'Results', 'Status']],
      body: labData,
      theme: 'grid',
      headStyles: { fillColor: [94, 23, 235] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9 }
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    doc.text(`Generated on ${formatDate(new Date())}`, 20, 285);
  }
  
    // Save the PDF
    doc.save(`consultation_${consultation.id}_${formatDateForFilename(consultation.date)}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again or use a different format.');
  }
};

// Helper functions
const formatDate = (dateString) => {
  return formatDateUtil(dateString) || '';
};

const formatDateForFilename = (dateString) => {
  if (!dateString) return 'unknown';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'unknown';
  return date.toISOString().split('T')[0];
}; 