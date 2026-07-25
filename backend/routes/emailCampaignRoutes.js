'use strict';
// FILE: backend/routes/emailCampaignRoutes.js

const express      = require('express');
const router       = express.Router();
const ctrl         = require('../controllers/emailCampaignController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/',                  ctrl.getCampaignPage);    // dashboard page
router.get('/preview',           ctrl.previewSegment);     // AJAX — audience count + sample
router.get('/search-guardians',  ctrl.searchGuardians);    // AJAX — individual search
router.post('/send',             ctrl.sendCampaign);       // send campaign or individual

module.exports = router;
