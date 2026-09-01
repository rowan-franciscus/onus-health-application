const mongoose = require('mongoose');
const auditPlugin = require('./plugins/audit.plugin');
const { Schema } = mongoose;

const BiometricSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    bmi: { type: Number, required: true },
    bodyFatPercentage: { type: Number },
  },
  { timestamps: true }
);

BiometricSchema.plugin(auditPlugin, { resourceType: 'Biometric' });

module.exports = mongoose.model('Biometric', BiometricSchema);
