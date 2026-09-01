const mongoose = require('mongoose');
const auditPlugin = require('./plugins/audit.plugin');
const { Schema } = mongoose;

const SurgeryNoteSchema = new Schema(
  {
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recordedAt: { type: Date, default: Date.now },
    noteType: {
      type: String,
      enum: ['pre-op', 'intra-op', 'post-op', 'general'],
      default: 'general',
    },
    noteContent: { type: String, default: '' },
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
    medications: { type: String, default: '' },
    complications: { type: String, default: '' },
    recoveryNotes: { type: String, default: '' },
    generalNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

const SurgerySchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    surgeryType: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    leadSurgeon: { type: String, default: '' },
    anaesthesiologist: { type: String, default: '' },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
    closedAt: { type: Date, default: null },
    notes: { type: [SurgeryNoteSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

SurgerySchema.virtual('noteCount').get(function () {
  return Array.isArray(this.notes) ? this.notes.length : 0;
});

SurgerySchema.plugin(auditPlugin, { resourceType: 'Surgery' });

module.exports = mongoose.model('Surgery', SurgerySchema);
