const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    genres: [{ type: String, index: true }],
    tags: [{ type: String }],
    releaseYear: { type: Number, index: true },
    posterPath: { type: String, default: '' },
    videoFile: { type: String, default: '' },
    thumbnailPath: { type: String, default: '' },
    subtitleFile: { type: String, default: '' },
    type: { type: String, enum: ['series', 'movie'], default: 'series' },
    /** Show lifecycle (ongoing / completed) — not the same as catalog visibility */
    status: { type: String, enum: ['ongoing', 'completed', 'hiatus'], default: 'ongoing' },
    /** draft = hidden from public catalog until published */
    catalogStatus: { type: String, enum: ['draft', 'published'], default: 'published', index: true },
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0, index: true },
    recentViewsWindow: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

seriesSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Series', seriesSchema);
