const mongoose = require('mongoose');
const { Schema } = mongoose;

const ObservationSchema = new Schema(
  {
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recordedAt: { type: Date, default: Date.now },
    vitals: {
      heartRate: { type: Number },
      bpSystolic: { type: Number },
      bpDiastolic: { type: Number },
      temperature: { type: Number },
      respiratoryRate: { type: Number },
      bloodGlucose: { type: Number },
      bloodGlucoseType: {
        type: String,
        enum: ['random', 'fasting', 'post-prandial', 'rapid', ''],
        default: '',
      },
      spo2: { type: Number },
      spo2Context: {
        type: String,
        enum: ['room-air', 'nasal-cannula', 'face-mask', 'ventilator', ''],
        default: '',
      },
    },
    medicationsAdministered: { type: String, default: '' },
    notes: { type: String, default: '' },
    assessment: { type: String, default: '' },
    plan: { type: String, default: '' },
  },
  { timestamps: true }
);

const HospitalAdmissionSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hospitalName: { type: String, required: true, trim: true },
    admissionDate: { type: Date, required: true },
    reasonForHospitalization: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['admitted', 'discharged'],
      default: 'admitted',
      index: true,
    },
    dischargedAt: { type: Date, default: null },
    dischargeSummary: { type: String, default: null, trim: true, maxlength: 2000 },
    observations: { type: [ObservationSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

HospitalAdmissionSchema.virtual('observationCount').get(function () {
  return Array.isArray(this.observations) ? this.observations.length : 0;
});

module.exports = mongoose.model('HospitalAdmission', HospitalAdmissionSchema);
