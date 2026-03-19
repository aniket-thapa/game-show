import { useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useBuzzer } from '../hooks/useBuzzer';

export default function Admin() {
  const { state, updateState, resetState, nextQuestion } = useGameState();
  const { buzzerWinner, buzzerActive, resetBuzzer, pauseBuzzer } = useBuzzer();

  const isRevealed = state.gameState === 'revealed';

  // 🚨 NEW: Play buzzer sound directly on the Admin laptop when a team buzzes in
  useEffect(() => {
    if (buzzerWinner !== null) {
      const audio = new Audio('/sounds/buzzer.mp3');
      audio.play().catch((e) => console.error('Admin audio play failed', e));
    }
  }, [buzzerWinner]);

  // Helper to trigger effects reliably without setTimeouts
  const triggerAudio = (type) => ({ type, id: Date.now() });

  const handleNextQuestion = () => {
    nextQuestion();
    resetBuzzer();
    updateState({ triggerEffect: triggerAudio('whoosh') });
  };

  const showCurrentQuestion = () => {
    updateState({
      gameState: 'question_active',
      activeTeam: null,
      lockedOption: null,
      triggerEffect: triggerAudio('whoosh'),
    });
  };

  const highlightTeam = (teamIndex) => {
    updateState({
      activeTeam: teamIndex,
      gameState: 'team_highlighted',
      triggerEffect: triggerAudio('buzzer'), // Plays on display if manually selected
    });
  };

  const deselectTeam = () => {
    updateState({
      activeTeam: null,
      lockedOption: null,
      gameState: 'question_active',
    });
  };

  const lockOption = (optionIndex) => {
    if (state.activeTeam !== null) {
      updateState({ lockedOption: optionIndex, gameState: 'option_locked' });
    } else {
      alert('Please select a team before locking an option!');
    }
  };

  const deselectOption = () => {
    updateState({ lockedOption: null, gameState: 'team_highlighted' });
  };

  const submitAnswer = (isCorrect) => {
    if (
      state.activeTeam === null ||
      state.currentQuestion === null ||
      isRevealed
    )
      return;

    const newScores = [...state.scores];

    if (isCorrect) {
      newScores[state.activeTeam] += 10;
      updateState({
        gameState: 'revealed',
        scores: newScores,
        triggerEffect: triggerAudio('correct'),
      });
    } else {
      newScores[state.activeTeam] -= 10;
      updateState({
        gameState: 'revealed',
        scores: newScores,
        triggerEffect: triggerAudio('wrong'),
      });
    }
  };

  const reopenQuestion = () => {
    updateState({
      gameState: 'question_active',
      activeTeam: null,
      lockedOption: null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Master Control Board
            </h1>
            <p className="text-slate-400 mt-1">
              Status:{' '}
              <span className="text-emerald-400 font-bold uppercase">
                {state.gameState}
              </span>
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm('Full Reset?')) resetState();
            }}
            className="px-6 py-2 bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white rounded-lg font-bold transition-all"
          >
            Emergency Reset
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Question Management */}
          <section className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-700 pb-2 text-cyan-400">
              1. Flow Control
            </h2>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
              <h3 className="text-sm text-slate-400 mb-1">
                Current Question (Index: {state.currentQuestionIndex}):
              </h3>
              <p className="text-lg font-semibold mb-2">
                {state.currentQuestion?.text}
              </p>
              <p className="text-sm text-emerald-400">
                Correct:{' '}
                {
                  state.currentQuestion?.options[
                    state.currentQuestion?.correctAnswerIndex
                  ]
                }
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={handleNextQuestion}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all"
                >
                  Next Question ➔
                </button>
                <button
                  onClick={showCurrentQuestion}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all"
                >
                  Show Current
                </button>
              </div>
              <button
                onClick={() =>
                  updateState({
                    gameState: 'idle',
                    activeTeam: null,
                    lockedOption: null,
                  })
                }
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl active:scale-95 transition-all"
              >
                Hide Screen (Idle)
              </button>
            </div>
          </section>

          {/* Gameplay Mechanics */}
          <section className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-700 pb-2 text-pink-400">
              2. Live Action
            </h2>

            {/* --- BUZZER CONTROL PANEL --- */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm text-slate-400">
                  Hardware / Webview Buzzers
                </h3>
                <div
                  className={`px-3 py-1 rounded-md font-bold text-xs ${buzzerActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
                >
                  {buzzerActive ? '🟢 RECEIVING' : '🔴 LOCKED'}
                </div>
              </div>

              {buzzerWinner !== null && (
                <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500/30 rounded-lg text-center">
                  <span className="text-pink-400 font-bold text-lg">
                    🚨 WINNER: TEAM {buzzerWinner + 1} 🚨
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={resetBuzzer}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg active:scale-95 transition-all shadow-lg shadow-emerald-900/50"
                >
                  Reset & Open
                </button>
                <button
                  onClick={pauseBuzzer}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg active:scale-95 transition-all"
                >
                  Pause Buzzers
                </button>
              </div>
            </div>

            {/* Team Selection */}
            <div
              className={`transition-opacity ${isRevealed ? 'opacity-50' : 'opacity-100'}`}
            >
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-sm text-slate-400">
                  A. Acknowledge Buzzer
                </h3>
                <button
                  onClick={deselectTeam}
                  disabled={state.activeTeam === null || isRevealed}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-20 text-red-400 font-bold transition-all"
                >
                  ✖ Deselect Team
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((team) => (
                  <button
                    key={team}
                    disabled={isRevealed}
                    onClick={() => highlightTeam(team)}
                    className={`py-3 rounded-lg font-bold transition-all disabled:cursor-not-allowed ${state.activeTeam === team ? 'bg-pink-600 text-white ring-2 ring-pink-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                  >
                    T {team + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Option Selection */}
            <div
              className={`transition-opacity ${isRevealed ? 'opacity-50' : 'opacity-100'}`}
            >
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-sm text-slate-400">B. Lock Option</h3>
                <button
                  onClick={deselectOption}
                  disabled={state.lockedOption === null || isRevealed}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-20 text-red-400 font-bold transition-all"
                >
                  ✖ Deselect Opt
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((opt) => (
                  <button
                    key={opt}
                    disabled={isRevealed || state.activeTeam === null}
                    onClick={() => lockOption(opt)}
                    className={`py-3 rounded-lg font-bold transition-all disabled:cursor-not-allowed ${state.lockedOption === opt ? 'bg-amber-500 text-black ring-2 ring-amber-300' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                  >
                    {['A', 'B', 'C', 'D'][opt]}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit & Post-Reveal Actions */}
            <div className="pt-2">
              {!isRevealed ? (
                <button
                  onClick={() =>
                    submitAnswer(
                      state.lockedOption ===
                        state.currentQuestion?.correctAnswerIndex,
                    )
                  }
                  disabled={
                    state.activeTeam === null || state.lockedOption === null
                  }
                  className="w-full py-4 rounded-xl font-black bg-emerald-600 text-white text-xl shadow-lg hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                >
                  Submit & Reveal
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="w-full py-4 rounded-xl font-black bg-slate-700 text-slate-400 text-xl text-center border-2 border-slate-600 border-dashed">
                    Answer Locked & Scored
                  </div>
                  <button
                    onClick={reopenQuestion}
                    className="w-full py-2 rounded-lg font-bold bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white border border-amber-600/50 transition-all"
                  >
                    ↺ Re-open Question for other Teams
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
