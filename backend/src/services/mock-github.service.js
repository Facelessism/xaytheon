/**
 * Mock GitHub Service
 * Simulates real-time GitHub events for demonstration purposes
 */

const { emitToWatchlist, emitToUser } = require('../socket/socket.server');
const watchlistModel = require('../models/watchlist.model');
const notificationModel = require('../models/notification.model');

class MockGitHubService {
    constructor() {
        this.interval = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('🤖 Mock GitHub Service started - Simulating real-time events');

        // Generate a random event every 10-30 seconds
        this.interval = setInterval(() => {
            this.generateRandomEvent();
        }, 15000);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.isRunning = false;
        console.log('🛑 Mock GitHub Service stopped');
    }

    async generateRandomEvent() {
        try {
            // 1. Get a random watchlist to update
            const watchlists = await this.getAllWatchlists();
            if (watchlists.length === 0) return;

            const randomWatchlist = watchlists[Math.floor(Math.random() * watchlists.length)];

            // 2. Get repositories in that watchlist
            const repos = await watchlistModel.getWatchlistRepositories(randomWatchlist.id);
            if (repos.length === 0) return;

            const randomRepo = repos[Math.floor(Math.random() * repos.length)];

            // 3. Generate a random event type
            const eventType = this.getRandomEventType();

            // 4. Create event data
            const eventData = this.generateEventData(eventType, randomRepo.repo_full_name);

            // 5. Notify users
            await this.notifyUsers(randomWatchlist.id, randomWatchlist.owner_id, eventType, eventData);

            // 6. Update repo stats (simulate live updates)
            this.updateRepoStats(randomWatchlist.id, randomRepo, eventType);

            console.log(`📢 Generated ${eventType} event for ${randomRepo.repo_full_name}`);

        } catch (error) {
            console.error('Error in Mock GitHub Service:', error);
        }
    }

    // Helper: Get all watchlists (simplified for mock service)
    getAllWatchlists() {
        const db = require('../config/db');
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM watchlists', (err, rows) => {
                if (err) resolve([]);
                else resolve(rows);
            });
        });
    }

    getRandomEventType() {
        const types = ['star', 'fork', 'issue', 'pr', 'push'];
        const weights = [0.4, 0.2, 0.2, 0.1, 0.1]; // Stars are most common

        const random = Math.random();
        let sum = 0;

        for (let i = 0; i < types.length; i++) {
            sum += weights[i];
            if (random < sum) return types[i];
        }

        return 'star';
    }

    generateEventData(type, repoName) {
        const actors = ['octocat', 'satyam', 'dev-guru', 'code-wizard', 'react-fan'];
        const actor = actors[Math.floor(Math.random() * actors.length)];

        switch (type) {
            case 'star':
                return {
                    title: `New Star on ${repoName}`,
                    message: `${actor} starred ${repoName}`,
                    icon: '⭐'
                };
            case 'fork':
                return {
                    title: `New Fork of ${repoName}`,
                    message: `${actor} forked ${repoName}`,
                    icon: '🍴'
                };
            case 'issue':
                return {
                    title: `New Issue on ${repoName}`,
                    message: `${actor} opened issue #${Math.floor(Math.random() * 1000)}: "Bug in recent release"`,
                    icon: '🐞'
                };
            case 'pr':
                return {
                    title: `New PR on ${repoName}`,
                    message: `${actor} opened PR #${Math.floor(Math.random() * 1000)}: "Fix memory leak"`,
                    icon: '🔀'
                };
            case 'push':
                return {
                    title: `New Push to ${repoName}`,
                    message: `New commits pushed to main branch`,
                    icon: '📦'
                };
            default:
                return { title: 'Update', message: 'Something happened', icon: '🔔' };
        }
    }

    async notifyUsers(watchlistId, ownerId, type, data) {
        // 1. Create notification record
        await notificationModel.createNotification(
            ownerId,
            type,
            data.title,
            data.message,
            { watchlistId, ...data }
        );

        // 2. Broadcast via WebSocket
        emitToUser(ownerId, 'notification', {
            type,
            title: data.title,
            message: data.message,
            created_at: new Date().toISOString()
        });

        // 3. Also notify collaborators (omitted for brevity in mock)
    }

    updateRepoStats(watchlistId, repo, eventType) {
        // Simulate updating repo stats (e.g. increment stars)
        let repoData = repo.repo_data;
        if (typeof repoData === 'string') repoData = JSON.parse(repoData);

        if (eventType === 'star') {
            repoData.stargazers_count = (repoData.stargazers_count || 0) + 1;
        } else if (eventType === 'fork') {
            repoData.forks_count = (repoData.forks_count || 0) + 1;
        } else if (eventType === 'issue') {
            repoData.open_issues_count = (repoData.open_issues_count || 0) + 1;
        }

        // Broadcast repo update to everyone viewing this watchlist
        emitToWatchlist(watchlistId, 'repo_update', {
            watchlistId,
            repo: {
                ...repo,
                repo_data: repoData
            }
        });
    }
}

module.exports = new MockGitHubService();
