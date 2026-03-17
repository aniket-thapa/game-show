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
        colors: ['#38bdf8', '#fb7185', '#fcd34d'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#38bdf8', '#fb7185', '#fcd34d'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const labels = ['A', 'B', 'C', 'D'];
  const shouldShake =
    state.gameState === 'revealed' && state.triggerEffect === 'lose';

  return (
    <div className="h-screen w-full bg-[#030712] text-slate-100 overflow-hidden flex flex-col font-sans selection:bg-transparent relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[50rem] h-[50rem] bg-violet-600/20 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
      </div>

      {/* Broadcast Header */}
      <header className="relative z-50 w-full h-16 flex items-center justify-between px-10 bg-slate-900/50 backdrop-blur-md border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
          </div>
          <span className="text-xs font-semibold tracking-[0.2em] text-indigo-200 uppercase">
            Live Event
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium tracking-widest text-slate-500 uppercase">
            Brought to you by
          </span>
          <span className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 uppercase">
            TECHKIDS CLUB
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-[1920px] mx-auto p-12 flex gap-12 h-full">
        {/* Left Side: Question Board */}
        <section className="flex-1 flex flex-col justify-center h-full max-w-[65%]">
          <AnimatePresence mode="wait">
            {state.gameState !== 'idle' ? (
              <motion.div
                key="active-question"
                initial={{ opacity: 0, y: 30 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  x: shouldShake ? [-12, 12, -12, 12, 0] : 0,
                }}
                exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full flex flex-col gap-10"
              >
                {/* Question Display */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-16 border border-white/10 shadow-2xl min-h-[20rem] flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
                    <div className="mb-8 px-5 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black tracking-[0.3em] uppercase shadow-inner">
                      Question {state.currentQuestionIndex + 1}
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-center leading-tight text-white drop-shadow-md">
                      {state.currentQuestion.text}
                    </h2>
                  </div>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-2 gap-6 w-full">
                  {state.currentQuestion.options.map((option, idx) => {
                    let containerClasses =
                      'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/50';
                    let labelClasses = 'bg-slate-700/50 text-slate-400';
                    let scale = 1;
                    let zIndex = 1;

                    if (
                      state.gameState === 'option_locked' &&
                      state.lockedOption === idx
                    ) {
                      containerClasses =
                        'bg-amber-500/15 border-amber-500/50 text-amber-100 shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)]';
                      labelClasses = 'bg-amber-500 text-amber-950 shadow-inner';
                      scale = 1.02;
                    } else if (state.gameState === 'revealed') {
                      if (idx === state.currentQuestion.correctAnswerIndex) {
                        containerClasses =
                          'bg-emerald-500/20 border-emerald-400/80 text-emerald-50 shadow-[0_0_60px_-15px_rgba(16,185,129,0.4)]';
                        labelClasses =
                          'bg-emerald-400 text-emerald-950 shadow-inner';
                        scale = 1.04;
                        zIndex = 10;
                      } else if (state.lockedOption === idx) {
                        containerClasses =
                          'bg-rose-500/15 border-rose-500/40 text-rose-200 opacity-70 grayscale-[0.3]';
                        labelClasses = 'bg-rose-500/30 text-rose-200';
                      } else {
                        containerClasses =
                          'bg-slate-900/40 border-transparent text-slate-500 opacity-30';
                        labelClasses = 'bg-slate-800 text-slate-600';
                      }
                    }

                    return (
                      <motion.div
                        key={idx}
                        layout
                        animate={{ scale }}
                        style={{ zIndex }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 20,
                        }}
                        className={`relative flex items-center p-6 rounded-3xl border-2 text-2xl lg:text-[1.75rem] font-medium transition-colors duration-300 backdrop-blur-sm ${containerClasses}`}
                      >
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-6 shrink-0 text-xl font-bold transition-colors duration-300 ${labelClasses}`}
                        >
                          {labels[idx]}
                        </div>
                        <span className="leading-snug tracking-wide">
                          {option}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              // Standby View
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow flex items-center justify-center"
              >
                <div className="relative flex flex-col items-center">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full" />
                  <div className="w-32 h-32 mb-10 rounded-full border-[3px] border-slate-800 border-t-indigo-500 border-r-indigo-500 animate-[spin_3s_linear_infinite]" />
                  <h2 className="text-2xl font-black text-slate-600 uppercase tracking-[1em] ml-[1em]">
                    Awaiting Signal
                  </h2>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right Side: Leaderboard */}
        <aside className="w-[35%] max-w-md h-full flex flex-col justify-center gap-6 pl-12 border-l border-white/[0.05]">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-700"></div>
            <h3 className="text-slate-400 uppercase tracking-[0.25em] font-bold text-xs">
              Live Standings
            </h3>
            <div className="h-px w-8 bg-slate-700"></div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {[0, 1, 2, 3].map((teamIdx) => {
              const isActive = state.activeTeam === teamIdx;
              const score = state.scores[teamIdx];
              const visualScore = Math.max(0, score);
              const barWidthPercentage = Math.min(
                100,
                (visualScore / 200) * 100,
              );

              return (
                <motion.div
                  key={teamIdx}
                  animate={{
                    scale: isActive ? 1.03 : 1,
                    x: isActive ? -12 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`relative overflow-hidden rounded-3xl border transition-colors duration-300 ${
                    isActive
                      ? 'bg-indigo-900/30 border-indigo-500/50 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)] z-20'
                      : 'bg-slate-800/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Progress Bar underlay */}
                  <div className="absolute inset-y-0 left-0 w-full z-0 opacity-[0.08]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidthPercentage}%` }}
                      transition={{
                        type: 'spring',
                        stiffness: 60,
                        damping: 20,
                      }}
                      className={`h-full ${
                        score < 0
                          ? 'bg-rose-500'
                          : isActive
                            ? 'bg-indigo-400'
                            : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  {/* Team Card Content */}
                  <div className="relative z-10 flex items-center justify-between p-6 h-[7.5rem]">
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-colors ${
                          isActive
                            ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {teamIdx + 1}
                      </div>
                      <div className="flex flex-col justify-center">
                        <div
                          className={`text-xs font-bold tracking-[0.2em] uppercase mb-1 ${
                            isActive ? 'text-indigo-200' : 'text-slate-500'
                          }`}
                        >
                          Team {teamIdx + 1}
                        </div>
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="text-[0.65rem] font-black text-indigo-400 tracking-[0.1em] flex items-center gap-1.5 uppercase"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                              Active
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div
                      className={`text-5xl font-black tabular-nums tracking-tighter ${
                        score < 0
                          ? 'text-rose-400/80'
                          : isActive
                            ? 'text-white drop-shadow-lg'
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
        </aside>
      </main>
    </div>
  );
}
