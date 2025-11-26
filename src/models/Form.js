const mongoose = require('mongoose');

const nestedFieldSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['text', 'textarea', 'number', 'email', 'date', 'checkbox', 'radio', 'select', 'file']
  },
  required: { type: Boolean, default: false },
  options: { type: [mongoose.Schema.Types.Mixed], default: [] },
  validation: {
    min: Number,
    max: Number,
    regex: String,
    minLength: Number,
    maxLength: Number
  },
  order: { type: Number, default: 0 }
}, { _id: false });

const fieldSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'textarea', 'number', 'email', 'date', 'checkbox', 'radio', 'select', 'file']
  },
  required: {
    type: Boolean,
    default: false
  },
  options: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  conditionalFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  validation: {
    min: Number,
    max: Number,
    regex: String,
    minLength: Number,
    maxLength: Number
  },
  order: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false }); // Disable _id for fields subdocuments

const formSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  fields: [fieldSchema],
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Ensure field names are unique within a form
formSchema.pre('save', function(next) {
  const fieldNames = this.fields.map(f => f.name);
  const uniqueNames = new Set(fieldNames);
  if (fieldNames.length !== uniqueNames.size) {
    return next(new Error('Field names must be unique within a form'));
  }
  next();
});

module.exports = mongoose.model('Form', formSchema);

