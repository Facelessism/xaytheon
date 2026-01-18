const Sentiment = require('sentiment');
const axios = require('axios');

class SentimentAnalyzerService {
    constructor() {
        this.sentiment = new Sentiment();
        this.baseUrl = 'https://api.github.com';
    }

    /**
     * Analyzes sentiment for a given repository
     * Mocking GitHub API calls for demonstration purposes to avoid rate limits and auth complexity in this demo
     */
    async analyzeRepository(owner, repo) {
        // In production: await this.fetchComments(owner, repo);
        const mockComments = this.generateMockComments(50);

        let totalScore = 0;
        let positiveCount = 0;
        let negativeCount = 0;
        const timeline = {}; // date -> average score
        const contributors = {}; // user -> { score, count }
        const heatedDiscussions = [];

        mockComments.forEach(comment => {
            const result = this.sentiment.analyze(comment.body);
            const score = result.score;

            // Aggregate Total
            totalScore += score;
            if (score > 0) positiveCount++;
            else if (score < 0) negativeCount++;

            // Timeline Data
            const date = comment.created_at.split('T')[0];
            if (!timeline[date]) timeline[date] = { total: 0, count: 0 };
            timeline[date].total += score;
            timeline[date].count++;

            // Contributor Data
            if (!contributors[comment.user]) contributors[comment.user] = { total: 0, count: 0, avatar: comment.avatar };
            contributors[comment.user].total += score;
            contributors[comment.user].count++;

            // Flag Heated Discussions (arbitrary threshold < -2)
            if (score < -2) {
                heatedDiscussions.push({
                    id: comment.id,
                    title: `Issue #${Math.floor(Math.random() * 100)}: ${comment.body.substring(0, 30)}...`,
                    score: score,
                    author: comment.user,
                    date: date,
                    preview: comment.body
                });
            }
        });

        // Process Contributor Rankings
        const rankedContributors = Object.entries(contributors).map(([user, data]) => ({
            user,
            avatar: data.avatar,
            averageScore: (data.total / data.count).toFixed(2),
            totalComments: data.count
        })).sort((a, b) => b.averageScore - a.averageScore); // Highest first

        // Process Timeline
        const processedTimeline = Object.entries(timeline)
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([date, data]) => ({
                date,
                sentiment: (data.total / data.count).toFixed(2)
            }));

        return {
            repo: `${owner}/${repo}`,
            overview: {
                totalComments: mockComments.length,
                averageSentiment: (totalScore / mockComments.length).toFixed(2),
                positiveRatio: Math.round((positiveCount / mockComments.length) * 100),
                negativeRatio: Math.round((negativeCount / mockComments.length) * 100)
            },
            timeline: processedTimeline,
            topContributors: rankedContributors.slice(0, 5),
            heatedDiscussions: heatedDiscussions.slice(0, 5)
        };
    }

    generateMockComments(count) {
        const users = ['alice', 'bob', 'charlie', 'dave', 'eve'];
        const texts = [
            "Great work on this feature! I really love the implementation.",
            "This looks good to me. Merging now.",
            "I'm encountering a bug here. It crashes when I click the button.",
            "This code is terrible. Why did you do it this way? It breaks everything.",
            "Thanks for the fix, works perfectly.",
            "Could you please explain this logic? It's a bit confusing.",
            "I hate this new UI. It's so hard to use.",
            "Amazing job team! This release is huge.",
            "Documentation is missing. Please add it.",
            "Worst update ever. Performance is degraded significantly."
        ];

        const comments = [];
        const today = new Date();

        for (let i = 0; i < count; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - Math.floor(Math.random() * 30)); // 30 days back

            comments.push({
                id: i,
                body: texts[Math.floor(Math.random() * texts.length)],
                user: users[Math.floor(Math.random() * users.length)],
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${users[Math.floor(Math.random() * users.length)]}`,
                created_at: date.toISOString()
            });
        }
        return comments;
    }
}

module.exports = new SentimentAnalyzerService();
