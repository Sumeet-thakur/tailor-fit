import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteSettings extends Document {
  homepageCtaVideoUrl?: string;
  is2DEnabled: boolean;
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<ISiteSettings>({
  homepageCtaVideoUrl: {
    type: String,
    required: false,
    default: '/videos/homepage_model.mp4' // fallback if empty
  },
  is2DEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true, // adds createdAt and updatedAt
  capped: { size: 1048576, max: 1 } // ensure only 1 document is ever created (singleton)
});

export const SiteSettingsModel = mongoose.model<ISiteSettings>('SiteSettings', siteSettingsSchema);
