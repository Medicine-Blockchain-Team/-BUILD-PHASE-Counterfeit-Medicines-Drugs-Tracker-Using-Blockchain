const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String },
  txHash: { type: String, default: 'N/A' },
  status: { type: String, default: 'Success' }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
