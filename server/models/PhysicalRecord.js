const mongoose = require('mongoose');
const auditPlugin = require('./plugins/audit.plugin');
const Schema = mongoose.Schema;

const PhysicalRecordSchema = new Schema({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentType: {
    type: String,
    enum: ['scanned_record'],
    default: 'scanned_record'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  file: {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

PhysicalRecordSchema.index({ patient: 1, uploadDate: -1 });

PhysicalRecordSchema.plugin(auditPlugin, { resourceType: 'PhysicalRecord' });

module.exports = mongoose.model('PhysicalRecord', PhysicalRecordSchema);
