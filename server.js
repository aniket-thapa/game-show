// server.js — Single source of truth for all game state
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'gamestate.json');

// ── Ensure persistence directory exists ──────────────────────────────────────
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── Question Bank ─────────────────────────────────────────────────────────────
// Edit questions here. They live only on the server.
const QUESTION_BANK = [
  {
    text: 'What is the capital of France?',
    options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
    correctAnswerIndex: 2,
  },
  {
    text: 'Which planet is known as the Red Planet?',
    options: ['Mars', 'Venus', 'Jupiter', 'Saturn'],
    correctAnswerIndex: 0,
  },
  {
    text: 'What does HTML stand for?',
    options: [
      'Hyper Text Markup Language',
      'High Tech Machine Learning',
      'Home Tool Markup Language',
      'Hyperlinks and Text Markup Language',
    ],
    correctAnswerIndex: 0,
  },
  {
    text: 'Who painted the Mona Lisa?',
    options: [
      'Vincent van Gogh',
      'Pablo Picasso',
      'Leonardo da Vinci',
      'Michelangelo',
    ],
    correctAnswerIndex: 2,
  },
  {
    text: 'What is 2 + 2 × 2?',
    options: ['8', '6', '4', '2'],
    correctAnswerIndex: 1,
  },
];

// ── State Helpers ─────────────────────────────────────────────────────────────
function makeDefault() {
  return {
    gameState: 'idle', // idle | question_active | team_highlighted | option_locked | revealed
    currentQuestionIndex: 0,
    currentQuestion: QUESTION_BANK[0],
    activeTeam: null,
    lockedOption: null,
    scores: [0, 0, 0, 0],
    buzzerWinner: null,
    buzzerActive: false,
    totalQuestions: QUESTION_BANK.length,
  };
}

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      const saved = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
      const idx = saved.currentQuestionIndex ?? 0;
      return {
        ...makeDefault(),
        ...saved,
        currentQuestion: QUESTION_BANK[idx] ?? QUESTION_BANK[0],
        totalQuestions: QUESTION_BANK.length,
      };
    }
  } catch (e) {
    console.error('[DB] Load failed — using defaults:', e.message);
  }
  return makeDefault();
}

function persistState() {
  try {
    // Omit derived fields that can be rebuilt on load
    const { currentQuestion, totalQuestions, ...toSave } = gameState; // eslint-disable-line
    writeFileSync(STATE_FILE, JSON.stringify(toSave, null, 2));
  } catch (e) {
    console.error('[DB] Save failed:', e.message);
  }
}

// ── Live state (in-memory, persisted to disk after every mutation) ────────────
let gameState = loadState();
console.log(
  '[DB] State loaded:',
  gameState.gameState,
  '| Scores:',
  gameState.scores,
);

// ── Express + Socket.IO setup ─────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Serve built React app in production
const distPath = path.join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res.send(
      '<h2>Run <code>npm run build</code> first, or use <code>npm run dev</code>.</h2>',
    ),
  );
}

// ── Core state mutation + broadcast ──────────────────────────────────────────
function setState(updates) {
  gameState = { ...gameState, ...updates };
  // Rebuild derived fields
  if ('currentQuestionIndex' in updates) {
    gameState.currentQuestion =
      QUESTION_BANK[gameState.currentQuestionIndex] ?? QUESTION_BANK[0];
  }
  gameState.totalQuestions = QUESTION_BANK.length;
  persistState();
  io.emit('stateUpdate', gameState);
}

function triggerSound(name) {
  // Emit separately from stateUpdate so clients play it the instant it arrives
  io.emit('playSound', name);
}

