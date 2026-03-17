import { useEffect, useRef, useState } from 'react';
import { useGameState } from '../hooks/useGameState';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

/* ═══════════════════════════════════════════════════════
   TechKids Quiz Show — Display Screen
   Aesthetic: Warm premium edu-game show.
   Fun for kids, credible for parents, stunning on screen.
   ─ Deep navy base, vivid team color identities
   ─ Nunito rounded type for warmth & legibility
   ─ Gamified: ranks, buzz badge, score popups, stars
═══════════════════════════════════════════════════════ */

const LABELS = ['A', 'B', 'C', 'D'];

// Each team gets a full identity: primary, soft bg, border, text
const TEAMS = [
  {
    name: 'Team 1',
    primary: '#F87171',
    soft: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.4)',
    text: '#FECACA',
    emoji: '🔴',
  },
  {
    name: 'Team 2',
    primary: '#38BDF8',
    soft: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.4)',
    text: '#BAE6FD',
    emoji: '🔵',
  },
  {
    name: 'Team 3',
    primary: '#FBBF24',
    soft: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.4)',
    text: '#FDE68A',
    emoji: '🟡',
  },
  {
    name: 'Team 4',
    primary: '#34D399',
    soft: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.4)',
    text: '#A7F3D0',
    emoji: '🟢',
  },
];

const RANK_LABELS = ['1st', '2nd', '3rd', '4th'];

