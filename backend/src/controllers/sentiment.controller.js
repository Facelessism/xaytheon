const sentimentService = require('../services/sentiment-analyzer.service');

exports.analyzeRepo = async (req, res) => {
    try {
        const { repo } = req.query; // Expecting "owner/repo"

        if (!repo) {
            // Default fallback for demo
            const data = await sentimentService.analyzeRepository('xaytheon', 'core');
            return res.json(data);
        }

        const [owner, repoName] = repo.split('/');
        if (!owner || !repoName) {
            return res.status(400).json({ message: 'Invalid repository format. Use owner/repo' });
        }

        const data = await sentimentService.analyzeRepository(owner, repoName);
        res.json(data);

    } catch (error) {
        console.error('Sentiment Analysis Error:', error);
        res.status(500).json({ message: 'Failed to analyze repository' });
    }
};
