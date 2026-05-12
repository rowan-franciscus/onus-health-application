const fs = require('fs');
const path = require('path');
const PhysicalRecord = require('../models/PhysicalRecord');
const Connection = require('../models/Connection');
const logger = require('../utils/logger');

const getBaseUploadDir = () => {
  if (process.env.RENDER && fs.existsSync('/mnt/data')) {
    return path.join('/mnt/data', 'uploads');
  }
  return path.join(__dirname, '../uploads');
};

exports.createPhysicalRecord = async (req, res) => {
  try {
    const { patientId } = req.params;
    const providerId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const connection = await Connection.findOne({ provider: providerId, patient: patientId });
    if (!connection) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: 'No connection to this patient' });
    }

    const record = await PhysicalRecord.create({
      patient: patientId,
      provider: providerId,
      documentType: 'scanned_record',
      description: req.body.description || '',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      }
    });

    await record.populate('provider', 'firstName lastName role');

    return res.status(201).json({
      success: true,
      record: formatRecord(record)
    });
  } catch (error) {
    logger.error('Error creating physical record:', error);
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPhysicalRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'patient') {
      if (userId !== patientId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === 'provider') {
      const connection = await Connection.findOne({ provider: userId, patient: patientId });
      if (!connection) {
        return res.status(403).json({ message: 'No connection to this patient' });
      }
    } else if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const records = await PhysicalRecord.find({ patient: patientId })
      .populate('provider', 'firstName lastName role')
      .sort({ uploadDate: -1 });

    return res.json({ records: records.map(formatRecord) });
  } catch (error) {
    logger.error('Error fetching physical records:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deletePhysicalRecord = async (req, res) => {
  try {
    const { patientId, recordId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const record = await PhysicalRecord.findOne({ _id: recordId, patient: patientId });
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (userRole !== 'admin' && record.provider.toString() !== userId) {
      return res.status(403).json({ message: 'Only the uploading provider can delete this record' });
    }

    const filePath = record.file.path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await record.deleteOne();
    return res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    logger.error('Error deleting physical record:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

function formatRecord(record) {
  return {
    id: record._id,
    patient: record.patient,
    provider: record.provider,
    documentType: record.documentType,
    description: record.description,
    file: {
      filename: record.file.filename,
      originalName: record.file.originalName,
      mimetype: record.file.mimetype,
      size: record.file.size
    },
    uploadDate: record.uploadDate,
    viewUrl: `/api/files/physical-records/${record.file.filename}?inline=true`,
    downloadUrl: `/api/files/physical-records/${record.file.filename}`
  };
}
