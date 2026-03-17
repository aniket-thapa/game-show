import { useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

/* ─────────────────────────────────────────────
   Elite Game Show Display — Redesigned
   Aesthetic: Luxury broadcast — deep charcoal,
   warm gold accents, editorial typography,
   zero neon, maximum clarity for large screens.
───────────────────────────────────────────── */

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const TEAM_PALETTES = [
  { ring: '#C8A96E', bg: 'rgba(200,169,110,0.12)', text: '#EDD9A3' },
  { ring: '#7EB8C9', bg: 'rgba(126,184,201,0.12)', text: '#B8DDE8' },
  { ring: '#B89AC0', bg: 'rgba(184,154,192,0.12)', text: '#D9C4E0' },
  { ring: '#9AC0A0', bg: 'rgba(154,192,160,0.12)', text: '#C4DEC8' },
];

export default function Display() {
  const { state } = useGameState();
  const audioRefs = useRef({});

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
    const map = {
      whoosh: 'https://actions.google.com/sounds/v1/foley/whoosh.ogg',
      buzzer: 'https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg',
      win: 'https://actions.google.com/sounds/v1/cartoon/clank_and_wobble.ogg',
      lose: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg',
    };
    return map[effect] ?? null;
  };

  const fireConfetti = () => {
    const end = Date.now() + 3200;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 50,
        origin: { x: 0 },
        colors: ['#C8A96E', '#EDD9A3', '#FFFFFF'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 50,
        origin: { x: 1 },
        colors: ['#C8A96E', '#EDD9A3', '#FFFFFF'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const shouldShake =
    state.gameState === 'revealed' && state.triggerEffect === 'lose';
  const q = state.currentQuestion;

  return (
    <>
      {/* Google Fonts — Cormorant Garamond (display) + DM Sans (body) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --gold:   #C8A96E;
          --gold-lt:#EDD9A3;
          --cream:  #F5ECD7;
          --bg:     #0C0B0A;
          --bg-1:   #131210;
          --bg-2:   #1A1916;
          --bg-3:   #232118;
          --border: rgba(255,255,255,0.07);
          --border-gold: rgba(200,169,110,0.35);
          --text:   #E8E0D0;
          --muted:  #6B6560;
          --muted2: #4A4640;
          --correct:#5EAD78;
          --correct-lt:#A8D8B8;
          --wrong:  #B05A5A;
          --locked: #C8A96E;
        }

        html, body, #root { height: 100%; background: var(--bg); }

        .display-root {
          height: 100vh; width: 100vw; overflow: hidden;
          display: flex; flex-direction: column;
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          background: var(--bg);
          position: relative;
        }

        /* ── Subtle textured bg ── */
        .display-root::before {
          content: '';
          position: absolute; inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse 60% 50% at 20% 80%, rgba(200,169,110,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 70% 60% at 80% 20%, rgba(160,140,200,0.04) 0%, transparent 60%);
          pointer-events: none;
        }

        /* ── Fine grain overlay ── */
        .display-root::after {
          content: '';
          position: absolute; inset: 0; z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          opacity: 0.6; pointer-events: none;
        }

        /* ─────── HEADER ─────── */
        .dsp-header {
          position: relative; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 3rem;
          height: 4.5rem;
          border-bottom: 1px solid var(--border);
          background: rgba(12,11,10,0.85);
          backdrop-filter: blur(16px);
        }

        .dsp-header-left {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .live-dot {
          width: 0.5rem; height: 0.5rem;
          border-radius: 50%; background: var(--gold);
          animation: livePulse 2s ease-in-out infinite;
        }
        @keyframes livePulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.8); }
        }
        .live-label {
          font-size: 0.65rem; font-weight: 500; letter-spacing: 0.25em;
          text-transform: uppercase; color: var(--muted);
        }
        .live-divider {
          width: 1px; height: 1.2rem;
          background: var(--border); margin: 0 0.25rem;
        }
        .dsp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem; font-weight: 600;
          letter-spacing: 0.08em; color: var(--text);
        }

        .dsp-header-right {
          display: flex; align-items: center; gap: 0.6rem;
        }
        .sponsor-pre {
          font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--muted2);
        }
        .sponsor-name {
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.3em;
          text-transform: uppercase; color: var(--gold);
        }

        /* ─────── MAIN LAYOUT ─────── */
        .dsp-main {
          position: relative; z-index: 10;
          flex: 1; display: flex; gap: 0;
          overflow: hidden;
        }

        /* ─────── LEFT PANEL (Question) ─────── */
        .dsp-left {
          flex: 1;
          display: flex; flex-direction: column; justify-content: center;
          padding: 3.5rem 4rem 3.5rem 4.5rem;
          border-right: 1px solid var(--border);
        }

        /* ─────── QUESTION CARD ─────── */
        .question-wrap { display: flex; flex-direction: column; gap: 2.5rem; }

        .question-card {
          position: relative;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 1.5rem;
          padding: 3.5rem 4rem;
          display: flex; flex-direction: column;
          align-items: flex-start; justify-content: center;
          min-height: 17rem;
          overflow: hidden;
        }
        .question-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, var(--gold) 30%, var(--gold-lt) 50%, var(--gold) 70%, transparent 100%);
          opacity: 0.6;
        }

        .q-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          margin-bottom: 1.5rem;
          padding: 0.35rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-gold);
          background: rgba(200,169,110,0.06);
        }
        .q-badge-num {
          font-size: 0.62rem; font-weight: 600; letter-spacing: 0.25em;
          text-transform: uppercase; color: var(--gold);
        }

        .q-ornament {
          position: absolute; right: 3rem; top: 50%; transform: translateY(-50%);
          font-family: 'Cormorant Garamond', serif;
          font-size: 8rem; font-weight: 700; line-height: 1;
          color: rgba(200,169,110,0.05); user-select: none; pointer-events: none;
          letter-spacing: -0.05em;
        }

        .q-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.2rem, 3.8vw, 3.8rem);
          font-weight: 600; line-height: 1.2;
          color: var(--cream); letter-spacing: 0.01em;
          position: relative; z-index: 1;
        }

        /* ─────── OPTIONS GRID ─────── */
        .options-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 1rem; width: 100%;
        }

        .option-card {
          display: flex; align-items: center;
          gap: 1.25rem;
          padding: 1.4rem 1.75rem;
          border-radius: 1rem;
          border: 1px solid var(--border);
          background: var(--bg-1);
          transition: border-color 0.3s, background 0.3s;
          position: relative; overflow: hidden;
          cursor: default;
        }
        .option-card::before {
          content: '';
          position: absolute; inset: 0;
          opacity: 0; transition: opacity 0.3s;
        }

        /* States */
        .option-card.state-default { }
        .option-card.state-locked {
          border-color: var(--gold);
          background: rgba(200,169,110,0.07);
        }
        .option-card.state-locked::before {
          background: radial-gradient(ellipse at left center, rgba(200,169,110,0.08) 0%, transparent 70%);
          opacity: 1;
        }
        .option-card.state-correct {
          border-color: var(--correct);
          background: rgba(94,173,120,0.08);
        }
        .option-card.state-correct::before {
          background: radial-gradient(ellipse at left center, rgba(94,173,120,0.12) 0%, transparent 70%);
          opacity: 1;
        }
        .option-card.state-wrong {
          border-color: rgba(176,90,90,0.35);
          background: rgba(176,90,90,0.05);
          opacity: 0.6;
        }
        .option-card.state-faded {
          opacity: 0.2;
          border-color: transparent;
        }

        .option-label {
          width: 3rem; height: 3rem; flex-shrink: 0;
          border-radius: 0.6rem;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem; font-weight: 700;
          transition: background 0.3s, color 0.3s;
          background: var(--bg-3); color: var(--muted);
          border: 1px solid var(--border);
        }
        .option-card.state-locked .option-label {
          background: var(--gold); color: #1A1510; border-color: var(--gold);
        }
        .option-card.state-correct .option-label {
          background: var(--correct); color: #0D1F14; border-color: var(--correct);
        }
        .option-card.state-wrong .option-label {
          background: rgba(176,90,90,0.25); color: var(--wrong);
          border-color: rgba(176,90,90,0.3);
        }
        .option-card.state-faded .option-label { opacity: 0.4; }

        .option-text {
          font-size: clamp(1.1rem, 1.8vw, 1.55rem);
          font-weight: 400; line-height: 1.3; color: var(--text);
          transition: color 0.3s;
        }
        .option-card.state-correct .option-text { color: var(--correct-lt); font-weight: 500; }
        .option-card.state-wrong .option-text { color: rgba(200,140,140,0.7); }
        .option-card.state-faded .option-text { color: var(--muted2); }

        /* Correct checkmark */
        .option-check {
          margin-left: auto; flex-shrink: 0;
          width: 1.6rem; height: 1.6rem;
          border-radius: 50%;
          background: var(--correct);
          display: flex; align-items: center; justify-content: center;
        }
        .option-check svg { display: block; }

        /* ─────── STANDBY ─────── */
        .standby-wrap {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 100%; gap: 2rem;
        }
        .standby-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(3rem, 7vw, 6rem); font-weight: 600;
          color: rgba(200,169,110,0.15); letter-spacing: 0.05em;
          user-select: none;
        }
        .standby-spinner {
          width: 2.5rem; height: 2.5rem;
          border: 1.5px solid var(--bg-3);
          border-top-color: var(--gold);
          border-right-color: var(--gold);
          border-radius: 50%;
          animation: spin 2.5s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .standby-text {
          font-size: 0.65rem; letter-spacing: 0.35em; text-transform: uppercase;
          color: var(--muted2); font-weight: 500;
        }

        /* ─────── RIGHT PANEL (Leaderboard) ─────── */
        .dsp-right {
          width: 34rem;
          display: flex; flex-direction: column; justify-content: center;
          padding: 3.5rem 3rem 3.5rem 3.5rem;
          background: rgba(12,11,10,0.5);
        }

        .lb-header {
          display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;
        }
        .lb-line { flex: 1; height: 1px; background: var(--border); }
        .lb-title {
          font-size: 0.7rem; font-weight: 600; letter-spacing: 0.3em;
          text-transform: uppercase; color: var(--muted);
          white-space: nowrap;
        }

        .lb-list { display: flex; flex-direction: column; gap: 1.1rem; }

        /* Team card */
        .team-card {
          position: relative; overflow: hidden;
          border-radius: 1.25rem;
          border: 1px solid var(--border);
          background: var(--bg-1);
          padding: 1.6rem 2rem;
          display: flex; align-items: center; justify-content: space-between;
          transition: border-color 0.3s, background 0.3s;
          min-height: 5.8rem;
        }

        .team-card-left {
          display: flex; align-items: center; gap: 1.4rem;
        }

        .team-avatar {
          width: 3.8rem; height: 3.8rem; border-radius: 0.85rem; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.7rem; font-weight: 700;
          background: var(--bg-3); color: var(--muted);
          border: 1px solid var(--border);
          transition: background 0.3s, color 0.3s, border-color 0.3s;
        }

        .team-info { display: flex; flex-direction: column; gap: 0.3rem; }
        .team-name {
          font-size: 0.8rem; font-weight: 600; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--muted);
          transition: color 0.3s;
        }
        .team-status {
          font-size: 0.68rem; font-weight: 500; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--gold);
          display: flex; align-items: center; gap: 0.5rem;
        }
        .status-pip {
          width: 0.45rem; height: 0.45rem; border-radius: 50%; background: var(--gold);
          animation: livePulse 1.5s ease-in-out infinite;
        }

        .team-score {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.8rem, 3.2vw, 3.6rem); font-weight: 600;
          line-height: 1;
          color: var(--text);
          letter-spacing: -0.02em;
          transition: color 0.3s;
          font-variant-numeric: tabular-nums;
        }

        /* Score bar bg */
        .team-bar {
          position: absolute; inset-y: 0; left: 0;
          opacity: 0.06; pointer-events: none;
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
        }

        /* Active state overrides */
        .team-card.active {
          border-color: var(--gold);
          background: rgba(200,169,110,0.06);
        }
        .team-card.active .team-avatar {
          background: var(--gold); color: #1A1510; border-color: var(--gold);
        }
        .team-card.active .team-name { color: var(--gold-lt); }
        .team-card.active .team-score { color: var(--cream); }
        .team-card.active .team-bar { background: var(--gold); opacity: 0.08; }

        .team-score.negative { color: rgba(176,90,90,0.8); }

        /* ─────── BOTTOM TICKER ─────── */
        .dsp-ticker {
          position: relative; z-index: 50;
          height: 2.5rem;
          border-top: 1px solid var(--border);
          background: rgba(12,11,10,0.9);
          display: flex; align-items: center;
          overflow: hidden;
        }
        .ticker-label {
          padding: 0 1.25rem;
          font-size: 0.55rem; font-weight: 700; letter-spacing: 0.25em;
          text-transform: uppercase; color: var(--gold);
          background: rgba(200,169,110,0.07);
          border-right: 1px solid var(--border);
          height: 100%; display: flex; align-items: center;
          white-space: nowrap;
        }
        .ticker-scroll {
          flex: 1; overflow: hidden; padding: 0 1.5rem;
        }
        .ticker-inner {
          display: flex; align-items: center; gap: 4rem;
          animation: tickerMove 28s linear infinite;
          white-space: nowrap;
        }
        @keyframes tickerMove {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .ticker-item {
          font-size: 0.62rem; letter-spacing: 0.12em; color: var(--muted);
          display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;
        }
        .ticker-sep { color: var(--border-gold); }
      `}</style>

      <div className="display-root">
        {/* ── Header ── */}
        <header className="dsp-header">
          <div className="dsp-header-left">
            <div className="live-dot" />
            <span className="live-label">Live</span>
            <div className="live-divider" />
            <span className="dsp-title">Game Show</span>
          </div>
          <div className="dsp-header-right">
            <span className="sponsor-pre">Presented by</span>
            <span className="sponsor-name">TechKids Club</span>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="dsp-main">
          {/* Left: Question */}
          <section className="dsp-left">
            <AnimatePresence mode="wait">
              {state.gameState !== 'idle' ? (
                <motion.div
                  key={`q-${state.currentQuestionIndex}`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    x: shouldShake ? [-10, 10, -8, 8, -4, 4, 0] : 0,
                  }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="question-wrap"
                >
                  {/* Question card */}
                  <div className="question-card">
                    <div className="q-badge">
                      <span className="q-badge-num">
                        Question {state.currentQuestionIndex + 1}
                      </span>
                    </div>
                    <div className="q-ornament">
                      {state.currentQuestionIndex + 1}
                    </div>
                    <p className="q-text">{q?.text}</p>
                  </div>

                  {/* Options */}
                  <div className="options-grid">
                    {q?.options.map((option, idx) => {
                      let stateClass = 'state-default';
                      if (
                        state.gameState === 'option_locked' ||
                        state.gameState === 'team_highlighted'
                      ) {
                        if (state.lockedOption === idx)
                          stateClass = 'state-locked';
                      } else if (state.gameState === 'revealed') {
                        if (idx === q.correctAnswerIndex)
                          stateClass = 'state-correct';
                        else if (state.lockedOption === idx)
                          stateClass = 'state-wrong';
                        else stateClass = 'state-faded';
                      }

                      return (
                        <motion.div
                          key={idx}
                          layout
                          animate={{
                            scale:
                              stateClass === 'state-correct'
                                ? 1.025
                                : stateClass === 'state-locked'
                                  ? 1.01
                                  : 1,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 280,
                            damping: 22,
                          }}
                          className={`option-card ${stateClass}`}
                        >
                          <div className="option-label">
                            {OPTION_LABELS[idx]}
                          </div>
                          <span className="option-text">{option}</span>
                          {stateClass === 'state-correct' && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                delay: 0.15,
                                type: 'spring',
                                stiffness: 400,
                              }}
                              className="option-check"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path
                                  d="M2.5 7L5.5 10L11.5 4"
                                  stroke="#0D1F14"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                /* Standby */
                <motion.div
                  key="standby"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="standby-wrap"
                >
                  <div className="standby-logo">QUIZ</div>
                  <div className="standby-spinner" />
                  <span className="standby-text">Awaiting Signal</span>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Right: Leaderboard */}
          <aside className="dsp-right">
            <div className="lb-header">
              <div className="lb-line" />
              <span className="lb-title">Live Standings</span>
              <div className="lb-line" style={{ maxWidth: '2rem' }} />
            </div>

            <div className="lb-list">
              {[0, 1, 2, 3].map((teamIdx) => {
                const isActive = state.activeTeam === teamIdx;
                const score = state.scores[teamIdx];
                const barPct = Math.min(100, (Math.max(0, score) / 200) * 100);

                return (
                  <motion.div
                    key={teamIdx}
                    animate={{
                      scale: isActive ? 1.025 : 1,
                      x: isActive ? -6 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className={`team-card ${isActive ? 'active' : ''}`}
                  >
                    {/* Score bar */}
                    <div
                      className="team-bar"
                      style={{
                        width: `${barPct}%`,
                        background:
                          score < 0
                            ? '#B05A5A'
                            : isActive
                              ? 'var(--gold)'
                              : '#888',
                      }}
                    />

                    <div className="team-card-left">
                      <div className="team-avatar">{teamIdx + 1}</div>
                      <div className="team-info">
                        <span className="team-name">Team {teamIdx + 1}</span>
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="team-status"
                            >
                              <span className="status-pip" />
                              Answering
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <motion.span
                      key={score}
                      initial={{ opacity: 0.6, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 22,
                      }}
                      className={`team-score ${score < 0 ? 'negative' : ''}`}
                    >
                      {score}
                    </motion.span>
                  </motion.div>
                );
              })}
            </div>
          </aside>
        </main>

        {/* ── Bottom Ticker ── */}
        <footer className="dsp-ticker">
          <div className="ticker-label">Live</div>
          <div className="ticker-scroll">
            <div className="ticker-inner">
              {/* Doubled for seamless loop */}
              {[...Array(2)].flatMap((_, r) => [
                <span key={`a-${r}`} className="ticker-item">
                  <span className="ticker-sep">◆</span>
                  10 pts for correct answer &nbsp;&nbsp; −10 pts for wrong
                </span>,
                <span key={`b-${r}`} className="ticker-item">
                  <span className="ticker-sep">◆</span>
                  Teams can re-attempt if question is reopened
                </span>,
                <span key={`c-${r}`} className="ticker-item">
                  <span className="ticker-sep">◆</span>
                  Buzz in first to gain the advantage
                </span>,
                <span key={`d-${r}`} className="ticker-item">
                  <span className="ticker-sep">◆</span>
                  Good luck to all participating teams
                </span>,
              ])}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
