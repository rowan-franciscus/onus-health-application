const Connection = require('../models/Connection');
const User = require('../models/User');
const EmailQueue = require('../models/EmailQueue');
const mongoose = require('mongoose');
const config = require('../config/environment');

/**
 * Create a new connection (provider initiated)
 * This creates a connection with limited access by default
 * If fullAccessRequested is true, it also sends a full access request to the patient
 */
exports.createConnection = async (req, res) => {
  try {
    const { patientEmail, notes, fullAccessRequested = false } = req.body;
    const providerId = req.user.id;

    // Find patient by email
    const patient = await User.findOne({ email: patientEmail, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      patient: patient._id,
      provider: providerId
    });

    if (existingConnection) {
      return res.status(400).json({ 
        message: 'Connection already exists',
        connection: existingConnection
      });
    }

    // Create new connection with limited access by default
    const connection = new Connection({
      patient: patient._id,
      provider: providerId,
      initiatedBy: providerId,
      accessLevel: 'limited', // Always start with limited access
      fullAccessStatus: fullAccessRequested ? 'pending' : 'none',
      notes,
      patientNotified: false
    });

    await connection.save();

    // Queue email notification to patient if full access is requested
    if (fullAccessRequested) {
      await EmailQueue.create({
        to: patient.email,
        from: config.emailFrom || 'noreply@onushealth.com',
        subject: 'Healthcare Provider Connection Request',
        html: `<p>Dear ${patient.firstName},</p><p>Your healthcare provider ${req.user.firstName} ${req.user.lastName} has requested full access to your medical records on Onus Health.</p><p>Please log in to your account to approve or deny this request.</p>`,
        template: 'fullAccessRequest',
        templateData: {
          patientName: `${patient.firstName} ${patient.lastName}`,
          providerName: `${req.user.firstName} ${req.user.lastName}`,
          providerSpecialty: req.user.providerProfile?.specialty || 'Healthcare Provider',
          notes: notes || 'No additional notes'
        },
        userId: patient._id
      });
       
      // Mark as notified
      connection.patientNotified = true;
      connection.patientNotifiedAt = Date.now();
      await connection.save();
    }

    // Populate the connection for the response
    await connection.populate(['patient', 'provider']);

    return res.status(201).json({
      success: true,
      connection,
      message: fullAccessRequested ? 
        'Connection created with limited access. Full access request sent to patient.' :
        'Connection created with limited access.'
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Send full access request for an existing connection
 */
exports.requestFullAccess = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const providerId = req.user.id;

    // Find the connection
    const connection = await Connection.findOne({
      _id: connectionId,
      provider: providerId
    }).populate('patient');

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // Check if already has full access
    if (connection.accessLevel === 'full') {
      return res.status(400).json({ message: 'Already has full access' });
    }

    // Check if request is already pending
    if (connection.fullAccessStatus === 'pending') {
      return res.status(400).json({ message: 'Full access request already pending' });
    }

    // Request full access
    await connection.requestFullAccess();

    // Queue email notification to patient
    await EmailQueue.create({
      to: connection.patient.email,
      from: config.emailFrom || 'noreply@onushealth.com',
      subject: 'Healthcare Provider Requesting Full Access',
      html: `<h1>Healthcare Provider Requesting Full Access</h1>
             <p>Hello ${connection.patient.firstName} ${connection.patient.lastName},</p>
             <p><strong>Dr. ${req.user.firstName} ${req.user.lastName}</strong> (${req.user.providerProfile?.specialty || 'Healthcare Provider'}) is requesting full access to your medical records on Onus Health.</p>
             <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #856404;">
               <h3 style="margin: 0 0 10px 0; color: #856404;">Full Access Request</h3>
               <p style="margin: 5px 0;">This provider is requesting access to:</p>
               <ul style="margin: 10px 0; padding-left: 20px;">
                 <li>All your medical consultations</li>
                 <li>All your medical records and history</li>
                 <li>Your complete health profile</li>
               </ul>
               ${connection.notes ? `<p style="margin: 5px 0;"><strong>Provider Notes:</strong> ${connection.notes}</p>` : ''}
             </div>
             <p>Please log in to your Onus Health account to approve or deny this request.</p>
             <p>You can approve or deny this request at any time. If denied, the provider will continue to have limited access only.</p>
             <p>Best regards,<br>The Onus Health Team</p>
             <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
             <p style="font-size: 12px; color: #6c757d;">This is an automated notification from Onus Health.</p>`,
      template: 'fullAccessRequest',
      templateData: {
        patientName: `${connection.patient.firstName} ${connection.patient.lastName}`,
        providerName: `${req.user.firstName} ${req.user.lastName}`,
        providerSpecialty: req.user.providerProfile?.specialty || 'Healthcare Provider',
        notes: connection.notes || 'No additional notes'
      },
      userId: connection.patient._id
    });

    // Mark as notified
    connection.patientNotified = true;
    connection.patientNotifiedAt = Date.now();
    await connection.save();

    return res.json({
      success: true,
      message: 'Full access request sent to patient',
      connection
    });
  } catch (error) {
    console.error('Error requesting full access:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all connections for the current user
 */
exports.getConnections = async (req, res) => {
  try {
    const userId = req.user.id;
    const { accessLevel, fullAccessStatus } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by access level if provided
    if (accessLevel) {
      query.accessLevel = accessLevel;
    }
    
    // Filter by full access status if provided
    if (fullAccessStatus) {
      query.fullAccessStatus = fullAccessStatus;
    }
    
    // Filter by user role
    if (req.user.role === 'patient') {
      query.patient = userId;
    } else if (req.user.role === 'provider') {
      query.provider = userId;
    }
    
    // Fetch connections with populated user info
    const connections = await Connection.find(query)
      .populate('patient', 'firstName lastName email patientProfile')
      .populate({
        path: 'provider',
        select: 'firstName lastName email providerProfile',
        populate: {
          path: 'providerProfile',
          select: 'specialty practiceInfo'
        }
      })
      .sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      connections
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get a specific connection by ID
 */
exports.getConnectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid connection ID' });
    }
    
    // Fetch connection with populated user info
    const connection = await Connection.findById(id)
      .populate('patient', 'firstName lastName email patientProfile')
      .populate({
        path: 'provider',
        select: 'firstName lastName email providerProfile',
        populate: {
          path: 'providerProfile',
          select: 'specialty practiceInfo'
        }
      });
    
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    
    // Verify user is part of the connection
    if (connection.patient._id.toString() !== userId && 
        connection.provider._id.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access this connection' });
    }
    
    return res.json({
      success: true,
      connection
    });
  } catch (error) {
    console.error('Error fetching connection:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get pending full access requests for a patient
 */
exports.getPatientConnectionRequests = async (req, res) => {
  try {
    const patientId = req.user.id;
    
    const requests = await Connection.find({ 
      patient: patientId, 
      fullAccessStatus: 'pending'
    })
      .populate({
        path: 'provider',
        select: 'firstName lastName email providerProfile',
        populate: {
          path: 'providerProfile',
          select: 'specialty practiceInfo'
        }
      })
      .sort({ fullAccessStatusUpdatedAt: -1, createdAt: -1 });
    
    return res.json({
      success: true,
      requests: requests.map(request => ({
        id: request._id,
        name: `Dr. ${request.provider.firstName} ${request.provider.lastName}`,
        specialty: request.provider.providerProfile?.specialty || 'N/A',
        practice: request.provider.providerProfile?.practiceInfo?.name || 'N/A',
        requestDate: request.fullAccessStatusUpdatedAt || request.createdAt,
        notes: request.notes,
        accessLevel: request.accessLevel,
        currentAccess: 'Limited Access'
      }))
    });
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load connection requests'
    });
  }
};

/**
 * Respond to a full access request (approve/deny)
 */
exports.respondToConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'approve' or 'deny'
    const patientId = req.user.id;
    
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID'
      });
    }
    
    // Find the connection request
    const connection = await Connection.findOne({
      _id: requestId,
      patient: patientId,
      fullAccessStatus: 'pending'
    }).populate('provider', 'firstName lastName email');
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found or already processed'
      });
    }
    
    // Update connection based on action
    if (action === 'approve') {
      await connection.approveFullAccess();
    } else if (action === 'deny') {
      await connection.denyFullAccess();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "deny"'
      });
    }
    
    // Send email notification to provider
    const emailData = {
      to: connection.provider.email,
      from: config.emailFrom || 'noreply@onushealth.com',
      subject: `Full Access Request ${action === 'approve' ? 'Approved' : 'Denied'}`,
      html: action === 'approve' ? 
        `<h1>Full Access Request Approved</h1>
         <p>Hello ${connection.provider.firstName} ${connection.provider.lastName},</p>
         <p><strong>${req.user.firstName} ${req.user.lastName}</strong> has approved your full access request on Onus Health.</p>
         <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #155724;">
           <h3 style="margin: 0 0 10px 0; color: #155724;">Full Access Granted</h3>
           <p style="margin: 5px 0;">You now have full access to this patient's medical records.</p>
           <p style="margin: 5px 0;">You can view all consultations, medical records, and patient profile information.</p>
         </div>
         <p>Please log in to your Onus Health provider account to access the patient's records.</p>
         <p>Best regards,<br>The Onus Health Team</p>
         <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
         <p style="font-size: 12px; color: #6c757d;">This is an automated notification from Onus Health.</p>` 
        : 
        `<h1>Full Access Request Denied</h1>
         <p>Hello ${connection.provider.firstName} ${connection.provider.lastName},</p>
         <p><strong>${req.user.firstName} ${req.user.lastName}</strong> has denied your full access request on Onus Health.</p>
         <div style="background-color: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #721c24;">
           <h3 style="margin: 0 0 10px 0; color: #721c24;">Access Remains Limited</h3>
           <p style="margin: 5px 0;">You continue to have limited access to this patient's records.</p>
           <p style="margin: 5px 0;">You can only view consultations and records that you create for this patient.</p>
         </div>
         <p>If you have questions about this decision, you may contact the patient directly.</p>
         <p>Best regards,<br>The Onus Health Team</p>
         <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
         <p style="font-size: 12px; color: #6c757d;">This is an automated notification from Onus Health.</p>`,
      template: action === 'approve' ? 'fullAccessApproved' : 'fullAccessDenied',
      templateData: {
        patientName: `${req.user.firstName} ${req.user.lastName}`,
        providerName: `${connection.provider.firstName} ${connection.provider.lastName}`
      },
      userId: connection.provider._id
    };
    
    await EmailQueue.create(emailData);
    
    return res.json({
      success: true,
      message: `Full access request ${action === 'approve' ? 'approved' : 'denied'} successfully`,
      connection: {
        id: connection._id,
        accessLevel: connection.accessLevel,
        fullAccessStatus: connection.fullAccessStatus
      }
    });
  } catch (error) {
    console.error('Error responding to connection request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process request'
    });
  }
};

