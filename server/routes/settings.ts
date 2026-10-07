import express from 'express';
import { SiteSettingsModel } from '../models/siteSettings.js';

const router = express.Router();

// GET /api/settings - Fetch public site settings
router.get('/', async (req, res) => {
    try {
        let settings = await SiteSettingsModel.findOne();
        if (!settings) {
            // Because it's capped, we can just create the singleton if missing
            settings = await SiteSettingsModel.create({ is2DEnabled: true });
        }
        
        // Ensure the response object has the field even for existing documents
        const responseData = {
            ...settings.toObject(),
            is2DEnabled: settings.is2DEnabled !== undefined ? settings.is2DEnabled : true
        };

        res.json({ success: true, data: responseData });
    } catch (error: any) {
        console.error('Error fetching site settings:', error);
        res.status(500).json({ error: error.message || 'Error fetching site settings' });
    }
});

export default router;
