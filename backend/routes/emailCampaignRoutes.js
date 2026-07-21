'use strict';
// FILE: backend/routes/emailCampaignRoutes.js

const express          = require('express');
const router           = express.Router();
const campaignCtrl     = require('../controllers/emailCampaignController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// Dashboard page
router.get('/',                campaignCtrl.getCampaignPage);

// AJAX — preview recipient count + sample before sending
router.get('/preview',         campaignCtrl.previewSegment);

// Send the campaign
router.post('/send',           campaignCtrl.sendCampaign);

module.exports = router;
