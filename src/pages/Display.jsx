import { useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function Display() {
  const { state } = useGameState();
  const audioRefs = useRef({});

  // Trigger audio based on state.triggerEffect
  useEffect(() => {
    if (state.triggerEffect) {
      const src = getAudioSrc(state.triggerEffect);
      if (src) {
        if (!audioRefs.current[src]) {
          audioRefs.current[src] = new Audio(src);
        }
        audioRefs.current[src].currentTime = 0;
        audioRefs.current[src]
          .play()
          .catch((e) => console.warn('Audio play blocked', e));
      }

      if (state.triggerEffect === 'win') {
        fireConfetti();
      }
    }
  }, [state.triggerEffect, state.gameState]);

  const getAudioSrc = (effect) => {
    // Placeholder audio URLs - they won't necessarily load properly unles provided real ones
    switch (effect) {
      case 'whoosh':
        return 'https://actions.google.com/sounds/v1/foley/whoosh.ogg';
      case 'buzzer':
        return 'https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg';
      case 'win':
        return 'https://actions.google.com/sounds/v1/cartoon/clank_and_wobble.ogg'; // using placeholder
      case 'lose':
        return 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg'; // using placeholder
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
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const labels = ['A', 'B', 'C', 'D'];

  // Decide what class the container needs to shake if incorrect
  const shouldShake =
    state.gameState === 'revealed' && state.triggerEffect === 'lose';

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden relative font-sans flex flex-col">
      {/* Top Banner (Semi-transparent) */}
      <div className="w-full bg-white/10 backdrop-blur-md h-24 flex items-center justify-center border-b border-white/20 z-10">
        <h1 className="text-4xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          The Ultimate Tech Challenge
        </h1>
      </div>

      {/* Center Stage (Question and Options) */}
      <div className="flex-grow flex flex-col items-center justify-center p-8 z-10 w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {state.gameState !== 'idle' && (
            <motion.div
              key="question-container"
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                x: shouldShake ? [-10, 10, -10, 10, -5, 5, 0] : 0, // Shake effect
              }}
              exit={{ opacity: 0, scale: 0.9, y: -50 }}
              transition={{
                duration: shouldShake ? 0.4 : 0.5,
                type: shouldShake ? 'tween' : 'spring',
              }}
              className="w-full h-full flex flex-col"
            >
              {/* Question Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-3xl p-12 shadow-2xl shadow-blue-900/50 mb-12 border border-blue-400/30 flex items-center justify-center min-h-[16rem]">
                <h2 className="text-5xl md:text-6xl font-bold text-center leading-tight tracking-wide text-white drop-shadow-lg">
                  {state.currentQuestion.text}
                </h2>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-8 w-full">
                {state.currentQuestion.options.map((option, idx) => {
                  let optionState = 'default';
                  if (
                    state.gameState === 'option_locked' &&
                    state.lockedOption === idx
                  ) {
                    optionState = 'locked';
                  } else if (state.gameState === 'revealed') {
                    if (idx === state.currentQuestion.correctAnswerIndex) {
                      optionState = 'correct';
                    } else if (state.lockedOption === idx) {
                      optionState = 'wrong'; // User selected wrong answer
                    }
                  }

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        scale: optionState === 'locked' ? 1.05 : 1,
                      }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      className={`
                         relative flex items-center p-6 rounded-2xl border-4 text-3xl font-bold shadow-lg overflow-hidden transition-all duration-300
                         ${optionState === 'default' ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}
                         ${optionState === 'locked' ? 'bg-yellow-400 border-yellow-200 text-yellow-900 shadow-yellow-500/50 pulse-bg animate-pulse' : ''}
                         ${optionState === 'correct' ? 'bg-green-500 border-green-300 text-white shadow-green-500/50 scale-105' : ''}
                         ${optionState === 'wrong' ? 'bg-red-600 border-red-400 text-white shadow-red-600/50 scale-95 opacity-50' : ''}
                       `}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mr-6 shrink-0">
                        {labels[idx]}
                      </div>
                      <span className="leading-snug">{option}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {state.gameState === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-grow flex items-center justify-center"
          >
            <h2 className="text-6xl font-black text-white/20 uppercase tracking-widest">
              Awaiting Next Challenge
            </h2>
          </motion.div>
        )}
      </div>

      {/* Bottom Stage (Teams) */}
      <div className="h-64 w-full bg-slate-950 flex justify-center items-end px-12 pb-8 gap-8 border-t border-slate-800 z-10 relative">
        {/* Glow effect for active team base */}
        {state.activeTeam !== null && (
          <div
            className="absolute bottom-0 w-64 h-32 bg-cyan-500/20 blur-3xl pointer-events-none transition-all duration-500"
            style={{ left: `calc(13% + (23% * ${state.activeTeam}))` }}
          />
        )}

        {[0, 1, 2, 3].map((teamIdx) => {
          const isActive = state.activeTeam === teamIdx;
          const score = state.scores[teamIdx];

          return (
            <div
              key={teamIdx}
              className="flex flex-col items-center w-48 relative h-full justify-end"
            >
              {/* Vertical Score Bar */}
              <div className="absolute bottom-16 w-12 h-48 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.min(100, (score / 100) * 100)}%` }} // Assumes max score ~100 for visual bar
                  transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                  className={`w-full absolute bottom-0 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${isActive ? 'bg-cyan-400 shadow-cyan-400/50' : 'bg-indigo-500 shadow-indigo-500/30'}`}
                />
              </div>

              {/* Score Text Floating */}
              <motion.div
                animate={{ scale: isActive ? 1.2 : 1 }}
                className="absolute bottom-72 text-4xl font-black text-white drop-shadow-md"
              >
                {score}
              </motion.div>

              {/* Podium Base */}
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -10 : 0,
                }}
                className={`w-full h-12 rounded-t-xl flex justify-center items-center z-10 border-t-4 ${
                  isActive
                    ? 'bg-cyan-900 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]'
                    : 'bg-slate-800 border-slate-600'
                }`}
              >
                <span
                  className={`font-bold tracking-wider ${isActive ? 'text-cyan-50' : 'text-slate-400'}`}
                >
                  TEAM {teamIdx + 1}
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
