const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { startRealTimeSimulation } = require("../services/analytics.socket.service");

let io;
const userSockets = new Map(); // userId -> Set of socket IDs
const watchlistRooms = new Map(); // watchlistId -> Set of userIds

function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:8080",
            credentials: true,
        },
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (err) {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`✅ User ${socket.userId} connected: ${socket.id}`);

        // Track user socket
        if (!userSockets.has(socket.userId)) {
            userSockets.set(socket.userId, new Set());
        }
        userSockets.get(socket.userId).add(socket.id);

        // Join watchlist room
        socket.on("join_watchlist", (watchlistId) => {
            socket.join(`watchlist:${watchlistId}`);

            if (!watchlistRooms.has(watchlistId)) {
                watchlistRooms.set(watchlistId, new Set());
            }
            watchlistRooms.get(watchlistId).add(socket.userId);

            // Broadcast user joined
            socket.to(`watchlist:${watchlistId}`).emit("user_joined", {
                userId: socket.userId,
                watchlistId,
            });

            // Send current viewers
            const viewers = Array.from(watchlistRooms.get(watchlistId) || []);
            socket.emit("presence_update", { watchlistId, viewers });
        });

        // Leave watchlist room
        socket.on("leave_watchlist", (watchlistId) => {
            socket.leave(`watchlist:${watchlistId}`);

            if (watchlistRooms.has(watchlistId)) {
                watchlistRooms.get(watchlistId).delete(socket.userId);
            }

            socket.to(`watchlist:${watchlistId}`).emit("user_left", {
                userId: socket.userId,
                watchlistId,
            });
        });

        // Analytics rooms
        socket.on("join_analytics", () => {
            socket.join("analytics_watchers");
            // console.log(`User ${socket.userId} joined analytics watchers`);
        });

        socket.on("leave_analytics", () => {
            socket.leave("analytics_watchers");
        });

        // WAR ROOM: Join incident war room
        socket.on("join_war_room", (incidentId) => {
            const roomName = `war_room:${incidentId}`;
            socket.join(roomName);
            socket.currentWarRoom = incidentId;

            console.log(`🚨 User ${socket.userId} joined War Room: ${incidentId}`);

            // Notify others of new participant
            socket.to(roomName).emit("war_room_user_joined", {
                userId: socket.userId,
                incidentId,
                timestamp: Date.now()
            });

            // Send current participants
            io.in(roomName).allSockets().then(sockets => {
                socket.emit("war_room_participants", {
                    incidentId,
                    count: sockets.size,
                    participants: Array.from(sockets)
                });
            });
        });

        // WAR ROOM: Leave war room
        socket.on("leave_war_room", (incidentId) => {
            const roomName = `war_room:${incidentId}`;
            socket.leave(roomName);
            socket.currentWarRoom = null;

            socket.to(roomName).emit("war_room_user_left", {
                userId: socket.userId,
                incidentId,
                timestamp: Date.now()
            });
        });

        // WAR ROOM: Sync 3D cursor position
        socket.on("war_room_cursor_move", (data) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                socket.to(roomName).emit("war_room_cursor_update", {
                    userId: socket.userId,
                    position: data.position,
                    color: data.color || '#60a5fa',
                    timestamp: Date.now()
                });
            }
        });

        // WAR ROOM: Sync camera position
        socket.on("war_room_camera_move", (data) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                socket.to(roomName).emit("war_room_camera_update", {
                    userId: socket.userId,
                    position: data.position,
                    target: data.target,
                    timestamp: Date.now()
                });
            }
        });

        // WAR ROOM: Create incident pin
        socket.on("war_room_create_pin", (data) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                const pin = {
                    id: `pin_${Date.now()}_${socket.userId}`,
                    userId: socket.userId,
                    position: data.position,
                    nodeId: data.nodeId,
                    message: data.message,
                    severity: data.severity || 'medium',
                    timestamp: Date.now()
                };

                // Broadcast to all in room (including sender)
                io.to(roomName).emit("war_room_pin_created", pin);
            }
        });

        // WAR ROOM: Remove incident pin
        socket.on("war_room_remove_pin", (pinId) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                io.to(roomName).emit("war_room_pin_removed", {
                    pinId,
                    userId: socket.userId,
                    timestamp: Date.now()
                });
            }
        });

        // WAR ROOM: Broadcast status update
        socket.on("war_room_status_update", (data) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                io.to(roomName).emit("war_room_status_broadcast", {
                    userId: socket.userId,
                    status: data.status,
                    message: data.message,
                    timestamp: Date.now()
                });
            }
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log(`❌ User ${socket.userId} disconnected: ${socket.id}`);

            // Leave war room if in one
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                socket.to(roomName).emit("war_room_user_left", {
                    userId: socket.userId,
                    incidentId: socket.currentWarRoom,
                    timestamp: Date.now()
                });
            }

            if (userSockets.has(socket.userId)) {
                userSockets.get(socket.userId).delete(socket.id);
                if (userSockets.get(socket.userId).size === 0) {
                    userSockets.delete(socket.userId);
                }
            }

            // Remove from all watchlist rooms
            watchlistRooms.forEach((viewers, watchlistId) => {
                if (viewers.has(socket.userId)) {
                    viewers.delete(socket.userId);
                    io.to(`watchlist:${watchlistId}`).emit("user_left", {
                        userId: socket.userId,
                        watchlistId,
                    });
                }
            });
        });
    });

    console.log("🔌 WebSocket server initialized");

    // Start analytics simulation
    startRealTimeSimulation(io);

    return io;
}

function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
}

// Emit notification to specific user
function emitToUser(userId, event, data) {
    if (userSockets.has(userId)) {
        userSockets.get(userId).forEach((socketId) => {
            io.to(socketId).emit(event, data);
        });
    }
}

// Emit to all users in a watchlist
function emitToWatchlist(watchlistId, event, data) {
    io.to(`watchlist:${watchlistId}`).emit(event, data);
}

module.exports = {
    initializeSocket,
    getIO,
    emitToUser,
    emitToWatchlist,
};
