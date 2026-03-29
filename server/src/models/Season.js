const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema(
  {
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true, index: true },
    number: { type: Number, required: true },
    title: { type: String, default: '' },
  },
  { timestamps: true }
);

seasonSchema.index({ seriesId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Season', seasonSchema);
