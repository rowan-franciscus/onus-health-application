const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');
const Schema = mongoose.Schema;

// Vitals schema - extends the base MedicalRecord
const VitalsSchema = new Schema({
  heartRate: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      default: 'bpm'
    }
  },
  bloodPressure: {
    systolic: {
      type: Number
    },
    diastolic: {
      type: Number
    },
    unit: {
      type: String,
      default: 'mmHg'
    }
  },
  bodyFatPercentage: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      default: '%'
    }
  },
  bmi: {
    value: {
      type: Number
    }
  },
  weight: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      default: 'kg'
    }
  },
  height: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      default: 'cm'
    }
  },
  bodyTemperature: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      default: '°C'
    }
  },
  haemoglobin: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      default: 'g/dL'
    }
  },
  bloodGlucose: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      default: 'mmol/L'
    },
    measurementType: {
      type: String,
      enum: ['random', 'fasting', 'post-prandial', 'rapid', 'postprandial']
    }
  },
  bloodOxygenSaturation: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      default: '%'
    },
    measurementContext: {
      type: String,
      enum: ['room-air', 'nasal-cannula', 'face-mask', 'ventilator']
    }
  },
  respiratoryRate: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      default: 'breaths/min'
    }
  },
  // Flag to indicate if the vitals record was created by the patient
  createdByPatient: {
    type: Boolean,
    default: false
  }
});

// Create Vitals as a discriminator of MedicalRecord
const VitalsRecord = MedicalRecord.discriminator('Vitals', VitalsSchema);

module.exports = VitalsRecord; 