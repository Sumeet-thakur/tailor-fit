import express from 'express';
import { SiteSettingsModel } from '../../models/siteSettings.js';
import { protectAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// PUT /api/admin/settings - Update global site settings
router.put('/', protectAdmin, async (req, res) => {
    try {
        const { homepageCtaVideoUrl, is2DEnabled } = req.body;
        
        // Find existing or create new if collection is empty
        let settings = await SiteSettingsModel.findOne();
        if (!settings) {
            settings = new SiteSettingsModel();
        }

        if (homepageCtaVideoUrl !== undefined) {
            settings.homepageCtaVideoUrl = homepageCtaVideoUrl;
        }

        if (is2DEnabled !== undefined) {
            settings.is2DEnabled = is2DEnabled;
        }

        await settings.save();
        
        const responseData = {
            ...settings.toObject(),
            is2DEnabled: settings.is2DEnabled
        };

        res.json({ success: true, data: responseData });
    } catch (error: any) {
        console.error('Error updating site settings:', error);
        res.status(500).json({ error: error.message || 'Error updating site settings' });
    }
});

export default router;
