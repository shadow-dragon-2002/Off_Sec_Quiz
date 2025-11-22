const { createClient } = require('@supabase/supabase-js');

// DO NOT COMMIT THESE VALUES TO GIT
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables not set. This will not work.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getSession(sessionId) {
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No rows found - this is expected for non-existent sessions
            return null;
        }
        console.error('Error getting session:', error);
        return null;
    }
    
    if (!data) {
        return null;
    }
    
    // Convert timestamp back to milliseconds for app compatibility
    if (data.startTime) {
        data.startTime = new Date(data.startTime).getTime();
    }
    
    return data;
}

async function setSession(sessionId, sessionData) {
    // Supabase expects column names to match exactly.
    const dataToUpsert = {
        id: sessionId,
        username: sessionData.username,
        score: sessionData.score,
        currentQuestion: sessionData.currentQuestion,
        startTime: new Date(sessionData.startTime).toISOString(),
        timeRemaining: sessionData.timeRemaining,
        active: sessionData.active,
        completed: sessionData.completed,
        eliminated: sessionData.eliminated,
        grade: sessionData.grade || null,
    };

    const { error } = await supabase
        .from('sessions')
        .upsert(dataToUpsert, { onConflict: 'id' });

    if (error) {
        console.error('Error setting session:', error);
    }
}

async function getLeaderboard() {
    const { data, error } = await supabase
        .from('leaderboard')
        .select('username, score, time_used, grade, created_at')
        .order('score', { ascending: false })
        .order('time_used', { ascending: true })
        .limit(10);

    if (error) {
        console.error('Error getting leaderboard:', error);
        return [];
    }
    
    // Map snake_case to camelCase for frontend compatibility
    return data.map(entry => ({
        username: entry.username,
        score: entry.score,
        timeUsed: entry.time_used,
        grade: entry.grade,
        timestamp: entry.created_at
    }));
}

async function setLeaderboard(entry) {
    // Map camelCase from app to snake_case in db
    const entryToInsert = {
        username: entry.username,
        score: entry.score,
        time_used: entry.timeUsed, // Correct mapping
        grade: entry.grade,
    };

    const { error } = await supabase
        .from('leaderboard')
        .insert(entryToInsert);

    if (error) {
        console.error('Error setting leaderboard:', error);
    }
}

async function getQuestion(questionId) {
    const { data, error } = await supabase
        .from('questions')
        .select('id, question, options') // Exclude correct_answer from the payload
        .eq('id', questionId)
        .single();

    if (error) {
        console.error('Error getting question:', error);
        return null;
    }
    return data;
}

async function submitAnswer(sessionId, questionId, answerIndex) {
    const { data, error } = await supabase.rpc('submit_answer', {
        p_session_id: sessionId,
        p_question_id: questionId,
        p_answer_index: answerIndex
    });

    if (error) {
        console.error('Error submitting answer via RPC:', error);
        throw error;
    }

    return data;
}

async function checkUsernameExists(username) {
    const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('username', username)
        .limit(1);

    if (error) {
        console.error('Error checking username:', error);
        return false;
    }
    
    return data && data.length > 0;
}

module.exports = {
    getSession,
    setSession,
    checkUsernameExists,
    getLeaderboard,
    setLeaderboard,
    getQuestion,
    submitAnswer,
    supabase,
};
