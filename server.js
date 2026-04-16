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
const TIMER_DURATION = 20000; // ms — change here to adjust question time

// ── Ensure persistence directory exists ──────────────────────────────────────
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── Rounds & Question Bank ────────────────────────────────────────────────────
const ROUNDS = [
  {
    name: 'Round 1',
    label: '',
    questions: [
      {
        text: 'What is the main gas present in the air we breathe?',
        options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'],
        correctAnswerIndex: 2,
      },
      {
        text: 'Which type of energy is stored in food?',
        options: [
          'Mechanical energy',
          'Chemical energy',
          'Electrical energy',
          'Light energy',
        ],
        correctAnswerIndex: 1,
      },
      {
        text: 'Which type of teeth are used for cutting food?',
        options: ['Molars', 'Premolars', 'Incisors', 'Canines'],
        correctAnswerIndex: 2,
      },
      {
        text: 'Which animal can fly but is not a bird?',
        options: ['Bat', 'Eagle', 'Sparrow', 'Crow'],
        correctAnswerIndex: 0,
      },
      {
        text: 'Which scale is used to measure the intensity of an earthquake?',
        options: [
          'Celsius scale',
          'Richter scale',
          'Kelvin scale',
          'Beaufort scale',
        ],
        correctAnswerIndex: 1,
      },
    ],
  },
  {
    name: 'Round 2',
    label: '',
    questions: [
      {
        text: 'How many ribs do humans have?',
        options: ['20', '22', '24', '26'],
        correctAnswerIndex: 2,
      },
      {
        text: 'Identify the picture:',
        image: '/images/barometer.png',
        options: ['Thermometer', 'Barometer', 'Hygrometer', 'Compass'],
        correctAnswerIndex: 1,
      },
      {
        text: 'Which nutrient gives us energy?',
        options: ['Vitamins', 'Minerals', 'Carbohydrates', 'Water'],
        correctAnswerIndex: 2,
      },
      {
        text: 'What is the dirtiest part of the human body?',
        options: ['Belly button (Navel)', 'Mouth', 'Nose', 'Feet'],
        correctAnswerIndex: 0,
      },
      {
        text: 'Which vitamin deficiency causes swelling of gums and loosening of teeth?',
        options: ['Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin B6'],
        correctAnswerIndex: 1,
      },
    ],
  },
  {
    name: 'Round 3',
    label: '',
    questions: [
      {
        text: 'What tool do scientists use to see cells?',
        options: ['Telescope', 'Magnifying glass', 'Microscope', 'Binoculars'],
        correctAnswerIndex: 2,
      },
      {
        text: 'Which of the following is the main product of photosynthesis?',
        options: ['Oxygen', 'Carbon dioxide', 'Glucose', 'Nitrogen'],
        correctAnswerIndex: 2,
      },
      {
        text: 'Identify the picture:',
        image: '/images/satellite.png',
        options: [
          'Space station',
          'Space shuttle',
          'Artificial satellite',
          'Rocket',
        ],
        correctAnswerIndex: 2,
      },
      {
        text: 'Which force keeps planets in orbit?',
        options: [
          'Centrifugal force',
          'Centripetal force',
          'Friction',
          'Gravity',
        ],
        correctAnswerIndex: 3,
      },
      {
        text: 'Which organ helps in filtering blood waste?',
        options: ['Heart', 'Kidney', 'Brain', 'Lungs'],
        correctAnswerIndex: 1,
      },
    ],
  },
  {
    name: 'Tie-Breaker',
    label: '',
    questions: [
      {
        text: 'What is the largest moon of Saturn called?',
        options: ['Titan', 'Rhea', 'Dione', 'lapetus'],
        correctAnswerIndex: 0,
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
function clampRound(idx) {
  return Math.min(Math.max(0, idx ?? 0), ROUNDS.length - 1);
}

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
    // ── Timer ──────────────────────────────────────────────────────────────
    timerActive: false, // Is the 20-second countdown running?
    timerStartedAt: null, // Date.now() on the server when timer began
    timerDuration: TIMER_DURATION,
    timerExpired: false, // Did the timer run out before an answer?
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
        scores:
          Array.isArray(saved.scores) &&
          saved.scores.length === 4 &&
          saved.scores.every((s) => typeof s === 'number')
            ? saved.scores
            : [0, 0, 0, 0],
        // Always keep timerDuration in sync with server constant
        timerDuration: TIMER_DURATION,
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

// ── Live state ────────────────────────────────────────────────────────────────
let gameState = loadState();
console.log(
  '[DB] State loaded:',
  gameState.gameState,
  '| Round:',
  `${gameState.currentRound + 1}/${gameState.totalRounds}`,
  '| Scores:',
  gameState.scores,
  '| Timer:',
  gameState.timerActive
    ? 'ACTIVE'
    : gameState.timerExpired
      ? 'EXPIRED'
      : 'idle',
);

// ── Server-side timer ─────────────────────────────────────────────────────────
let _serverTimer = null;

function clearServerTimer() {
  if (_serverTimer !== null) {
    clearTimeout(_serverTimer);
    _serverTimer = null;
  }
}

function startServerTimer(remainingMs = TIMER_DURATION) {
  clearServerTimer();
  if (remainingMs <= 0) {
    // Already expired — fire immediately
    if (gameState.timerActive) {
      setState({ timerActive: false, timerExpired: true });
    }
    return;
  }
  _serverTimer = setTimeout(() => {
    _serverTimer = null;
    // Only expire if still in a state where the timer should count
    // (could have been cleared by submit/deselect while the setTimeout was in flight)
    if (gameState.timerActive) {
      console.log('[TIMER] Expired — setting timerExpired');
      setState({ timerActive: false, timerExpired: true });
    }
  }, remainingMs);
}

// ── Restore in-flight timer across server restarts ────────────────────────────
(function restoreTimer() {
  if (gameState.timerActive && gameState.timerStartedAt) {
    const elapsed = Date.now() - gameState.timerStartedAt;
    const remaining = TIMER_DURATION - elapsed;
    if (remaining <= 0) {
      console.log('[TIMER] Expired during restart — marking expired');
      gameState.timerActive = false;
      gameState.timerExpired = true;
      gameState.timerStartedAt = null;
      persistState();
    } else {
      console.log(
        `[TIMER] Resuming with ${Math.ceil(remaining / 1000)}s remaining`,
      );
      startServerTimer(remaining);
    }
  }
})();

// ── Express + Socket.IO setup ─────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

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
  gameState.timerDuration = TIMER_DURATION; // always in sync

  persistState();
  io.emit('stateUpdate', gameState);
}

function triggerSound(name) {
  io.emit('playSound', name);
}

// ── Reusable: clear timer state in a setState patch ───────────────────────────
function timerResetPatch() {
  return { timerActive: false, timerExpired: false, timerStartedAt: null };
}

// ── Socket event handlers ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[IO] + ${socket.id}`);
  socket.emit('stateUpdate', gameState);

  // ── Question Flow ────────────────────────────────────────────────────────
  socket.on('nextQuestion', () => {
    const round = ROUNDS[gameState.currentRound];
    const nextIdx = gameState.currentQuestionIndex + 1;
    if (nextIdx >= round.questions.length) return;

    clearServerTimer();
    setState({
      gameState: 'question_active',
      currentQuestionIndex: nextIdx,
      activeTeam: null,
      lockedOption: null,
      buzzerWinner: null,
      buzzerActive: false,
      ...timerResetPatch(),
    });
    triggerSound('whoosh');
  });

  socket.on('showQuestion', () => {
    clearServerTimer();
    setState({
      gameState: 'question_active',
      activeTeam: null,
      lockedOption: null,
      ...timerResetPatch(),
    });
    triggerSound('whoosh');
  });

  socket.on('setIdle', () => {
    clearServerTimer();
    setState({
      gameState: 'idle',
      activeTeam: null,
      lockedOption: null,
      ...timerResetPatch(),
    });
  });

  socket.on('resetGame', () => {
    clearServerTimer();
    gameState = makeDefault();
    persistState();
    io.emit('stateUpdate', gameState);
  });

  // ── Round Navigation ─────────────────────────────────────────────────────
  socket.on('nextRound', () => {
    const nextRound = gameState.currentRound + 1;
    if (nextRound >= ROUNDS.length) return;

    clearServerTimer();
    setState({
      gameState: 'idle',
      currentRound: nextRound,
      currentQuestionIndex: 0,
      activeTeam: null,
      lockedOption: null,
      buzzerWinner: null,
      buzzerActive: false,
      ...timerResetPatch(),
    });
    triggerSound('whoosh');
  });

  socket.on('prevRound', () => {
    const prevRound = gameState.currentRound - 1;
    if (prevRound < 0) return;

    clearServerTimer();
    setState({
      gameState: 'idle',
      currentRound: prevRound,
      currentQuestionIndex: 0,
      activeTeam: null,
      lockedOption: null,
      buzzerWinner: null,
      buzzerActive: false,
      ...timerResetPatch(),
    });
    triggerSound('whoosh');
  });

  // ── Team & Option ─────────────────────────────────────────────────────────
  socket.on('highlightTeam', (teamIndex) => {
    if (typeof teamIndex !== 'number' || teamIndex < 0 || teamIndex > 3) return;
    // Guard: don't restart timer if answer already revealed for this question
    if (gameState.gameState === 'revealed') return;

    const now = Date.now();
    clearServerTimer();
    setState({
      activeTeam: teamIndex,
      gameState: 'team_highlighted',
      lockedOption: null, // clear any previously locked option for the old team
      timerActive: true,
      timerStartedAt: now,
      timerDuration: TIMER_DURATION,
      timerExpired: false,
    });
    // Fire the server-side timeout that will auto-expire after TIMER_DURATION
    startServerTimer(TIMER_DURATION);
    triggerSound('clock');
  });

  socket.on('deselectTeam', () => {
    clearServerTimer();
    setState({
      activeTeam: null,
      lockedOption: null,
      gameState: 'question_active',
      ...timerResetPatch(),
    });
  });

  socket.on('lockOption', (optionIndex) => {
    if (gameState.activeTeam === null) return;
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex > 3)
      return;
    // Allow locking even if timer expired — admin can still choose to submit
    setState({ lockedOption: optionIndex, gameState: 'option_locked' });
  });

  socket.on('deselectOption', () => {
    // If timer expired and option is deselected, stay in timerExpired state
    // so the penalize button remains visible
    setState({
      lockedOption: null,
      gameState: gameState.timerExpired
        ? 'team_highlighted'
        : 'team_highlighted',
    });
  });

  // ── Answer Reveal ─────────────────────────────────────────────────────────
  socket.on('submitAnswer', () => {
    if (gameState.activeTeam === null || gameState.lockedOption === null)
      return;
    if (gameState.gameState === 'revealed') return;

    const isCorrect =
      gameState.lockedOption === gameState.currentQuestion?.correctAnswerIndex;
    const newScores = [...gameState.scores];
    if (isCorrect) {
      newScores[gameState.activeTeam] += 10; // Correct answer
    } else {
      newScores[gameState.activeTeam] -= 2.5; // Incorrect answer
    }

    clearServerTimer();
    setState({
      gameState: 'revealed',
      scores: newScores,
      ...timerResetPatch(),
    });
    triggerSound(isCorrect ? 'correct' : 'wrong');
  });

  /**
   * penalizeNoAnswer — Admin triggered when:
   *   • Timer has expired (timerExpired === true)
   *   • A team IS active (activeTeam !== null)
   *   • No option was locked (lockedOption === null)
   *   • Answer hasn't already been revealed
   * Deducts 10 pts from the active team and marks the question as revealed.
   */
  socket.on('penalizeNoAnswer', () => {
    // Guard: all conditions must hold
    if (gameState.activeTeam === null) {
      console.warn('[penalizeNoAnswer] Rejected — no active team');
      return;
    }
    if (!gameState.timerExpired) {
      console.warn('[penalizeNoAnswer] Rejected — timer not expired');
      return;
    }
    if (gameState.gameState === 'revealed') {
      console.warn('[penalizeNoAnswer] Rejected — already revealed');
      return;
    }
    if (gameState.lockedOption !== null) {
      console.warn(
        '[penalizeNoAnswer] Rejected — option is locked, use submitAnswer',
      );
      return;
    }

    const newScores = [...gameState.scores];
    newScores[gameState.activeTeam] -= 5;
    console.log(
      `[penalizeNoAnswer] Team ${gameState.activeTeam + 1} -5 pts → ${newScores[gameState.activeTeam]}`,
    );

    clearServerTimer();
    setState({
      gameState: 'revealed',
      scores: newScores,
      lockedOption: null,
      ...timerResetPatch(),
    });
    triggerSound('wrong');
  });

  socket.on('reopenQuestion', () => {
    clearServerTimer();
    setState({
      gameState: 'question_active',
      activeTeam: null,
      lockedOption: null,
      ...timerResetPatch(),
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
