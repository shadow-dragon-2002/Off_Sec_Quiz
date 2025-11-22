const storage = require('../../storage.js');
const { getShuffledOptions } = require('../../utils/shuffle.js');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Support both Vercel (req.query) and Express (req.params)
        const sessionId = req.query.sessionId || req.params.sessionId;
        const session = await storage.getSession(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (!session.active) {
            return res.status(400).json({ error: 'Session is not active' });
        }

        const question = await storage.getQuestion(session.currentQuestion);

        if (!question) {
            // This could mean the quiz is over.
            return res.status(404).json({ error: 'Question not found or quiz complete' });
        }

        // Shuffle options deterministically based on session and question ID
        const seed = `${sessionId}_${question.id}`;
        const { options } = getShuffledOptions(question.options, seed);
        question.options = options;

        return res.json(question);
    } catch (error) {
        console.error('Error getting question:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
