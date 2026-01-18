// const { emitToWatchlist } = require("../socket/socket.server");

let simulationInterval = null;

/**
 * Start real-time analytics simulation
 * @param {Object} io - Socket.io instance
 */
function startRealTimeSimulation(io) {
    if (simulationInterval) return;

    console.log("🔄 Starting real-time analytics simulation...");

    simulationInterval = setInterval(() => {
        // Create simulated update based on random fluctuations
        // In a real app, this would come from actual database events or a message queue

        const timestamp = new Date();

        // Generate small random changes
        const updates = {
            stars_change: Math.floor(Math.random() * 3) - 1, // -1, 0, or 1
            followers_change: Math.random() > 0.7 ? 1 : 0,   // Occasional follower
            commits_change: Math.random() > 0.8 ? 1 : 0,     // Occasional commit
            timestamp: timestamp.toISOString()
        };

        // Only emit if there's actual activity or every few cycles to keep connection alive/interesting
        if (updates.stars_change !== 0 || updates.followers_change !== 0 || updates.commits_change !== 0 || Math.random() > 0.5) {

            io.to("analytics_watchers").emit("analytics_update", {
                type: "live_update",
                data: updates,
                timestamp: timestamp.toISOString()
            });

            // console.log("📡 Emitted analytics update", updates); 
        }

    }, 5000); // Update every 5 seconds
}

/**
 * Stop simulation
 */
function stopRealTimeSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
        console.log("⏹️ Stopped analytics simulation");
    }
}

module.exports = {
    startRealTimeSimulation,
    stopRealTimeSimulation
};
