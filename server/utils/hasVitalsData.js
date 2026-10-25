/**
 * Whether a client-supplied vitals payload holds any reading. Values may be
 * plain or nested objects ({ value }, or { systolic, diastolic } for blood
 * pressure), and the consultation form sends empty strings for blank fields.
 */
const hasVitalsData = (vitals) => {
  if (!vitals || typeof vitals !== 'object') return false;
  return Object.values(vitals).some((val) => {
    if (!val) return false;
    if (typeof val === 'object') {
      return Object.values(val).some((nested) => nested !== null && nested !== undefined && nested !== '');
    }
    return true;
  });
};

module.exports = hasVitalsData;
