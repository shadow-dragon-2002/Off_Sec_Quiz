// api/session/[sessionId].js
const storage = require('../storage.js');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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
        
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
        session.timeRemaining = Math.max(0, (45 * 60) - elapsed);
        
        if (session.timeRemaining === 0 && session.active) {
            session.active = false;
            session.eliminated = true;
            await storage.setSession(sessionId, session);
        }
        
        return res.json(session);
    } catch (error) {
        console.error('Error getting session:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