/**
 * Revoke provider access (patient removes provider)
 */
exports.revokeConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const patientId = req.user.id;
    
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid connection ID'
      });
    }
    
    // Find the connection
    const connection = await Connection.findOne({
      _id: connectionId,
      patient: patientId
    }).populate('provider', 'firstName lastName email');
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found'
      });
    }
    
    let message = '';
    let emailTemplate = '';
    let emailSubject = '';
    
    // Determine action based on current access level and status
    if (connection.accessLevel === 'full' || connection.fullAccessStatus === 'approved') {
      // Revoke full access back to limited
      await connection.revokeAccess();
      message = 'Full access revoked. Provider now has limited access only.';
      emailTemplate = 'accessRevoked';
      emailSubject = 'Full Access Revoked';
    } else if (connection.accessLevel === 'limited' && (connection.fullAccessStatus === 'none' || connection.fullAccessStatus === 'denied')) {
      // Remove the connection entirely
      await Connection.findByIdAndDelete(connectionId);
      message = 'Provider connection removed completely.';
      emailTemplate = 'connectionRemoved';
      emailSubject = 'Patient Connection Removed';
    } else {
      // Fallback - just revoke access
      await connection.revokeAccess();
      message = 'Provider access updated.';
      emailTemplate = 'accessRevoked';
      emailSubject = 'Access Updated';
    }
    
    // Send email notification to provider
    try {
      let emailHtml = '';
      
      if (emailTemplate === 'accessRevoked') {
        emailHtml = `<h1>Full Access Revoked</h1>
                     <p>Hello ${connection.provider.firstName} ${connection.provider.lastName},</p>
                     <p><strong>${req.user.firstName} ${req.user.lastName}</strong> has revoked your full access to their medical records on Onus Health.</p>
                     <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #856404;">
                       <h3 style="margin: 0 0 10px 0; color: #856404;">Access Updated</h3>
                       <p style="margin: 5px 0;">Your access has been changed to limited access only.</p>
                       <p style="margin: 5px 0;">You can still view consultations and records that you create for this patient.</p>
                     </div>
                     <p>If you have questions about this change, you may contact the patient directly.</p>
                     <p>Best regards,<br>The Onus Health Team</p>
                     <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
                     <p style="font-size: 12px; color: #6c757d;">This is an automated notification from Onus Health.</p>`;
      } else if (emailTemplate === 'connectionRemoved') {
        emailHtml = `<h1>Patient Connection Removed</h1>
                     <p>Hello ${connection.provider.firstName} ${connection.provider.lastName},</p>
                     <p><strong>${req.user.firstName} ${req.user.lastName}</strong> has removed your connection from their Onus Health account.</p>
                     <div style="background-color: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #721c24;">
                       <h3 style="margin: 0 0 10px 0; color: #721c24;">Connection Removed</h3>
                       <p style="margin: 5px 0;">You no longer have access to this patient's medical records on Onus Health.</p>
                       <p style="margin: 5px 0;">Any existing consultations and records you created remain in your account for reference.</p>
                     </div>
                     <p>If you believe this was done in error, please contact the patient directly to discuss reconnecting.</p>
                     <p>Best regards,<br>The Onus Health Team</p>
                     <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
                     <p style="font-size: 12px; color: #6c757d;">This is an automated notification from Onus Health.</p>`;
      } else {
        emailHtml = `<h1>Access Updated</h1>
                     <p>Hello ${connection.provider.firstName} ${connection.provider.lastName},</p>
                     <p><strong>${req.user.firstName} ${req.user.lastName}</strong> has updated your access to their medical records on Onus Health.</p>
                     <p>Please log in to your account to view the current access level.</p>
                     <p>Best regards,<br>The Onus Health Team</p>`;
      }
      
      await EmailQueue.create({
        to: connection.provider.email,
        from: config.emailFrom || 'noreply@onushealth.com',
        subject: emailSubject,
        html: emailHtml,
        template: emailTemplate,
        templateData: {
          patientName: `${req.user.firstName} ${req.user.lastName}`,
          providerName: `${connection.provider.firstName} ${connection.provider.lastName}`
        },
        userId: connection.provider._id
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the request if email fails, just log it
    }
    
    return res.json({
      success: true,
      message,
      connection: connection.accessLevel === 'limited' && (connection.fullAccessStatus === 'none' || connection.fullAccessStatus === 'denied') ? null : {
        id: connection._id,
        accessLevel: connection.accessLevel,
        fullAccessStatus: connection.fullAccessStatus
      }
    });
  } catch (error) {
    console.error('Error revoking connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke access'
    });
  }
};

