const storage = require('../storage.js');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username } = req.body;
        
        // 1. Basic Existence Check
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            return res.status(400).json({ error: 'Username required' });
        }

        const cleanUsername = username.trim();

        // 2. Length Validation
        if (cleanUsername.length > 15) {
            return res.status(400).json({ error: 'Username too long (max 15 chars)' });
        }

        // 3. Character Validation (Alphanumeric + spaces only)
        if (!/^[a-zA-Z0-9 ]+$/.test(cleanUsername)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, and spaces' });
        }

        // 4. Reserved/Profanity Check
        const forbiddenWords = ['admin', 'root', 'system', 'moderator', 'null', 'undefined'];
        if (forbiddenWords.some(word => cleanUsername.toLowerCase().includes(word))) {
            return res.status(400).json({ error: 'Username not allowed' });
        }

        // 5. Check if username already exists
        const exists = await storage.checkUsernameExists(cleanUsername);
        if (exists) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        const sessionId = uuidv4();
        const sessionData = {
            sessionId,
            username: username.trim(),
            score: 1000,
            currentQuestion: 0,
            startTime: Date.now(),
            timeRemaining: 45 * 60,
            active: true,
            completed: false,
            eliminated: false
        };
        
        await storage.setSession(sessionId, sessionData);
        return res.json({ sessionId, sessionData });
    } catch (error) {
        console.error('Error creating session:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
