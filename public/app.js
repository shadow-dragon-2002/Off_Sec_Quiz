// API Configuration
const API_URL = '/api';

// Global state
let sessionId = null;
let currentSession = null;
let timerInterval = null;
let audio = null;
let bgSystem = null;

// Settings Manager
const Settings = {
    audio: true,
    crt: true,
    motion: true,
    
    load() {
        const saved = localStorage.getItem('cyberquiz_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.audio = parsed.audio;
            this.crt = parsed.crt;
            this.motion = parsed.motion;
        }
        this.apply();
    },
    
    save() {
        localStorage.setItem('cyberquiz_settings', JSON.stringify({
            audio: this.audio,
            crt: this.crt,
            motion: this.motion
        }));
        this.apply();
    },
    
    apply() {
        // Apply Audio
        if (audio) audio.enabled = this.audio;
        
        // Apply CRT
        const crtOverlay = document.getElementById('crtOverlay');
        if (crtOverlay) crtOverlay.style.display = this.crt ? 'block' : 'none';
        
        // Apply Motion
        if (bgSystem) bgSystem.enabled = this.motion;
        
        // Update UI Buttons
        document.getElementById('toggleAudio').textContent = this.audio ? 'ON' : 'OFF';
        document.getElementById('toggleAudio').classList.toggle('active', this.audio);
        
        document.getElementById('toggleCrt').textContent = this.crt ? 'ON' : 'OFF';
        document.getElementById('toggleCrt').classList.toggle('active', this.crt);
        
        document.getElementById('toggleMotion').textContent = this.motion ? 'ON' : 'OFF';
        document.getElementById('toggleMotion').classList.toggle('active', this.motion);
    }
};

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Format time (seconds to MM:SS)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Animate Value Function
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}

