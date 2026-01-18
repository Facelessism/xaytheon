const { initializeSocket, getIO, emitToUser, emitToWatchlist } = require("../socket/socket.server");

module.exports = {
    // Aliasing methods from the existing socket server implementation
    init: initializeSocket,
    getIO,
    emitToUser,
    emitToWatchlist,

    // Wrapper for room management if needed in controller, 
    // mirroring the existing socket.server.js capabilities
    broadcastToRoom: (roomId, event, data) => {
        try {
            const io = getIO();
            io.to(roomId).emit(event, data);
        } catch (e) {
            console.error("Socket not initialized");
        }
    }
};
