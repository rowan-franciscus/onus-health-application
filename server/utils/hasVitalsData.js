// Keys that hold a measurement; anything else on a vital (unit,
// measurementType, measurementContext) is metadata about it
const READING_KEYS = ['value', 'systolic', 'diastolic'];

const isFilled = (v) => v !== null && v !== undefined && v !== '';

/**
 * Whether a client-supplied vitals payload holds any reading. Values may be
 * plain or nested objects ({ value }, or { systolic, diastolic } for blood
 * pressure), and the consultation form sends empty strings for blank fields.
 * Metadata alone (e.g. a glucose type with no value) is not a reading.
 */
const hasVitalsData = (vitals) => {
  if (!vitals || typeof vitals !== 'object') return false;
  return Object.values(vitals).some((val) => {
    if (val && typeof val === 'object') {
      return READING_KEYS.some((key) => isFilled(val[key]));
    }
    return isFilled(val);
  });
};

module.exports = hasVitalsData;
