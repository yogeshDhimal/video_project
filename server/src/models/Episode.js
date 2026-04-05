const mongoose = require('mongoose');

const qualitySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, default: 'video/mp4' },
    sizeBytes: { type: Number, default: 0 },
    hlsManifestRelative: { type: String, default: '' },
  },
  { _id: false }
);

const subtitleSchema = new mongoose.Schema(
  {
    lang: { type: String, required: true },
    label: { type: String, default: '' },
    fileName: { type: String, required: true },
    format: { type: String, enum: ['vtt', 'srt'], default: 'vtt' },
  },
  { _id: false }
);

const episodeSchema = new mongoose.Schema(
  {
    seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true, index: true },
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    durationSeconds: { type: Number, default: 0 },
    thumbnailPath: { type: String, default: '' },
    qualities: [qualitySchema],
    subtitles: [subtitleSchema],
    introStartSec: { type: Number, default: 0 },
    introEndSec: { type: Number, default: 0 },
    outroStartSec: { type: Number, default: 0 },
    outroEndSec: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    recentViews: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0, index: true },
    trendingScore: { type: Number, default: 0, index: true },
    ratingAvg: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

episodeSchema.index({ seasonId: 1, number: 1 }, { unique: true });
episodeSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Episode', episodeSchema);
