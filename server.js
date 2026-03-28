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
        text: 'What is the comparative form of "happy"?',
        options: ['happier', 'happiest', 'more happy', 'happy'],
        correctAnswerIndex: 0,
      },
      {
        text: 'Which word is an adjective?',
        options: ['Run', 'Beautiful', 'Jump', 'Eat'],
        correctAnswerIndex: 1,
      },
      {
        text: 'Which word is the antonym of "Ancient"?',
        options: ['Old', 'Historic', 'Modern', 'Past'],
        correctAnswerIndex: 2,
      },
      {
        text: 'What is the correct pronunciation?',
        image: '/images/vegetables.png',
        options: ['Ve-ge-table', 'Veg-e-ta-ble', 'Ve-j-ta-ble', 'Ve-ge-ta-bal'],
        correctAnswerIndex: 1,
      },
      {
        text: 'What is the meaning of "fragile"?',
        options: ['Very strong', 'Easily broken', 'Very heavy', 'Very old'],
        correctAnswerIndex: 1,
      },
    ],
  },
  {
    name: 'Round 2',
    label: '',
    questions: [
      {
        text: 'What is the correct spelling?',
        options: ['Seperate', 'Separate', 'Seprete', 'Seperete'],
        correctAnswerIndex: 1,
      },
      {
        text: 'Which option shows a noun?',
        options: ['Run', 'Beautiful', 'Teacher', 'Quickly'],
        correctAnswerIndex: 2,
      },
      {
        text: 'Choose the correct sentence:',
        options: [
          'I did not went to the mall yesterday',
          'I did not go to the mall yesterday',
          'I did not going to the mall yesterday',
          'I did not goed to the mall',
        ],
        correctAnswerIndex: 1,
      },
      {
        text: 'She came up with _____ unique solution to the problem.',
        options: ['an', 'a', 'the', 'no article'],
        correctAnswerIndex: 1,
      },
      {
        text: 'Which sentence is correct?',
        options: [
          'I enjoy to watch cartoon',
          'I enjoy watching cartoon',
          'I enjoy watch cartoon',
          'I enjoy in watching cartoon',
        ],
        correctAnswerIndex: 1,
      },
    ],
  },
  {
    name: 'Round 3',
    label: '',
    questions: [
      {
        text: 'A group of fish is called:',
        image: '/images/fishes.png',
        options: ['Pack', 'Swarm', 'School', 'Herd'],
        correctAnswerIndex: 2,
      },
      {
        text: 'I have been working in this company _____ 5 years.',
        options: ['since', 'for', 'from', 'at'],
        correctAnswerIndex: 1,
      },
      {
        text: 'What is the best practice during public speaking?',
        options: [
          'Avoid eye contact with the audience',
          'Speak very fast to finish quickly',
          'Use pauses and maintain eye contact',
          'Read everything directly from paper',
        ],
        correctAnswerIndex: 2,
      },
      {
        text: 'The bird is _____ at the seeds.',
        image: '/images/bird.png',
        options: ['Biting', 'Pecking', 'Eating', 'Nibbling'],
        correctAnswerIndex: 1,
      },
      {
        text: 'What is the plural of "person"?',
        options: ['Persons', 'Peoples', 'People', 'Persones'],
        correctAnswerIndex: 2,
      },
    ],
  },
  {
    name: 'Tie-Breakers',
    label: '',
    questions: [
      {
        text: 'What does the word "cuisine" mean?',
        options: [
          'A kitchen tool',
          'A style of cooking',
          'A type of food item',
          'A meal time',
        ],
        correctAnswerIndex: 1,
      },
      {
        text: 'Choose the sentence with the correct grammar and usage:',
        options: [
          'Neither of the boys have completed their homework.',
          'Neither of the boys has completed his homework.',
          'Neither of the boys have completed his homework.',
          'Neither of the boys has completed their homework.',
        ],
        correctAnswerIndex: 1,
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
    newScores[gameState.activeTeam] += isCorrect ? 10 : -5;

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
