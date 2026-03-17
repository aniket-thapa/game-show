import { useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function Display() {
  const { state } = useGameState();
  const audioRefs = useRef({});

  // Audio & Effects handling
  useEffect(() => {
    if (state.triggerEffect) {
      const src = getAudioSrc(state.triggerEffect);
      if (src) {
        if (!audioRefs.current[src]) audioRefs.current[src] = new Audio(src);
        audioRefs.current[src].currentTime = 0;
        audioRefs.current[src]
          .play()
          .catch((e) =>
            console.warn('Audio blocked. Click screen once to allow.', e),
          );
      }
      if (state.triggerEffect === 'win') fireConfetti();
    }
  }, [state.triggerEffect]);

  const getAudioSrc = (effect) => {
    switch (effect) {
      case 'whoosh':
        return 'https://actions.google.com/sounds/v1/foley/whoosh.ogg';
      case 'buzzer':
        return 'https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg';
      case 'win':
        return 'https://actions.google.com/sounds/v1/cartoon/clank_and_wobble.ogg';
      case 'lose':
        return 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg';
      default:
        return null;
    }
  };

  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#0ea5e9', '#f43f5e', '#fbbf24'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#0ea5e9', '#f43f5e', '#fbbf24'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const labels = ['A', 'B', 'C', 'D'];
  const shouldShake =
    state.gameState === 'revealed' && state.triggerEffect === 'lose';

  return (
    <div className="h-screen w-full bg-[#05050a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.3),rgba(255,255,255,0))] text-white overflow-hidden flex flex-col font-sans selection:bg-transparent">
      {/* ADVERTISEMENT BANNER (Sleeker & Professional) */}
      <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 py-3 px-12 flex justify-between items-center shadow-lg z-50">
        <div className="flex items-center gap-4 text-slate-400 text-sm tracking-widest font-semibold uppercase">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          Live Broadcast
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm tracking-widest">
            SPONSORED BY
          </span>
          <span className="font-black text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">
            TECHKIDS CLUB
          </span>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="flex-1 w-full max-w-[1920px] mx-auto flex p-8 gap-8 h-full">
        {/* LEFT COLUMN: Questions & Options (65% width) */}
        <div className="w-[65%] flex flex-col justify-center relative h-full">
          <AnimatePresence mode="wait">
            {state.gameState !== 'idle' ? (
              <motion.div
                key="question-board"
                initial={{ opacity: 0, x: -50 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  x: shouldShake ? [-10, 10, -10, 10, 0] : 0,
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full flex flex-col gap-8"
              >
                {/* Question Card */}
                <div className="relative bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] p-12 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] min-h-[16rem] flex items-center justify-center">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-1.5 rounded-full text-sm font-black tracking-widest uppercase shadow-[0_0_20px_rgba(37,99,235,0.5)]">
                    Question {state.currentQuestionIndex + 1}
                  </div>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center leading-[1.15] text-slate-100">
                    {state.currentQuestion.text}
                  </h2>
                </div>

                {/* Options Grid (2x2) */}
                <div className="grid grid-cols-2 gap-6 w-full">
                  {state.currentQuestion.options.map((option, idx) => {
                    // Determine Style based on state
                    let optStyle =
                      'bg-white/[0.02] border-white/5 text-slate-300 shadow-lg';
                    let labelStyle = 'bg-white/10 text-slate-400';

                    if (
                      state.gameState === 'option_locked' &&
                      state.lockedOption === idx
                    ) {
                      optStyle =
                        'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.2)] scale-[1.02]';
                      labelStyle = 'bg-amber-500 text-black';
                    } else if (state.gameState === 'revealed') {
                      if (idx === state.currentQuestion.correctAnswerIndex) {
                        optStyle =
                          'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_50px_rgba(52,211,153,0.3)] scale-[1.05] z-10';
                        labelStyle = 'bg-emerald-400 text-black';
                      } else if (state.lockedOption === idx) {
                        optStyle =
                          'bg-rose-500/10 border-rose-500/30 text-rose-300 opacity-60';
                        labelStyle = 'bg-rose-500/20 text-rose-300';
                      } else {
                        optStyle =
                          'bg-white/[0.01] border-transparent text-slate-600 opacity-40';
                        labelStyle = 'bg-white/5 text-slate-600';
                      }
                    }

                    return (
                      <motion.div
                        key={idx}
                        layout
                        className={`relative flex items-center p-6 rounded-3xl border-2 text-2xl lg:text-3xl font-semibold transition-all duration-500 ${optStyle}`}
                      >
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-6 shrink-0 text-xl font-black transition-colors duration-500 ${labelStyle}`}
                        >
                          {labels[idx]}
                        </div>
                        <span className="leading-snug">{option}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              // IDLE STATE
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-grow flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-8 rounded-full border-t-2 border-r-2 border-blue-500 animate-spin" />
                  <h2 className="text-4xl md:text-6xl font-black text-slate-700 uppercase tracking-[0.4em]">
                    Standby
                  </h2>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Teams & Scores (35% width) */}
        <div className="w-[35%] h-full flex flex-col justify-center gap-4 pl-8 border-l border-white/5">
          <h3 className="text-slate-500 uppercase tracking-[0.3em] font-bold text-sm mb-2 ml-2">
            Live Leaderboard
          </h3>

          <div className="flex flex-col gap-5 w-full">
            {[0, 1, 2, 3].map((teamIdx) => {
              const isActive = state.activeTeam === teamIdx;
              const score = state.scores[teamIdx];

              // Visual progress bar calculation (Max 200 points visually, min 0)
              const visualScore = Math.max(0, score);
              const barWidthPercentage = Math.min(
                100,
                (visualScore / 200) * 100,
              );

              return (
                <motion.div
                  key={teamIdx}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    x: isActive ? -10 : 0,
                  }}
                  className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.2)] z-20'
                      : 'bg-white/[0.02] border-white/5'
                  }`}
                >
                  {/* Background Progress Bar */}
                  <div className="absolute inset-0 z-0 opacity-20">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidthPercentage}%` }}
                      transition={{
                        type: 'spring',
                        stiffness: 50,
                        damping: 15,
                      }}
                      className={`h-full ${score < 0 ? 'bg-rose-500' : isActive ? 'bg-cyan-400' : 'bg-slate-400'}`}
                    />
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10 flex items-center justify-between p-6 h-28">
                    {/* Team Info */}
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black ${
                          isActive
                            ? 'bg-cyan-400 text-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        T{teamIdx + 1}
                      </div>
                      <div>
                        <div
                          className={`text-sm font-bold tracking-widest uppercase mb-1 ${isActive ? 'text-cyan-300' : 'text-slate-500'}`}
                        >
                          Team {teamIdx + 1}
                        </div>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs font-black text-cyan-400 tracking-wider flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            BUZZED IN
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div
                      className={`text-5xl font-black tabular-nums tracking-tighter drop-shadow-lg ${
                        score < 0
                          ? 'text-rose-400'
                          : isActive
                            ? 'text-white'
                            : 'text-slate-300'
                      }`}
                    >
                      {score}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
