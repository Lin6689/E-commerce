const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    
  },
  description: {
    type: String,
    default: '',
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null, // Null matlab yeh Main Category hai
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

categorySchema.index({ title: 1, parent: 1 }, { unique: true });
module.exports = mongoose.model('Category', categorySchema);