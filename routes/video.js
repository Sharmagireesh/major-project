const express = require('express');
const router = express.Router();

router.post('/agora-token', (req, res) => {
    try {
        const { channelName, uid } = req.body;
        
        console.log('Token request received:', { channelName, uid });
        
        // For testing mode, return null token
        // Agora SDK allows null token for testing without authentication
        const token = null;
        
        console.log('Returning null token for testing mode');
        res.json({ token: token });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;