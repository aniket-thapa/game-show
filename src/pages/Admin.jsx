// src/pages/Admin.jsx
import { useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useTimerCountdown } from '../hooks/useTimerCountdown';

// ── Constants ─────────────────────────────────────────────────────────────────
const TIMER_TOTAL = 20; // seconds — keep in sync with server TIMER_DURATION/1000

export default function Admin() {
  const { state, connected, emit, onPlaySound } = useSocket();
  const audioRef = useRef({});

  // ── Timer countdown (RAF-based, derived from server timestamps) ───────────
  const { timeLeft, timeLeftMs } = useTimerCountdown(
    state.timerActive,
    state.timerStartedAt,
    state.timerDuration,
  );

  // Colour & urgency helpers
  const timerColor =
    state.timerExpired || timeLeft === 0
      ? 'text-red-400'
      : timeLeft <= 5
        ? 'text-red-400'
        : timeLeft <= 10
          ? 'text-yellow-400'
          : 'text-emerald-400';

  const timerBgColor =
    state.timerExpired || timeLeft === 0
      ? 'bg-red-500/20 border-red-500/40'
      : timeLeft <= 5
        ? 'bg-red-500/15 border-red-500/35 animate-pulse'
        : timeLeft <= 10
          ? 'bg-yellow-500/15 border-yellow-500/35'
          : 'bg-emerald-500/10 border-emerald-500/30';

  const timerBarColor =
    state.timerExpired || timeLeft === 0
      ? 'bg-red-500'
      : timeLeft <= 5
        ? 'bg-red-500'
        : timeLeft <= 10
          ? 'bg-yellow-400'
          : 'bg-emerald-500';

  const TIMER_TOTAL_MS = state.timerDuration || 20000;

  const timerBarWidth =
    state.timerExpired || timeLeft === 0
      ? '0%'
      : `${(timeLeftMs / TIMER_TOTAL_MS) * 100}%`;

  // Should the timer panel be visible?
  const showTimerPanel =
    state.timerActive ||
    state.timerExpired ||
    // Also show briefly when a team is highlighted to give admin context
    state.gameState === 'team_highlighted' ||
    state.gameState === 'option_locked';

  // Should the "Penalize — No Answer" button be shown?
  const showPenalizeBtn =
    state.timerExpired &&
    state.activeTeam !== null &&
    state.lockedOption === null &&
    state.gameState !== 'revealed';

  // ── Pre-load sounds for the admin machine ──────────────────────────────────
  useEffect(() => {
    ['buzzer', 'whoosh', 'correct', 'wrong', 'clock'].forEach((name) => {
      const a = new Audio(`/sounds/${name}.mp3`);
      a.preload = 'auto';
      audioRef.current[name] = a;
    });
  }, []);

  useEffect(() => {
    const cleanup = onPlaySound((soundName) => {
      if (soundName === 'buzzer') {
        const a = audioRef.current.buzzer;
        if (a) {
          a.currentTime = 0;
          a.play().catch(() => {});
        }
      }
    });
    return cleanup;
  }, [onPlaySound]);

  const {
    gameState: gs,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    currentRound,
    currentRoundName,
    currentRoundLabel,
    totalRounds,
    activeTeam,
    lockedOption,
    scores,
    buzzerWinner,
    buzzerActive,
  } = state;

  const isRevealed = gs === 'revealed';
  const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;
  const isLastRound = currentRound >= totalRounds - 1;
  const isFirstRound = currentRound === 0;

  const TEAM_NAMES = ['Team 1', 'Team 2', 'Team 3', 'Team 4'];
  const TEAM_COLORS = [
    'text-red-400',
    'text-sky-400',
    'text-yellow-400',
    'text-emerald-400',
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── Connection badge ──────────────────────────────────────────── */}
        <div
          className={`fixed top-4 right-4 z-50 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
            connected
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
              : 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse'
          }`}
        >
          {connected ? '🟢 Connected' : '🔴 Reconnecting…'}
        </div>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">
              Master Control Board
            </h1>
            <p className="text-slate-400 mt-1">
              Status:{' '}
              <span className="text-emerald-400 font-bold uppercase tracking-wider">
                {gs}
              </span>
            </p>
          </div>
          <button
            onClick={() => {
              if (
                confirm(
                  'Full Reset? All scores, rounds, and progress will be cleared.',
                )
              ) {
                emit('resetGame');
              }
            }}
            className="px-6 py-2 bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white rounded-lg font-bold transition-all"
          >
            Emergency Reset
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Section 1: Question Flow ──────────────────────────────── */}
          <section className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-700 pb-2 text-cyan-400">
              1. Flow Control
            </h2>

            {/* Round navigation */}
            <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">
                    Current Round
                  </div>
                  <div className="text-lg font-black text-white leading-tight">
                    {currentRoundName ?? '—'}
                  </div>
                  <div className="text-sm text-slate-400">
                    {currentRoundLabel ?? ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                    Progress
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    {Array.from({ length: totalRounds ?? 1 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-6 rounded-full transition-all ${
                          i < currentRound
                            ? 'bg-emerald-500'
                            : i === currentRound
                              ? 'bg-cyan-400'
                              : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-bold">
                    Round{' '}
                    <span className="text-white">
                      {(currentRound ?? 0) + 1}
                    </span>{' '}
                    / {totalRounds ?? 1}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 p-3">
                <button
                  onClick={() => emit('prevRound')}
                  disabled={isFirstRound}
                  className="flex-1 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Prev Round
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Advance to Round ${(currentRound ?? 0) + 2}?\n\nScores will be kept — only the question set resets.`,
                      )
                    ) {
                      emit('nextRound');
                    }
                  }}
                  disabled={isLastRound}
                  className="flex-1 py-2 text-sm bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600 text-white font-bold rounded-lg active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next Round →
                </button>
              </div>
            </div>

            {/* Current question preview */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <h3 className="text-sm text-slate-400 mb-1">
                Question{' '}
                <span className="text-white font-bold">
                  {currentQuestionIndex + 1}
                </span>{' '}
                of{' '}
                <span className="text-white font-bold">{totalQuestions}</span>
                <span className="text-slate-600 ml-2">
                  ({currentRoundName})
                </span>
              </h3>
              <p className="text-lg font-semibold mb-3 leading-snug">
                {currentQuestion?.text ?? 'Loading…'}
              </p>

              {currentQuestion?.options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 py-1 px-2 rounded-lg mb-1 text-sm ${
                    idx === currentQuestion.correctAnswerIndex
                      ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="font-mono w-5 shrink-0">
                    {['A', 'B', 'C', 'D'][idx]}
                  </span>
                  <span>{opt}</span>
                  {idx === currentQuestion.correctAnswerIndex && (
                    <span className="ml-auto text-xs">✓ Correct</span>
                  )}
                </div>
              ))}
            </div>

            {/* Flow buttons */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => emit('nextQuestion')}
                  disabled={isLastQuestion}
                  className="flex-1 py-3 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-cyan-900 disabled:to-blue-900 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLastQuestion ? '⛔ Last Question' : 'Next Question ➔'}
                </button>
                <button
                  onClick={() => emit('showQuestion')}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all"
                >
                  Show Current
                </button>
              </div>
              <button
                onClick={() => emit('setIdle')}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl active:scale-95 transition-all"
              >
                Hide Screen (Idle)
              </button>

              {isLastQuestion && !isLastRound && (
                <p className="text-xs text-center text-purple-400 font-semibold animate-pulse">
                  ✦ End of {currentRoundName} — press Next Round when ready
                </p>
              )}
              {isLastQuestion && isLastRound && (
                <p className="text-xs text-center text-amber-400 font-semibold">
                  🏁 Final question of the last round!
                </p>
              )}
            </div>
          </section>

          {/* ── Section 2: Live Action ────────────────────────────────── */}
          <section className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-700 pb-2 text-pink-400">
              2. Live Action
            </h2>

            {/* Buzzer control */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm text-slate-400 font-semibold">
                  Phone Buzzers
                </h3>
                <div
                  className={`px-3 py-1 rounded-md font-bold text-xs ${
                    buzzerActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {buzzerActive ? '🟢 RECEIVING' : '🔴 LOCKED'}
                </div>
              </div>

              {buzzerWinner !== null && (
                <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500/30 rounded-lg text-center animate-pulse">
                  <span className="text-pink-400 font-black text-lg">
                    🚨 TEAM {buzzerWinner + 1} BUZZED IN! 🚨
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => emit('resetBuzzer')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg active:scale-95 transition-all shadow-lg"
                >
                  ✅ Reset &amp; Open
                </button>
                <button
                  onClick={() => emit('pauseBuzzer')}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg active:scale-95 transition-all"
                >
                  🔒 Pause
                </button>
              </div>
            </div>

            {/* ── TIMER PANEL ─────────────────────────────────────────── */}
            {showTimerPanel && (
              <div
                className={`p-4 rounded-xl border transition-all ${timerBgColor}`}
              >
                {/* Header row */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">
                    ⏱ Question Timer
                    {activeTeam !== null && (
                      <span
                        className={`ml-2 font-black ${TEAM_COLORS[activeTeam]}`}
                      >
                        — {TEAM_NAMES[activeTeam]}
                      </span>
                    )}
                  </h3>
                  <div
                    className={`text-2xl font-black tabular-nums ${timerColor}`}
                  >
                    {state.timerExpired
                      ? "TIME'S UP"
                      : state.timerActive
                        ? `${timeLeft}s`
                        : activeTeam !== null
                          ? 'Select team to start'
                          : '—'}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-700/60 rounded-full h-3 overflow-hidden mb-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${timerBarColor}`}
                    style={{ width: timerBarWidth }}
                  />
                </div>

                {/* Info when timer expired but option IS locked */}
                {state.timerExpired &&
                  activeTeam !== null &&
                  lockedOption !== null &&
                  !isRevealed && (
                    <p className="text-xs text-center text-yellow-400 font-semibold mt-1">
                      Option locked after time — submit normally or deselect to
                      penalize instead.
                    </p>
                  )}

                {/* Hint while timer is running */}
                {state.timerActive && !state.timerExpired && (
                  <p className="text-xs text-center text-slate-400 font-semibold">
                    Timer auto-expires in {timeLeft}s. Admin clicks option then
                    "Submit".
                  </p>
                )}
              </div>
            )}

            {/* Team selection */}
            <div
              className={`transition-opacity ${isRevealed ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-sm text-slate-400 font-semibold">
                  A. Select Team
                  <span className="ml-2 text-xs text-slate-600 font-normal">
                    (starts 20s timer)
                  </span>
                </h3>
                <button
                  onClick={() => emit('deselectTeam')}
                  disabled={activeTeam === null}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-20 text-red-400 font-bold transition-all"
                >
                  ✖ Clear
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((t) => (
                  <button
                    key={t}
                    onClick={() => emit('highlightTeam', t)}
                    className={`py-3 rounded-lg font-bold transition-all ${
                      activeTeam === t
                        ? 'bg-pink-600 text-white ring-2 ring-pink-400'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    T{t + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Option selection */}
            <div
              className={`transition-opacity ${isRevealed ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-sm text-slate-400 font-semibold">
                  B. Lock Answer
                </h3>
                <button
                  onClick={() => emit('deselectOption')}
                  disabled={lockedOption === null}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-20 text-red-400 font-bold transition-all"
                >
                  ✖ Clear
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((opt) => (
                  <button
                    key={opt}
                    disabled={activeTeam === null}
                    onClick={() => emit('lockOption', opt)}
                    className={`py-3 rounded-lg font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      lockedOption === opt
                        ? 'bg-amber-500 text-black ring-2 ring-amber-300'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    {['A', 'B', 'C', 'D'][opt]}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit / post-reveal ─────────────────────────────────── */}
            <div className="pt-2 space-y-3">
              {!isRevealed ? (
                <>
                  <button
                    onClick={() => emit('submitAnswer')}
                    disabled={activeTeam === null || lockedOption === null}
                    className="w-full py-4 rounded-xl font-black bg-emerald-600 text-white text-xl shadow-lg hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    🎯 Submit &amp; Reveal
                  </button>

                  {/* Secondary penalize shortcut (no confirm dialog here) */}
                  {showPenalizeBtn && (
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Deduct 10 points from ${TEAM_NAMES[activeTeam]} for not answering in time?\n\nThis cannot be undone.`,
                          )
                        ) {
                          emit('penalizeNoAnswer');
                        }
                      }}
                      className="w-full py-2 rounded-lg font-bold text-sm bg-red-600/10 text-red-400 border border-red-600/40 hover:bg-red-600 hover:text-white transition-all"
                    >
                      ⏰ Time Expired — Deduct −10 pts
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="w-full py-4 rounded-xl font-black bg-slate-700 text-slate-400 text-xl text-center border-2 border-slate-600 border-dashed">
                    ✅ Answer Scored
                  </div>
                  <button
                    onClick={() => emit('reopenQuestion')}
                    className="w-full py-2 rounded-lg font-bold bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white border border-amber-600/50 transition-all"
                  >
                    ↺ Re-open for Other Teams
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Scoreboard summary ──────────────────────────────────────── */}
        <section className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
            <h2 className="text-xl font-bold text-yellow-400">
              📊 Live Scores
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              Scores carry over all rounds
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {scores.map((score, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl text-center border transition-all ${
                  activeTeam === i
                    ? 'border-pink-500/60 bg-pink-500/10'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div className="text-slate-400 text-sm font-semibold mb-1">
                  Team {i + 1}
                </div>
                <div
                  className={`text-3xl font-black ${
                    score < 0
                      ? 'text-red-400'
                      : score > 0
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                  }`}
                >
                  {score}
                </div>
                <div className="text-slate-600 text-xs mt-1">pts</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