export default function Display() {
  const { state } = useGameState();
  const audioRefs = useRef({});
  const [scorePopup, setScorePopup] = useState(null);
  const prevScores = useRef([...state.scores]);

  // Detect score changes → trigger popup
  useEffect(() => {
    state.scores.forEach((score, i) => {
      const delta = score - prevScores.current[i];
      if (delta !== 0) {
        setScorePopup({ teamIdx: i, delta });
        setTimeout(() => setScorePopup(null), 1600);
      }
    });
    prevScores.current = [...state.scores];
  }, [state.scores]);

  // Audio & effects
  useEffect(() => {
    if (!state.triggerEffect) return;
    const src = {
      whoosh: 'https://actions.google.com/sounds/v1/foley/whoosh.ogg',
      buzzer: 'https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg',
      win: 'https://actions.google.com/sounds/v1/cartoon/clank_and_wobble.ogg',
      lose: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg',
    }[state.triggerEffect];
    if (src) {
      if (!audioRefs.current[src]) audioRefs.current[src] = new Audio(src);
      audioRefs.current[src].currentTime = 0;
      audioRefs.current[src].play().catch(() => {});
    }
    if (state.triggerEffect === 'win') fireConfetti();
  }, [state.triggerEffect]);

  const fireConfetti = () => {
    const end = Date.now() + 3500;
    const colors = [
      '#F87171',
      '#FBBF24',
      '#38BDF8',
      '#34D399',
      '#FFFFFF',
      '#FDE68A',
    ];
    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 65,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 65,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  // Sorted rankings for leaderboard
  const rankings = [0, 1, 2, 3]
    .map((i) => ({ idx: i, score: state.scores[i] }))
    .sort((a, b) => b.score - a.score);

  const rankOf = (teamIdx) => rankings.findIndex((r) => r.idx === teamIdx);

  const shouldShake =
    state.gameState === 'revealed' && state.triggerEffect === 'lose';
  const q = state.currentQuestion;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:       #0D1629;
          --bg-card:  #131E38;
          --bg-card2: #1A2645;
          --bg-input: #0F1A30;
          --border:   rgba(255,255,255,0.07);
          --border2:  rgba(255,255,255,0.12);
          --text:     #EEF2FF;
          --text-2:   #94A3C8;
          --text-3:   #4E5E82;
          --correct:  #4ADE80;
          --correct-bg: rgba(74,222,128,0.10);
          --correct-border: rgba(74,222,128,0.45);
          --wrong:    #F87171;
          --wrong-bg: rgba(248,113,113,0.08);
          --wrong-border: rgba(248,113,113,0.30);
          --star:     #FBBF24;
        }

        html, body, #root { height: 100%; background: var(--bg); overflow: hidden; }

        .dr {
          height: 100vh; width: 100vw; overflow: hidden;
          display: flex; flex-direction: column;
          font-family: 'Nunito', sans-serif;
          color: var(--text);
          background: var(--bg);
          position: relative;
        }

        /* Soft ambient gradient orbs */
        .dr-bg {
          position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
        }
        .dr-bg-orb1 {
          position: absolute; width: 55vw; height: 55vw; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.055) 0%, transparent 70%);
          top: -15%; left: -10%;
        }
        .dr-bg-orb2 {
          position: absolute; width: 50vw; height: 50vw; border-radius: 50%;
          background: radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 70%);
          bottom: -15%; right: -5%;
        }
        .dr-bg-orb3 {
          position: absolute; width: 30vw; height: 30vw; border-radius: 50%;
          background: radial-gradient(circle, rgba(248,113,113,0.04) 0%, transparent 70%);
          top: 30%; right: 25%;
        }

        /* ── HEADER ── */
        .dr-header {
          position: relative; z-index: 50;
          height: 5rem;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 3rem;
          background: rgba(13,22,41,0.92);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .dr-header-left { display: flex; align-items: center; gap: 1rem; }

        .live-badge {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.35rem 0.9rem;
          background: rgba(248,113,113,0.12);
          border: 1px solid rgba(248,113,113,0.3);
          border-radius: 2rem;
        }
        .live-dot {
          width: 0.45rem; height: 0.45rem; border-radius: 50%; background: #F87171;
          animation: pulse 1.8s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        .live-text {
          font-size: 0.65rem; font-weight: 800; letter-spacing: 0.2em;
          text-transform: uppercase; color: #F87171;
        }
        .dr-show-title {
          font-size: 1.25rem; font-weight: 900; letter-spacing: 0.02em; color: var(--text);
        }
        .dr-show-title span { color: #FBBF24; }

        /* Question progress pips */
        .q-progress { display: flex; align-items: center; gap: 0.5rem; }
        .q-pip {
          width: 0.55rem; height: 0.55rem; border-radius: 50%;
          background: var(--border2); transition: background 0.3s, transform 0.3s;
        }
        .q-pip.done  { background: var(--star); }
        .q-pip.active { background: var(--star); transform: scale(1.45); }

        .dr-header-right { display: flex; align-items: center; }
        .sponsor-pill {
          display: flex; align-items: center; gap: 0.55rem;
          padding: 0.42rem 1rem;
          background: rgba(251,191,36,0.08);
          border: 1px solid rgba(251,191,36,0.22);
          border-radius: 2rem;
        }
        .sponsor-pre  { font-size: 0.6rem; color: var(--text-3); font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; }
        .sponsor-name { font-size: 0.72rem; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #FBBF24; }

        /* ── MAIN ── */
        .dr-main { position: relative; z-index: 10; flex: 1; display: flex; overflow: hidden; }

        /* ── LEFT: QUESTION ── */
        .dr-left {
          flex: 1;
          display: flex; flex-direction: column; justify-content: center;
          padding: 2.5rem 3.5rem 2.5rem 4rem;
          border-right: 1px solid var(--border);
          gap: 1.6rem;
        }

        /* Question card */
        .q-card {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border2);
          border-radius: 2rem;
          padding: 2.8rem 3.5rem;
          min-height: 14rem;
          display: flex; flex-direction: column; justify-content: center;
          overflow: hidden;
        }
        .q-card-stripe {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #F87171 0%, #FBBF24 33%, #38BDF8 66%, #34D399 100%);
          border-radius: 2rem 2rem 0 0;
        }
        .q-watermark {
          position: absolute; right: 2.5rem; top: 50%; transform: translateY(-50%);
          font-size: 10rem; font-weight: 900; line-height: 1;
          color: rgba(255,255,255,0.025); user-select: none; pointer-events: none;
          letter-spacing: -0.05em;
        }
        .q-header-row {
          display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.2rem;
        }
        .q-num-badge {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.3rem 0.9rem;
          background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3);
          border-radius: 2rem; font-size: 0.68rem; font-weight: 800;
          letter-spacing: 0.18em; text-transform: uppercase; color: #FBBF24;
        }
        .q-pts-badge {
          display: inline-flex; align-items: center; gap: 0.3rem;
          padding: 0.3rem 0.8rem;
          background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.2);
          border-radius: 2rem; font-size: 0.62rem; font-weight: 800;
          letter-spacing: 0.15em; text-transform: uppercase; color: var(--correct);
        }
        .q-text {
          font-size: clamp(2rem, 3.2vw, 3.4rem);
          font-weight: 800; line-height: 1.25; color: var(--text);
          position: relative; z-index: 1;
        }

        /* ── OPTIONS ── */
        .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }

        .opt {
          display: flex; align-items: center; gap: 1.1rem;
          padding: 1.25rem 1.5rem;
          border-radius: 1.25rem;
          border: 1.5px solid var(--border);
          background: var(--bg-card);
          transition: border-color 0.3s, background 0.3s, opacity 0.3s;
          position: relative; overflow: hidden; cursor: default;
        }
        .opt::after {
          content: ''; position: absolute; inset: 0; opacity: 0;
          transition: opacity 0.35s; pointer-events: none;
        }
        .opt-lbl {
          width: 3.2rem; height: 3.2rem; flex-shrink: 0; border-radius: 0.85rem;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; font-weight: 900;
          background: var(--bg-input); color: var(--text-2);
          border: 1.5px solid var(--border2); transition: all 0.3s;
        }
        .opt-txt {
          font-size: clamp(1rem, 1.7vw, 1.5rem);
          font-weight: 700; line-height: 1.3; color: var(--text); transition: color 0.3s;
        }
        .opt-icon {
          margin-left: auto; flex-shrink: 0;
          width: 2rem; height: 2rem; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }

        .opt.locked {
          border-color: #FBBF24; background: rgba(251,191,36,0.07);
        }
        .opt.locked::after {
          background: radial-gradient(ellipse at left, rgba(251,191,36,0.08) 0%, transparent 65%); opacity: 1;
        }
        .opt.locked .opt-lbl { background: #FBBF24; color: #1A1200; border-color: #FBBF24; }
        .opt.locked .opt-txt { color: #FDE68A; }

        .opt.correct { border-color: var(--correct-border); background: var(--correct-bg); }
        .opt.correct::after {
          background: radial-gradient(ellipse at left, rgba(74,222,128,0.10) 0%, transparent 65%); opacity: 1;
        }
        .opt.correct .opt-lbl { background: var(--correct); color: #052e12; border-color: var(--correct); }
        .opt.correct .opt-txt { color: #DCFCE7; font-weight: 800; }
        .opt.correct .opt-icon { background: var(--correct); }

        .opt.wrong { border-color: var(--wrong-border); background: var(--wrong-bg); opacity: 0.62; }
        .opt.wrong .opt-lbl { background: rgba(248,113,113,0.2); color: #F87171; border-color: rgba(248,113,113,0.3); }
        .opt.wrong .opt-txt { color: #FECACA; }
        .opt.wrong .opt-icon { background: rgba(248,113,113,0.25); }

        .opt.faded { opacity: 0.18; border-color: transparent; }

        /* ── STANDBY ── */
        .standby {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 100%; gap: 1.8rem;
        }
        .standby-icon {
          font-size: 5.5rem; line-height: 1;
          animation: floatIcon 3s ease-in-out infinite;
        }
        @keyframes floatIcon { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        .standby-title {
          font-size: 2.5rem; font-weight: 900;
          color: rgba(255,255,255,0.1); letter-spacing: 0.1em; text-transform: uppercase;
        }
        .standby-sub {
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.3em;
          text-transform: uppercase; color: var(--text-3);
          display: flex; align-items: center; gap: 0.5rem;
        }
        .standby-dots span {
          display: inline-block; width: 0.35rem; height: 0.35rem; border-radius: 50%;
          background: var(--text-3);
          animation: dotBlink 1.4s ease-in-out infinite; margin: 0 0.15rem;
        }
        .standby-dots span:nth-child(2) { animation-delay: 0.22s; }
        .standby-dots span:nth-child(3) { animation-delay: 0.44s; }
        @keyframes dotBlink { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1.2)} }

        /* ── RIGHT: LEADERBOARD ── */
        .dr-right {
          width: 33rem;
          display: flex; flex-direction: column; justify-content: center;
          padding: 2.5rem 2.8rem;
          background: rgba(13,22,41,0.55);
          gap: 1.6rem;
        }
        .lb-heading { display: flex; align-items: center; gap: 0.8rem; }
        .lb-trophy  { font-size: 1.5rem; line-height: 1; }
        .lb-title   {
          font-size: 0.75rem; font-weight: 800; letter-spacing: 0.25em;
          text-transform: uppercase; color: var(--text-2);
        }
        .lb-divider { flex: 1; height: 1px; background: var(--border); }

        .lb-list { display: flex; flex-direction: column; gap: 0.85rem; }

        /* Team card */
        .tc {
          position: relative; overflow: hidden;
          border-radius: 1.4rem; border: 1.5px solid var(--border);
          background: var(--bg-card);
          padding: 1.4rem 1.7rem;
          display: flex; align-items: center; justify-content: space-between;
          transition: border-color 0.35s, background 0.35s;
          min-height: 6.2rem;
        }
        .tc-bar {
          position: absolute; inset-y: 0; left: 0; z-index: 0;
          opacity: 0.07;
          transition: width 0.7s cubic-bezier(0.4,0,0.2,1);
          border-radius: 1.4rem;
        }
        .tc-left {
          display: flex; align-items: center; gap: 1.2rem;
          position: relative; z-index: 1;
        }
        .tc-avatar {
          width: 3.8rem; height: 3.8rem; border-radius: 1rem;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; font-weight: 900;
          border: 2px solid; transition: all 0.35s; flex-shrink: 0;
        }
        .tc-info { display: flex; flex-direction: column; gap: 0.4rem; }
        .tc-name {
          font-size: 0.9rem; font-weight: 800; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--text-2); transition: color 0.3s;
        }
        .tc-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

        .tc-rank {
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 0.18rem 0.6rem;
          border-radius: 2rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-3);
        }
        .tc-rank.r0 { background: rgba(255,215,0,0.1); border-color: rgba(255,215,0,0.28); color: #FFD700; }
        .tc-rank.r1 { background: rgba(192,200,212,0.1); border-color: rgba(192,200,212,0.28); color: #C0C8D4; }
        .tc-rank.r2 { background: rgba(205,140,82,0.1); border-color: rgba(205,140,82,0.28); color: #CD8C52; }

        .tc-buzz {
          display: flex; align-items: center; gap: 0.35rem;
          font-size: 0.62rem; font-weight: 900; letter-spacing: 0.12em;
          text-transform: uppercase; padding: 0.2rem 0.65rem;
          border-radius: 2rem;
          animation: buzzPulse 0.9s ease-in-out infinite;
          white-space: nowrap;
        }
        .tc-buzz-dot {
          width: 0.4rem; height: 0.4rem; border-radius: 50%;
          animation: pulse 1.2s ease-in-out infinite; flex-shrink: 0;
        }
        @keyframes buzzPulse { 0%,100%{opacity:1} 50%{opacity:0.65} }

        .tc-stars { display: flex; gap: 0.22rem; margin-top: 0.05rem; }
        .tc-star  { font-size: 0.7rem; opacity: 0.2; transition: opacity 0.3s, transform 0.3s; }
        .tc-star.lit { opacity: 1; }

        .tc-right {
          display: flex; flex-direction: column; align-items: flex-end; gap: 0.15rem;
          position: relative; z-index: 1;
        }
        .tc-score {
          font-size: clamp(2.6rem, 3vw, 3.4rem); font-weight: 900;
          line-height: 1; letter-spacing: -0.03em;
          font-variant-numeric: tabular-nums; transition: color 0.3s;
        }
        .tc-pts-label {
          font-size: 0.58rem; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--text-3);
        }

        /* Score delta popup */
        .score-popup {
          position: absolute; right: 1rem; top: -0.5rem;
          font-size: 1.05rem; font-weight: 900; pointer-events: none; z-index: 20;
        }

        /* ── TICKER ── */
        .dr-ticker {
          position: relative; z-index: 50; height: 2.8rem;
          display: flex; align-items: center;
          border-top: 1px solid var(--border);
          background: rgba(13,22,41,0.96); overflow: hidden;
        }
        .ticker-badge {
          padding: 0 1.4rem; height: 100%;
          display: flex; align-items: center; gap: 0.5rem;
          border-right: 1px solid var(--border);
          background: rgba(251,191,36,0.07); flex-shrink: 0;
        }
        .ticker-label {
          font-size: 0.6rem; font-weight: 900; letter-spacing: 0.22em;
          text-transform: uppercase; color: #FBBF24; white-space: nowrap;
        }
        .ticker-scroll { flex: 1; overflow: hidden; padding: 0 1rem; }
        .ticker-inner {
          display: flex; align-items: center; gap: 4rem; white-space: nowrap;
          animation: tickerMove 30s linear infinite;
        }
        @keyframes tickerMove { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .ticker-item {
          font-size: 0.66rem; font-weight: 600; letter-spacing: 0.08em;
          color: var(--text-2); flex-shrink: 0;
          display: flex; align-items: center; gap: 0.6rem;
        }
        .ticker-dot { color: #FBBF24; font-size: 0.5rem; }
      `}</style>

      <div className="dr">
        {/* Ambient bg orbs */}
        <div className="dr-bg">
          <div className="dr-bg-orb1" />
          <div className="dr-bg-orb2" />
          <div className="dr-bg-orb3" />
        </div>

        {/* ── HEADER ── */}
        <header className="dr-header">
          <div className="dr-header-left">
            <div className="live-badge">
              <div className="live-dot" />
              <span className="live-text">Live</span>
            </div>
            <span className="dr-show-title">
              TechKids <span>Quiz!</span>
            </span>
          </div>

          {/* Question progress pips */}
          <div className="q-progress">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`q-pip ${
                  i < state.currentQuestionIndex
                    ? 'done'
                    : i === state.currentQuestionIndex &&
                        state.gameState !== 'idle'
                      ? 'active'
                      : ''
                }`}
              />
            ))}
          </div>

          <div className="dr-header-right">
            <div className="sponsor-pill">
              <span className="sponsor-pre">Powered by</span>
              <span className="sponsor-name">TechKids Club</span>
            </div>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main className="dr-main">
          {/* Left: Question + Options */}
          <section className="dr-left">
            <AnimatePresence mode="wait">
              {state.gameState !== 'idle' ? (
                <motion.div
                  key={`q-${state.currentQuestionIndex}`}
                  initial={{ opacity: 0, y: 28, scale: 0.98 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    x: shouldShake ? [-14, 14, -10, 10, -5, 5, 0] : 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -20,
                    scale: 0.97,
                    filter: 'blur(6px)',
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.6rem',
                  }}
                >
                  {/* Question card */}
                  <div className="q-card">
                    <div className="q-card-stripe" />
                    <div className="q-watermark">
                      {state.currentQuestionIndex + 1}
                    </div>
                    <div className="q-header-row">
                      <div className="q-num-badge">
                        ⭐ Question {state.currentQuestionIndex + 1}
                      </div>
                      <div className="q-pts-badge">+10 pts</div>
                    </div>
                    <p className="q-text">{q?.text}</p>
                  </div>

                  {/* Options */}
                  <div className="options-grid">
                    {q?.options.map((option, idx) => {
                      let cls = '';
                      if (
                        state.gameState === 'option_locked' &&
                        state.lockedOption === idx
                      )
                        cls = 'locked';
                      else if (
                        state.gameState === 'team_highlighted' &&
                        state.lockedOption === idx
                      )
                        cls = 'locked';
                      else if (state.gameState === 'revealed') {
                        if (idx === q.correctAnswerIndex) cls = 'correct';
                        else if (state.lockedOption === idx) cls = 'wrong';
                        else cls = 'faded';
                      }

                      return (
                        <motion.div
                          key={idx}
                          layout
                          animate={{
                            scale:
                              cls === 'correct'
                                ? 1.03
                                : cls === 'locked'
                                  ? 1.015
                                  : 1,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 22,
                          }}
                          className={`opt ${cls}`}
                        >
                          <div className="opt-lbl">{LABELS[idx]}</div>
                          <span className="opt-txt">{option}</span>

                          {cls === 'correct' && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                delay: 0.12,
                                type: 'spring',
                                stiffness: 450,
                              }}
                              className="opt-icon"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M3 8.5L6.5 12L13 5"
                                  stroke="#052e12"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </motion.div>
                          )}
                          {cls === 'wrong' && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                delay: 0.08,
                                type: 'spring',
                                stiffness: 400,
                              }}
                              className="opt-icon"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path
                                  d="M3 3L11 11M11 3L3 11"
                                  stroke="#F87171"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
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
                  className="standby"
                >
                  <div className="standby-icon">🎯</div>
                  <div className="standby-title">Quiz Time!</div>
                  <div className="standby-sub">
                    Getting ready
                    <span className="standby-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Right: Leaderboard */}
          <aside className="dr-right">
            <div className="lb-heading">
              <span className="lb-trophy">🏆</span>
              <span className="lb-title">Scoreboard</span>
              <div className="lb-divider" />
            </div>

            <div className="lb-list">
              {[0, 1, 2, 3].map((teamIdx) => {
                const team = TEAMS[teamIdx];
                const isActive = state.activeTeam === teamIdx;
                const score = state.scores[teamIdx];
                const rank = rankOf(teamIdx);
                const barPct = Math.min(100, (Math.max(0, score) / 200) * 100);
                const stars = Math.min(5, Math.max(0, Math.floor(score / 20)));

                return (
                  <motion.div
                    key={teamIdx}
                    animate={{
                      scale: isActive ? 1.03 : 1,
                      x: isActive ? -8 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    className="tc"
                    style={{
                      borderColor: isActive ? team.primary : undefined,
                      background: isActive ? team.soft : undefined,
                    }}
                  >
                    {/* Fill bar */}
                    <div
                      className="tc-bar"
                      style={{
                        width: `${barPct}%`,
                        background: score < 0 ? '#F87171' : team.primary,
                      }}
                    />

                    {/* Score delta popup */}
                    <AnimatePresence>
                      {scorePopup?.teamIdx === teamIdx && (
                        <motion.div
                          className="score-popup"
                          initial={{ opacity: 0, y: 0, scale: 0.8 }}
                          animate={{ opacity: 1, y: -30, scale: 1 }}
                          exit={{ opacity: 0, y: -52, scale: 0.75 }}
                          transition={{ duration: 1.3, ease: 'easeOut' }}
                          style={{
                            color: scorePopup.delta > 0 ? '#4ADE80' : '#F87171',
                          }}
                        >
                          {scorePopup.delta > 0
                            ? `+${scorePopup.delta}`
                            : scorePopup.delta}{' '}
                          pts
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="tc-left">
                      {/* Avatar */}
                      <div
                        className="tc-avatar"
                        style={{
                          background: isActive ? team.primary : team.soft,
                          borderColor: isActive ? team.primary : team.border,
                          color: isActive ? '#0D1629' : team.primary,
                        }}
                      >
                        {isActive ? team.emoji : teamIdx + 1}
                      </div>

                      <div className="tc-info">
                        <span
                          className="tc-name"
                          style={{ color: isActive ? team.text : undefined }}
                        >
                          {team.name}
                        </span>
                        <div className="tc-meta">
                          <span className={`tc-rank r${rank}`}>
                            {RANK_LABELS[rank]}
                          </span>
                          <AnimatePresence>
                            {isActive && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.7, width: 0 }}
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                  width: 'auto',
                                }}
                                exit={{ opacity: 0, scale: 0.7, width: 0 }}
                                className="tc-buzz"
                                style={{
                                  background: `${team.primary}1A`,
                                  border: `1px solid ${team.border}`,
                                  color: team.primary,
                                }}
                              >
                                <span
                                  className="tc-buzz-dot"
                                  style={{ background: team.primary }}
                                />
                                BUZZ!
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="tc-stars">
                          {[0, 1, 2, 3, 4].map((s) => (
                            <span
                              key={s}
                              className={`tc-star ${s < stars ? 'lit' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="tc-right">
                      <motion.span
                        key={score}
                        initial={{ opacity: 0.5, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 320,
                          damping: 24,
                        }}
                        className="tc-score"
                        style={{
                          color:
                            score < 0
                              ? '#F87171'
                              : isActive
                                ? team.text
                                : undefined,
                        }}
                      >
                        {score}
                      </motion.span>
                      <span className="tc-pts-label">points</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </aside>
        </main>

        {/* ── TICKER ── */}
        <footer className="dr-ticker">
          <div className="ticker-badge">
            <span style={{ fontSize: '0.9rem' }}>⭐</span>
            <span className="ticker-label">TechKids</span>
          </div>
          <div className="ticker-scroll">
            <div className="ticker-inner">
              {[...Array(2)].flatMap((_, r) => [
                <span key={`a${r}`} className="ticker-item">
                  <span className="ticker-dot">✦</span>Correct answer earns +10
                  points
                </span>,
                <span key={`b${r}`} className="ticker-item">
                  <span className="ticker-dot">✦</span>Wrong answer costs −10
                  points — think carefully!
                </span>,
                <span key={`c${r}`} className="ticker-item">
                  <span className="ticker-dot">✦</span>Buzz in first to get the
                  chance to answer
                </span>,
                <span key={`d${r}`} className="ticker-item">
                  <span className="ticker-dot">✦</span>The team with the highest
                  score wins the round
                </span>,
                <span key={`e${r}`} className="ticker-item">
                  <span className="ticker-dot">✦</span>Great job to all our
                  amazing participants today! 🎉
                </span>,
              ])}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