// Custom Alert Function
function showSystemAlert(message) {
    const modal = document.getElementById('customModal');
    const msgEl = document.getElementById('modalMessage');
    const btn = document.getElementById('modalBtn');
    
    msgEl.textContent = message;
    modal.classList.add('active');
    
    return new Promise(resolve => {
        const close = () => {
            modal.classList.remove('active');
            btn.removeEventListener('click', close);
            resolve();
        };
        btn.addEventListener('click', close);
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Audio
    audio = new AudioController();
    
    // Initialize Particle System
    bgSystem = new CyberBackground();

    // Initialize Settings
    Settings.load();
    
    // Settings UI Handlers
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });
    
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });
    
    document.getElementById('toggleAudio').addEventListener('click', () => {
        Settings.audio = !Settings.audio;
        Settings.save();
    });
    
    document.getElementById('toggleCrt').addEventListener('click', () => {
        Settings.crt = !Settings.crt;
        Settings.save();
    });
    
    document.getElementById('toggleMotion').addEventListener('click', () => {
        Settings.motion = !Settings.motion;
        Settings.save();
    });

    // Initialize Text Scramble
    const title = document.querySelector('.glitch-title');
    if (title) {
        const fx = new TextScramble(title);
        // Small delay to ensure fonts are loaded
        setTimeout(() => {
            fx.setText('CYBERQUIZ');
        }, 500);
    }

    // Initialize Audio
    audio = new AudioController();
    
    document.addEventListener('click', () => {
        if (audio.ctx.state === 'suspended') {
            audio.ctx.resume();
        }
    }, { once: true });

    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('option-btn')) {
            audio.playClick();
        }
    });
    
    document.addEventListener('mouseover', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('option-btn')) {
            audio.playHover();
        }
    });

    // Initialize Progress Bar
    const progressContainer = document.getElementById('progressBar');
    if (progressContainer) {
        for (let i = 0; i < 60; i++) {
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            progressContainer.appendChild(segment);
        }
    }

    // Leaderboard button handlers
    const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
    const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
    const leaderboardModal = document.getElementById('leaderboardModal');
    
    if (viewLeaderboardBtn) {
        viewLeaderboardBtn.addEventListener('click', async () => {
            leaderboardModal.classList.add('active');
            await loadLeaderboardToModal();
        });
    }
    
    if (closeLeaderboardBtn) {
        closeLeaderboardBtn.addEventListener('click', () => {
            leaderboardModal.classList.remove('active');
        });
    }

    // Check if quiz is already completed on this device
    if (localStorage.getItem('quiz_completed') === 'true') {
        showScreen('welcomeScreen');
        const authContainer = document.getElementById('authContainer');
        const resumeContainer = document.getElementById('resumeContainer');
        
        if (resumeContainer) resumeContainer.style.display = 'none';
        
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="terminal-box" style="text-align: center; border-color: var(--neon-cyan); margin-top: 20px;">
                    <p class="terminal-text" style="color: var(--neon-cyan); font-size: 1.2rem; margin-bottom: 10px;">MISSION STATUS: COMPLETED</p>
                    <p class="terminal-text" style="margin-bottom: 20px;">You have already completed this challenge on this device.</p>
                    <button id="viewLeaderboardOnlyBtn" class="cyber-btn">VIEW LEADERBOARD</button>
                </div>
            `;
            
            document.getElementById('viewLeaderboardOnlyBtn').addEventListener('click', async () => {
                const leaderboardModal = document.getElementById('leaderboardModal');
                leaderboardModal.classList.add('active');
                await loadLeaderboardToModal();
            });
        }
    } else {
        // Check for existing session
        const storedSessionId = localStorage.getItem('quizSessionId');
        if (storedSessionId) {
            sessionId = storedSessionId;
            checkSessionStatus();
        } else {
            showScreen('welcomeScreen');
        }
    }
    
    // Resume/Reset handlers
    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            resumeSession();
        });
    }
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            localStorage.removeItem('quizSessionId');
            sessionId = null;
            document.getElementById('resumeContainer').style.display = 'none';
            document.getElementById('authContainer').style.display = 'block';
            document.getElementById('usernameInput').value = '';
        });
    }

    // Start button
    document.getElementById('startBtn').addEventListener('click', startQuiz);
    
    // Username input enter key
    document.getElementById('usernameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startQuiz();
        }
    });
});

// Check session status without auto-resuming
async function checkSessionStatus() {
    try {
        const response = await fetch(`${API_URL}/session/${sessionId}`);
        if (response.ok) {
            const session = await response.json();
            if (session.active) {
                // Show resume UI
                showScreen('welcomeScreen');
                const authContainer = document.getElementById('authContainer');
                const resumeContainer = document.getElementById('resumeContainer');
                const resumeName = document.getElementById('resumeName');
                
                if (authContainer && resumeContainer && resumeName) {
                    authContainer.style.display = 'none';
                    resumeContainer.style.display = 'block';
                    resumeName.textContent = session.username;
                }
            } else {
                // Session expired or finished
                localStorage.removeItem('quizSessionId');
                showScreen('welcomeScreen');
            }
        } else {
            localStorage.removeItem('quizSessionId');
            showScreen('welcomeScreen');
        }
    } catch (e) {
        console.error('Session check failed:', e);
        showScreen('welcomeScreen');
    }
}

// Start new quiz
async function startQuiz() {
    const username = document.getElementById('usernameInput').value.trim();
    
    if (!username) {
        await showSystemAlert('⚠ ERROR: HACKER ALIAS REQUIRED');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/session/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            sessionId = data.sessionId;
            currentSession = data.sessionData;
            localStorage.setItem('quizSessionId', sessionId);
            startQuizSession();
        } else {
            await showSystemAlert('ERROR: ' + data.error);
        }
    } catch (error) {
        await showSystemAlert('CONNECTION ERROR: Unable to establish link to server');
        console.error(error);
    }
}

// Resume existing session
async function resumeSession() {
    try {
        console.log('Attempting to resume session:', sessionId);
        const response = await fetch(`${API_URL}/session/${sessionId}`);
        const session = await response.json();
        
        console.log('Resume response:', { ok: response.ok, status: response.status, session });
        
        if (response.ok) {
            currentSession = session;
            
            if (!session.active) {
                if (session.completed) {
                    showCompletionScreen(session.grade);
                } else if (session.eliminated) {
                    if (session.timeRemaining === 0) {
                        showTimeoutScreen();
                    } else {
                        showGameOverScreen();
                    }
                }
            } else {
                console.log('Starting quiz session with current question:', session.currentQuestion);
                startQuizSession();
            }
        } else {
            // Session not found, start fresh
            console.log('Session not found, clearing localStorage');
            localStorage.removeItem('quizSessionId');
            sessionId = null;
            showScreen('welcomeScreen');
        }
    } catch (error) {
        console.error('Error resuming session:', error);
        localStorage.removeItem('quizSessionId');
        sessionId = null;
        showScreen('welcomeScreen');
    }
}

// Start quiz session
async function startQuizSession() {
    document.getElementById('playerName').textContent = currentSession.username;
    updateUI();
    await loadQuestion(); // Make this async
    startTimer();
    showScreen('quizScreen');
}

// Update UI elements
function updateUI() {
    const scoreElement = document.getElementById('score');
    const currentScore = parseInt(scoreElement.textContent) || 0;
    const targetScore = currentSession.score;
    
    if (currentScore !== targetScore) {
        animateValue(scoreElement, currentScore, targetScore, 1000);
        
        // Visual feedback for score change
        if (targetScore > currentScore) {
            scoreElement.style.textShadow = "0 0 20px #00ff88";
            setTimeout(() => scoreElement.style.textShadow = "", 1000);
        } else {
            scoreElement.style.textShadow = "0 0 20px #ff4757";
            setTimeout(() => scoreElement.style.textShadow = "", 1000);
        }
    }

    document.getElementById('progress').textContent = `${currentSession.currentQuestion}/60`;
    document.getElementById('timer').textContent = formatTime(currentSession.timeRemaining);
    
    // Update Progress Bar
    const segments = document.querySelectorAll('.progress-segment');
    segments.forEach((seg, idx) => {
        if (idx < currentSession.currentQuestion) {
            seg.classList.add('active');
        } else {
            seg.classList.remove('active');
        }
    });

    // Color code score
    if (currentSession.score >= 1000) {
        scoreElement.style.color = '#0ff';
    } else if (currentSession.score >= 500) {
        scoreElement.style.color = '#ff0';
    } else if (currentSession.score >= 200) {
        scoreElement.style.color = '#f80';
    } else {
        scoreElement.style.color = '#f00';
    }
}

// Timer
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(async () => {
        if (currentSession.timeRemaining > 0) {
            currentSession.timeRemaining--;
            document.getElementById('timer').textContent = formatTime(currentSession.timeRemaining);
            
            // Warning colors
            const timerElement = document.getElementById('timer');
            if (currentSession.timeRemaining <= 60) {
                timerElement.style.color = '#f00';
                timerElement.style.animation = 'pulse 0.5s infinite';
            } else if (currentSession.timeRemaining <= 300) {
                timerElement.style.color = '#ff0';
            }
            
            if (currentSession.timeRemaining === 0) {
                clearInterval(timerInterval);
                await checkSession();
            }
        }
    }, 1000);
}

// Check session status
async function checkSession() {
    try {
        const response = await fetch(`${API_URL}/session/${sessionId}`);
        const session = await response.json();
        
        if (response.ok) {
            currentSession = session;
            
            if (!session.active) {
                clearInterval(timerInterval);
                
                if (session.timeRemaining === 0) {
                    showTimeoutScreen();
                } else if (session.eliminated) {
                    showGameOverScreen();
                } else if (session.completed) {
                    showCompletionScreen(session.grade);
                }
            }
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

// Load question
async function loadQuestion() {
    try {
        const response = await fetch(`${API_URL}/session/${sessionId}/question`);
        if (!response.ok) {
            // This might happen if the quiz is completed
            const errorData = await response.json();
            if (currentSession.completed) {
                showCompletionScreen(currentSession.grade);
            } else {
                console.error('Failed to load question:', errorData.error);
                await showSystemAlert('Error loading next question. Please refresh.');
            }
            return;
        }

        const q = await response.json();
        
        document.getElementById('questionNum').textContent = q.id + 1;
        
        // Typing Effect
        const questionEl = document.getElementById('question');
        questionEl.textContent = '';
        const text = q.question;
        let i = 0;
        
        // Clear any existing typing interval
        if (window.typingInterval) clearInterval(window.typingInterval);
        
        window.typingInterval = setInterval(() => {
            if (i < text.length) {
                questionEl.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(window.typingInterval);
            }
        }, 20); // Speed of typing

        document.getElementById('feedback').textContent = '';
        
        const optionsContainer = document.getElementById('options');
        optionsContainer.innerHTML = '';
        
        q.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
            button.onclick = () => submitAnswer(q.id, index);
            optionsContainer.appendChild(button);
        });

    } catch (error) {
        console.error('Fatal error loading question:', error);
        await showSystemAlert('CONNECTION ERROR: Could not load the next question.');
    }
}

// Submit answer
async function submitAnswer(questionIndex, selectedIndex) {
    console.log('Submitting answer:', { questionIndex, selectedIndex });
    
    // Disable all buttons
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
    });
    
    const buttons = document.querySelectorAll('.option-btn');
    buttons[selectedIndex].classList.add('selected');
    document.getElementById('feedback').innerHTML = '<span>PROCESSING...</span>';
    
    try {
        const response = await fetch(`${API_URL}/session/${sessionId}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionIndex, answerIndex: selectedIndex })
        });
        
        const data = await response.json();
        
        console.log('Answer response:', { ok: response.ok, status: response.status, data });

        buttons.forEach(btn => btn.classList.remove('selected'));
        
        const feedbackEl = document.getElementById('feedback');
        
        if (data.isCorrect) {
            buttons[selectedIndex].classList.add('correct');
            if (audio) audio.playSuccess();
            feedbackEl.innerHTML = `
                <div class="feedback-box success-box">
                    <div class="feedback-icon">✓</div>
                    <div class="feedback-content">
                        <div class="feedback-title">ACCESS GRANTED</div>
                        <div class="feedback-sub">+50 CREDITS ADDED</div>
                    </div>
                </div>`;
        } else {
            buttons[selectedIndex].classList.add('wrong');
            if (audio) audio.playError();
            feedbackEl.innerHTML = `
                <div class="feedback-box danger-box">
                    <div class="feedback-icon">⚠</div>
                    <div class="feedback-content">
                        <div class="feedback-title">ACCESS DENIED</div>
                        <div class="feedback-sub">SECURITY PROTOCOL: -50 CREDITS</div>
                    </div>
                </div>`;
        }
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
            const box = feedbackEl.querySelector('.feedback-box');
            if (box) {
                box.classList.add('hiding');
                setTimeout(() => {
                    feedbackEl.innerHTML = '';
                }, 400);
            }
        }, 5000);
        
        if (response.ok) {
            currentSession = data.session;
            updateUI();
            
            if (currentSession.eliminated) {
                clearInterval(timerInterval);
                setTimeout(() => showGameOverScreen(), 2000);
            } else if (currentSession.completed) {
                clearInterval(timerInterval);
                setTimeout(() => showCompletionScreen(currentSession.grade), 2000);
            } else {
                setTimeout(() => {
                    loadQuestion();
                }, 1500);
            }
        } else {
            await showSystemAlert('ERROR: ' + data.error);
            document.querySelectorAll('.option-btn').forEach(btn => { btn.disabled = false; });
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        await showSystemAlert('CONNECTION ERROR: Unable to submit answer');
        document.querySelectorAll('.option-btn').forEach(btn => { btn.disabled = false; });
    }
}