// ── Socket event handlers ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[IO] + ${socket.id}`);

  // Always send full current state on connect (covers reconnects)
  socket.emit('stateUpdate', gameState);

  // ── Question Flow ────────────────────────────────────────────────────────
  socket.on('nextQuestion', () => {
    const next = (gameState.currentQuestionIndex + 1) % QUESTION_BANK.length;
    setState({
      gameState: 'question_active',
      currentQuestionIndex: next,
      activeTeam: null,
      lockedOption: null,
      buzzerWinner: null,
      buzzerActive: false,
    });
    triggerSound('whoosh');
  });

  socket.on('showQuestion', () => {
    setState({
      gameState: 'question_active',
      activeTeam: null,
      lockedOption: null,
    });
    triggerSound('whoosh');
  });

  socket.on('setIdle', () => {
    setState({ gameState: 'idle', activeTeam: null, lockedOption: null });
  });

  socket.on('resetGame', () => {
    gameState = makeDefault();
    persistState();
    io.emit('stateUpdate', gameState);
  });

  // ── Team & Option ─────────────────────────────────────────────────────────
  socket.on('highlightTeam', (teamIndex) => {
    setState({ activeTeam: teamIndex, gameState: 'team_highlighted' });
  });

  socket.on('deselectTeam', () => {
    setState({
      activeTeam: null,
      lockedOption: null,
      gameState: 'question_active',
    });
  });

  socket.on('lockOption', (optionIndex) => {
    if (gameState.activeTeam === null) return; // Guard
    setState({ lockedOption: optionIndex, gameState: 'option_locked' });
  });

  socket.on('deselectOption', () => {
    setState({ lockedOption: null, gameState: 'team_highlighted' });
  });

  // ── Answer Reveal ─────────────────────────────────────────────────────────
  socket.on('submitAnswer', () => {
    if (gameState.activeTeam === null || gameState.lockedOption === null)
      return;
    if (gameState.gameState === 'revealed') return;

    const isCorrect =
      gameState.lockedOption === gameState.currentQuestion?.correctAnswerIndex;
    const newScores = [...gameState.scores];
    newScores[gameState.activeTeam] += isCorrect ? 10 : -10;

    setState({ gameState: 'revealed', scores: newScores });
    triggerSound(isCorrect ? 'correct' : 'wrong');
  });

  socket.on('reopenQuestion', () => {
    setState({
      gameState: 'question_active',
      activeTeam: null,
      lockedOption: null,
    });
  });

  // ── Buzzer ────────────────────────────────────────────────────────────────
  socket.on('buzz', (teamIndex) => {
    // Atomic guard — only first buzz wins
    if (!gameState.buzzerActive || gameState.buzzerWinner !== null) return;
    setState({ buzzerWinner: teamIndex, buzzerActive: false });
    triggerSound('buzzer');
  });

  socket.on('resetBuzzer', () => {
    setState({ buzzerWinner: null, buzzerActive: true });
  });

  socket.on('pauseBuzzer', () => {
    setState({ buzzerActive: false });
  });

  socket.on('disconnect', () => {
    console.log(`[IO] - ${socket.id}`);
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', async () => {
  const { networkInterfaces } = await import('os');
  const nets = networkInterfaces();
  const lanIPs = [];
  for (const list of Object.values(nets)) {
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) lanIPs.push(net.address);
    }
  }

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   🎮  Quiz Show Server  Started!     ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Local : http://localhost:${PORT}       ║`);
  for (const ip of lanIPs) {
    console.log(`║  LAN   : http://${ip}:${PORT}`.padEnd(41) + '║');
  }
  console.log('╠══════════════════════════════════════╣');
  console.log('║  /display   → Projector Screen       ║');
  console.log('║  /admin     → Admin Control Panel    ║');
  console.log('║  /buzzer/1  → Team 1 Phone Buzzer    ║');
  console.log('║  /buzzer/2  → Team 2 Phone Buzzer    ║');
  console.log('║  /buzzer/3  → Team 3 Phone Buzzer    ║');
  console.log('║  /buzzer/4  → Team 4 Phone Buzzer    ║');
  console.log('╚══════════════════════════════════════╝\n');
});
