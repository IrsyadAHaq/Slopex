const express = require('express');
const router = express.Router();
const loraController = require('../controllers/loraController');

// Webhook ChirpStack uplink
router.post('/webhook', (req, res) => loraController.handleWebhook(req, res));

// Downlink command ke device lewat ChirpStack
router.post('/downlink', (req, res) => loraController.handleDownlink(req, res));

// SSE stream
router.get('/events', (req, res) => loraController.handleSSE(req, res));

module.exports = router;