// Show game over screen
function showGameOverScreen() {
    document.getElementById('goPlayerName').textContent = currentSession.username;
    document.getElementById('goProgress').textContent = currentSession.currentQuestion;
    const timeUsed = (45 * 60) - currentSession.timeRemaining;
    document.getElementById('goTime').textContent = formatTime(timeUsed);
    showScreen('gameOverScreen');
    localStorage.removeItem('quizSessionId');
    localStorage.setItem('quiz_completed', 'true');
}

// Show timeout screen
function showTimeoutScreen() {
    document.getElementById('toPlayerName').textContent = currentSession.username;
    document.getElementById('toProgress').textContent = currentSession.currentQuestion;
    document.getElementById('toScore').textContent = currentSession.score;
    showScreen('timeoutScreen');
    localStorage.removeItem('quizSessionId');
    localStorage.setItem('quiz_completed', 'true');
}

// Show completion screen
async function showCompletionScreen(grade) {
    const timeUsed = (45 * 60) - currentSession.timeRemaining;
    
    document.getElementById('compPlayerName').textContent = currentSession.username;
    document.getElementById('finalScore').textContent = currentSession.score;
    document.getElementById('timeTaken').textContent = formatTime(timeUsed);
    document.getElementById('finalGrade').textContent = grade || 'CALCULATING...';
    
    // Load leaderboard
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        const leaderboard = await response.json();
        
        const leaderboardContainer = document.getElementById('leaderboard');
        leaderboardContainer.innerHTML = '';
        
        if (leaderboard.length === 0) {
            leaderboardContainer.innerHTML = '<p class="terminal-text">NO RECORDS FOUND</p>';
        } else {
            const table = document.createElement('table');
            table.className = 'leaderboard-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>RANK</th>
                        <th>OPERATIVE</th>
                        <th>CREDITS</th>
                        <th>TIME</th>
                        <th>GRADE</th>
                    </tr>
                </thead>
                <tbody>
                    ${leaderboard.map((entry, index) => `
                        <tr class="${entry.username === currentSession.username ? 'highlight' : ''}">
                            <td>${index + 1}</td>
                            <td>${entry.username}</td>
                            <td>${entry.score}</td>
                            <td>${formatTime(entry.timeUsed)}</td>
                            <td><span class="grade-badge">${entry.grade}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            leaderboardContainer.appendChild(table);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
    
    showScreen('completionScreen');
    localStorage.removeItem('quizSessionId');
    localStorage.setItem('quiz_completed', 'true');
}

// Load leaderboard to modal
async function loadLeaderboardToModal() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        const leaderboard = await response.json();
        
        const leaderboardContainer = document.getElementById('leaderboardContent');
        leaderboardContainer.innerHTML = '';
        
        if (leaderboard.length === 0) {
            leaderboardContainer.innerHTML = '<p class="terminal-text" style="text-align: center; padding: 20px; color: var(--text-dim);">No records yet. Be the first!</p>';
        } else {
            const table = document.createElement('table');
            table.className = 'leaderboard-table';
            
            const getRankDisplay = (index) => {
                if (index === 0) return '<span class="rank-icon rank-1">🥇</span>';
                if (index === 1) return '<span class="rank-icon rank-2">🥈</span>';
                if (index === 2) return '<span class="rank-icon rank-3">🥉</span>';
                return `<span class="rank-text">#${index + 1}</span>`;
            };

            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="text-align: center;">RANK</th>
                        <th style="text-align: left;">OPERATIVE</th>
                        <th style="text-align: right;">SCORE</th>
                        <th style="text-align: right;">TIME</th>
                        <th style="text-align: center;">GRADE</th>
                    </tr>
                </thead>
                <tbody>
                    ${leaderboard.map((entry, index) => `
                        <tr class="${index < 3 ? 'top-rank' : ''}">
                            <td style="text-align: center;">${getRankDisplay(index)}</td>
                            <td style="color: ${index === 0 ? 'var(--neon-cyan)' : 'inherit'}; font-weight: ${index === 0 ? '700' : '400'}; font-size: 1.1rem;">${entry.username}</td>
                            <td style="text-align: right; font-family: var(--font-mono); font-size: 1.1rem; letter-spacing: 1px;">${entry.score}</td>
                            <td style="text-align: right; color: var(--text-dim); font-family: var(--font-mono);">${formatTime(entry.timeUsed)}</td>
                            <td style="text-align: center;"><span class="rank-grade grade-${entry.grade.charAt(0)}">${entry.grade}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            leaderboardContainer.appendChild(table);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        const leaderboardContainer = document.getElementById('leaderboardContent');
        leaderboardContainer.innerHTML = '<p class="terminal-text" style="text-align: center; padding: 20px; color: var(--danger);">Error loading leaderboard</p>';
    }
}

// Prevent accidental navigation
window.addEventListener('beforeunload', (e) => {
    if (sessionId && currentSession && currentSession.active) {
        e.preventDefault();
        e.returnValue = 'Your quiz progress will be saved but the timer continues. Are you sure?';
    }
});

/* Advanced Cyber Background System */
class CyberBackground {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.mode = 'MAP'; // 'MAP' or 'TERMINAL'
        this.lastModeSwitch = Date.now();
        this.modeDuration = 15000; // Switch every 15 seconds
        this.enabled = true;
        
        // Map Mode Data
        this.nodes = [];
        this.packets = [];
        this.mapLines = [];
        
        // Terminal Mode Data
        this.columns = [];
        this.fontSize = 14;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.initMap();
        this.initTerminal();
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initMap(); // Re-init map on resize
        this.initTerminal(); // Re-init terminal cols
    }
    
    // --- MAP MODE ---
    initMap() {
        this.nodes = [];
        this.packets = [];
        
        // Mobile Optimization: Reduce node count on small screens
        const isMobile = window.innerWidth < 768;
        // Adjusted density for mobile to ensure it's not too empty but still performant
        const density = isMobile ? 25000 : 15000;
        
        const nodeCount = Math.floor((this.canvas.width * this.canvas.height) / density);
        
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: 0.3 + (Math.random() - 0.5) * 0.2, // Drift right
                vy: 0.1 + (Math.random() - 0.5) * 0.2, // Drift down slightly
                size: Math.random() * 2 + 1.5
            });
        }
    }
    
    drawMap() {
        this.ctx.fillStyle = 'rgba(0, 243, 255, 0.5)';
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Update and Draw Nodes
        this.nodes.forEach((node, i) => {
            // Move only if enabled
            if (this.enabled) {
                node.x += node.vx;
                node.y += node.vy;
                
                // Wrap
                if (node.x > this.canvas.width) node.x = 0;
                if (node.x < 0) node.x = this.canvas.width;
                if (node.y > this.canvas.height) node.y = 0;
                if (node.y < 0) node.y = this.canvas.height;
            }
            
            // Draw Node
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Dynamic Connections
            for (let j = i + 1; j < this.nodes.length; j++) {
                const other = this.nodes[j];
                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 150) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(node.x, node.y);
                    this.ctx.lineTo(other.x, other.y);
                    // Fade out based on distance
                    this.ctx.strokeStyle = `rgba(0, 243, 255, ${0.15 * (1 - dist/150)})`;
                    this.ctx.stroke();
                    
                    // Randomly spawn packet on this active connection
                    if (this.enabled && Math.random() < 0.0005) {
                        this.packets.push({
                            x: node.x,
                            y: node.y,
                            tx: other.x,
                            ty: other.y,
                            progress: 0,
                            speed: 0.02 + Math.random() * 0.02
                        });
                    }
                }
            }
        });
        
        // Draw Packets
        this.ctx.fillStyle = '#fff';
        for (let i = this.packets.length - 1; i >= 0; i--) {
            const p = this.packets[i];
            if (this.enabled) p.progress += p.speed;
            
            const curX = p.x + (p.tx - p.x) * p.progress;
            const curY = p.y + (p.ty - p.y) * p.progress;
            
            this.ctx.beginPath();
            this.ctx.arc(curX, curY, 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            if (p.progress >= 1) {
                this.packets.splice(i, 1);
            }
        }
    }

    // --- TERMINAL MODE ---
    initTerminal() {
        this.columns = [];
        // Larger font on mobile = fewer columns = better performance
        this.fontSize = window.innerWidth < 768 ? 18 : 14;
        const colCount = Math.floor(this.canvas.width / this.fontSize);
        for (let i = 0; i < colCount; i++) {
            this.columns[i] = Math.random() * this.canvas.height; // Random start Y
        }
    }
    
    drawTerminal() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#0F0'; // Matrix Green
        this.ctx.font = `${this.fontSize}px monospace`;
        
        const chars = '0123456789ABCDEF';
        
        for (let i = 0; i < this.columns.length; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            const x = i * this.fontSize;
            const y = this.columns[i] * this.fontSize;
            
            // Draw character
            this.ctx.fillStyle = Math.random() > 0.95 ? '#FFF' : '#00F3FF'; // Cyan/White mix
            this.ctx.fillText(char, x, y);
            
            // Move down
            if (y > this.canvas.height && Math.random() > 0.975) {
                this.columns[i] = 0;
            }
            this.columns[i]++;
        }
    }
    
    animate() {
        // Mode Switching Logic
        if (Date.now() - this.lastModeSwitch > this.modeDuration) {
            this.mode = this.mode === 'MAP' ? 'TERMINAL' : 'MAP';
            this.lastModeSwitch = Date.now();
            
            // Transition effect (clear screen)
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        if (this.mode === 'MAP') {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear for map
            this.drawMap();
        } else {
            this.drawTerminal(); // Don't clear fully for trail effect
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

/* Text Decryption Effect */
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }
    
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];
        
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }
        
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }
    
    update() {
        let output = '';
        let complete = 0;
        
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }
        
        this.el.innerHTML = output;
        
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
    
    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

/* Audio Controller (Synthetic Sounds) */
class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }
    
    playTone(freq, type, duration) {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
    
    playClick() {
        this.playTone(1200, 'sine', 0.1);
    }
    
    playHover() {
        this.playTone(800, 'sine', 0.05);
    }
    
    playSuccess() {
        this.playTone(800, 'square', 0.1);
        setTimeout(() => this.playTone(1200, 'square', 0.1), 100);
    }
    
    playError() {
        this.playTone(300, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.2), 100);
    }
}
