const storage = require('../../storage.js');
const { getShuffledOptions } = require('../../utils/shuffle.js');
const { supabase } = storage; // Get supabase client from storage

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Support both Vercel (req.query) and Express (req.params)
        const sessionId = req.query.sessionId || req.params.sessionId;
        const { questionIndex, answerIndex } = req.body;

        // 1. Fetch the question to reconstruct the shuffle
        const question = await storage.getQuestion(questionIndex);
        if (!question) {
             return res.status(404).json({ error: 'Question not found' });
        }

        // 2. Reconstruct the shuffle to find the original index
        const seed = `${sessionId}_${questionIndex}`;
        const { indices } = getShuffledOptions(question.options, seed);
        const originalAnswerIndex = indices[answerIndex];

        // 3. Call the RPC function with the ORIGINAL index
        const result = await storage.submitAnswer(sessionId, questionIndex, originalAnswerIndex);

        if (result.error) {
             return res.status(400).json({ error: result.error });
        }

        // Map RPC result to frontend expectation
        const responseData = {
            isCorrect: result.correct,
            // correctAnswerIndex: result.correctAnswer, // Removed to prevent cheating
            session: {
                score: result.score,
                timeRemaining: result.timeRemaining,
                currentQuestion: result.currentQuestion,
                active: !result.gameOver,
                eliminated: result.gameOver && !result.grade,
                completed: !!result.grade,
                grade: result.grade
            }
        };
        
        return res.json(responseData);

    } catch (error) {
        console.error('Error processing answer:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
