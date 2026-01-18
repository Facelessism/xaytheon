const socketService = require('../services/socket.service');

// Generate an invite link for a collaborative session
exports.createInvite = (req, res) => {
    try {
        const { roomId } = req.body;
        // In a real app, we would sign this roomId with a secret or store in DB
        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/collaboration.html?room=${roomId}&invite=true`;

        res.json({ inviteLink });
    } catch (error) {
        res.status(500).json({ message: 'Error generating invite', error: error.message });
    }
};

// Check room status
exports.getRoomStatus = (req, res) => {
    const { roomId } = req.params;
    try {
        // This is a simplified check. In production we would query the socket service
        // for active users in this room if we exposed that metadata.
        res.json({ status: 'active', roomId });
    } catch (error) {
        res.status(500).json({ message: 'Error checking status' });
    }
};