/**
 * Directly grant full access to a provider (patient action)
 * This bypasses the pending request flow and immediately grants full access
 */
exports.grantFullAccess = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const patientId = req.user.id;
    
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid connection ID'
      });
    }
    
    // Find the connection
    const connection = await Connection.findOne({
      _id: connectionId,
      patient: patientId
    }).populate('provider', 'firstName lastName email');
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found'
      });
    }
    
    // Check if already has full access
    if (connection.accessLevel === 'full') {
      return res.status(400).json({
        success: false,
        message: 'Provider already has full access'
      });
    }
    
    // Grant full access directly
    await connection.approveFullAccess();
    
    // Send email notification to provider
    try {
      await EmailQueue.create({
        to: connection.provider.email,
        from: config.emailFrom || 'noreply@onushealth.com',
        subject: 'Full Access Granted',
        html: `<h1>Full Access Granted</h1>
               <p>Hello ${connection.provider.firstName} ${connection.provider.lastName},</p>
               <p><strong>${req.user.firstName} ${req.user.lastName}</strong> has granted you full access to their medical records on Onus Health.</p>
               <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #155724;">
                 <h3 style="margin: 0 0 10px 0; color: #155724;">Full Access Granted</h3>
                 <p style="margin: 5px 0;">You now have full access to this patient's medical records.</p>
                 <p style="margin: 5px 0;">You can view all consultations, medical records, and patient profile information.</p>
               </div>
               <p>Please log in to your Onus Health provider account to access the patient's records.</p>
               <p>Best regards,<br>The Onus Health Team</p>
               <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
               <p style="font-size: 12px; color: #6c757d;">This is an automated notification from Onus Health.</p>`,
        template: 'fullAccessGranted',
        templateData: {
          patientName: `${req.user.firstName} ${req.user.lastName}`,
          providerName: `${connection.provider.firstName} ${connection.provider.lastName}`
        },
        userId: connection.provider._id
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the request if email fails, just log it
    }
    
    return res.json({
      success: true,
      message: 'Full access granted successfully',
      connection: {
        id: connection._id,
        accessLevel: connection.accessLevel,
        fullAccessStatus: connection.fullAccessStatus
      }
    });
  } catch (error) {
    console.error('Error granting full access:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to grant full access'
    });
  }
};

/**
 * Delete a connection completely
 */
exports.deleteConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid connection ID' });
    }
    
    // Find connection
    const connection = await Connection.findById(id);
    
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    
    // Verify user is part of the connection
    if (connection.patient.toString() !== userId && 
        connection.provider.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this connection' });
    }
    
    await Connection.findByIdAndDelete(id);
    
    return res.json({ 
      success: true,
      message: 'Connection deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 