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

// ── Rounds & Question Bank ────────────────────────────────────────────────────
// Edit rounds and questions here. Each round has its own question set.
// Question numbers restart from 1 at the beginning of every round.
// Scores carry over across ALL rounds — they are only cleared on Emergency Reset.
const ROUNDS = [
  {
    name: 'Round 1',
    label: 'General Knowledge',
    questions: [
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
    ],
  },
  {
    name: 'Round 2',
    label: 'Arts & Culture',
    questions: [
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
      {
        text: 'Which instrument has 88 keys?',
        options: ['Guitar', 'Violin', 'Piano', 'Harp'],
        correctAnswerIndex: 2,
      },
    ],
  },
  {
    name: 'Round 3',
    label: 'Rapid Fire',
    questions: [
      {
        text: 'What is the largest ocean on Earth?',
        options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
        correctAnswerIndex: 3,
      },
      {
        text: 'How many sides does a hexagon have?',
        options: ['5', '6', '7', '8'],
        correctAnswerIndex: 1,
      },
      {
        text: 'Which country is home to the kangaroo?',
        options: ['New Zealand', 'South Africa', 'Australia', 'Brazil'],
        correctAnswerIndex: 2,
      },
    ],
  },
];

// ── Config safety check ───────────────────────────────────────────────────────
if (!Array.isArray(ROUNDS) || ROUNDS.length === 0) {
  throw new Error('[CONFIG] ROUNDS must be a non-empty array.');
}
ROUNDS.forEach((r, i) => {
  if (!r.name || !Array.isArray(r.questions) || r.questions.length === 0) {
    throw new Error(
      `[CONFIG] Round ${i + 1} ("${r.name}") must have at least one question.`,
    );
  }
});

// ── State Helpers ─────────────────────────────────────────────────────────────
/** Safely clamp a round index to valid range */
function clampRound(idx) {
  return Math.min(Math.max(0, idx ?? 0), ROUNDS.length - 1);
}

/** Safely clamp a question index to valid range for a given round */
function clampQuestion(roundIdx, qIdx) {
  const len = ROUNDS[roundIdx]?.questions?.length ?? 1;
  return Math.min(Math.max(0, qIdx ?? 0), len - 1);
}

function makeDefault() {
  const round = ROUNDS[0];
  return {
    gameState: 'idle',
    currentRound: 0,
    currentQuestionIndex: 0,
    currentQuestion: round.questions[0],
    currentRoundName: round.name,
    currentRoundLabel: round.label,
    activeTeam: null,
    lockedOption: null,
    scores: [0, 0, 0, 0],
    buzzerWinner: null,
    buzzerActive: false,
    totalRounds: ROUNDS.length,
    totalQuestions: round.questions.length,
  };
}

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      const saved = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
      const rIdx = clampRound(saved.currentRound);
      const qIdx = clampQuestion(rIdx, saved.currentQuestionIndex);
      const round = ROUNDS[rIdx];
      return {
        ...makeDefault(),
        ...saved,
        currentRound: rIdx,
        currentQuestionIndex: qIdx,
        currentQuestion: round.questions[qIdx],
        currentRoundName: round.name,
        currentRoundLabel: round.label,
        totalRounds: ROUNDS.length,
        totalQuestions: round.questions.length,
        // Ensure scores is always a valid 4-element number array
        scores:
          Array.isArray(saved.scores) &&
          saved.scores.length === 4 &&
          saved.scores.every((s) => typeof s === 'number')
            ? saved.scores
            : [0, 0, 0, 0],
      };
    }
  } catch (e) {
    console.error('[DB] Load failed — using defaults:', e.message);
  }
  return makeDefault();
}

function persistState() {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(gameState, null, 2));
  } catch (e) {
    console.error('[DB] Save failed:', e.message);
  }
}

// ── Live state (in-memory, persisted to disk after every mutation) ────────────
let gameState = loadState();
console.log(
  '[DB] State loaded:',
  gameState.gameState,
  '| Round:',
  `${gameState.currentRound + 1}/${gameState.totalRounds}`,
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

  // Always rebuild ALL derived fields from ROUNDS — single source of truth
  const rIdx = clampRound(gameState.currentRound);
  const round = ROUNDS[rIdx];
  const qIdx = clampQuestion(rIdx, gameState.currentQuestionIndex);

  gameState.currentRound = rIdx;
  gameState.currentQuestionIndex = qIdx;
  gameState.currentQuestion = round.questions[qIdx];
  gameState.currentRoundName = round.name;
  gameState.currentRoundLabel = round.label;
  gameState.totalRounds = ROUNDS.length;
  gameState.totalQuestions = round.questions.length;

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
    const round = ROUNDS[gameState.currentRound];
    const nextIdx = gameState.currentQuestionIndex + 1;

    // Guard: do not advance past the last question in the round
    if (nextIdx >= round.questions.length) return;

    setState({
      gameState: 'question_active',
      currentQuestionIndex: nextIdx,
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

  // ── Round Navigation ─────────────────────────────────────────────────────
  // Scores are intentionally preserved when moving between rounds.

  socket.on('nextRound', () => {
    const nextRound = gameState.currentRound + 1;
    if (nextRound >= ROUNDS.length) return; // Already on last round — ignore
    setState({
      gameState: 'idle',
      currentRound: nextRound,
      currentQuestionIndex: 0,
      activeTeam: null,
      lockedOption: null,
      buzzerWinner: null,
      buzzerActive: false,
      // scores NOT included here — they carry over
    });
    triggerSound('whoosh');
  });

  socket.on('prevRound', () => {
    const prevRound = gameState.currentRound - 1;
    if (prevRound < 0) return; // Already on first round — ignore
    setState({
      gameState: 'idle',
      currentRound: prevRound,
      currentQuestionIndex: 0,
      activeTeam: null,
      lockedOption: null,
      buzzerWinner: null,
      buzzerActive: false,
    });
    triggerSound('whoosh');
  });

  // ── Team & Option ─────────────────────────────────────────────────────────
  socket.on('highlightTeam', (teamIndex) => {
    if (typeof teamIndex !== 'number' || teamIndex < 0 || teamIndex > 3) return;
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
    if (gameState.activeTeam === null) return;
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex > 3)
      return;
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
    if (!gameState.buzzerActive || gameState.buzzerWinner !== null) return;
    if (typeof teamIndex !== 'number' || teamIndex < 0 || teamIndex > 3) return;
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
