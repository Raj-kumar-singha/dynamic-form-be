const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
});

const submissionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  formVersion: {
    type: Number,
    default: 1
  },
  formSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  answers: [answerSchema],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Submission', submissionSchema);

