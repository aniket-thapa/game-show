// src/pages/Display.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useTimerCountdown } from '../hooks/useTimerCountdown';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

/* ═══════════════════════════════════════════════════════
   TechKids Quiz Show — Display Screen
   ─ All state from Socket.IO (real-time, multi-PC safe)
   ─ Sounds triggered server-side → instant on all clients
   ─ 15-second team timer with animated progress bar
   ─ Audio unlock overlay on first load
═══════════════════════════════════════════════════════ */

const LABELS = ['A', 'B', 'C', 'D'];
const TIMER_TOTAL = 15; // keep in sync with server TIMER_DURATION/1000

const TEAMS = [
  {
    name: 'Wed Plan',
    primary: '#F87171',
    soft: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.4)',
    text: '#FECACA',
    emoji: '1',
  },
  {
    name: 'Go Limits',
    primary: '#38BDF8',
    soft: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.4)',
    text: '#BAE6FD',
    emoji: '2',
  },
  {
    name: 'Digitines',
    primary: '#FBBF24',
    soft: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.4)',
    text: '#FDE68A',
    emoji: '3',
  },
  {
    name: 'SaplinG International',
    primary: '#34D399',
    soft: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.4)',
    text: '#A7F3D0',
    emoji: '4',
  },
];

export default function Display() {
  const { state, onPlaySound } = useSocket();

  // ── Timer countdown (RAF-based) ───────────────────────────────────────────
  const timeLeft = useTimerCountdown(
    state.timerActive,
    state.timerStartedAt,
    state.timerDuration,
  );

  // Derived timer visuals
  const timerPct =
    state.timerExpired || !state.timerActive
      ? 0
      : (timeLeft / TIMER_TOTAL) * 100;

  const timerIsUrgent =
    state.timerActive && !state.timerExpired && timeLeft <= 5;
  const timerIsWarning =
    state.timerActive && !state.timerExpired && timeLeft > 5 && timeLeft <= 10;

  const timerFillColor = state.timerExpired
    ? '#F87171'
    : timerIsUrgent
      ? '#F87171'
      : timerIsWarning
        ? '#FBBF24'
        : '#4ADE80';

  const timerTextColor = state.timerExpired
    ? '#F87171'
    : timerIsUrgent
      ? '#F87171'
      : timerIsWarning
        ? '#FBBF24'
        : '#4ADE80';

  // Only show the timer bar when a team is answering (or timer expired)
  const showTimerBar =
    state.gameState !== 'idle' &&
    (state.timerActive || state.timerExpired) &&
    state.activeTeam !== null;

  // ── Audio ─────────────────────────────────────────────────────────────────
  const soundsRef = useRef({});
  const [audioReady, setAudioReady] = useState(false);

  const enableAudio = useCallback(() => {
    ['whoosh', 'buzzer', 'correct', 'wrong'].forEach((name) => {
      const a = new Audio(`/sounds/${name}.mp3`);
      a.preload = 'auto';
      soundsRef.current[name] = a;
    });
    setAudioReady(true);
  }, []);

  const playSound = useCallback((name) => {
    const a = soundsRef.current[name];
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }, []);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [scorePopup, setScorePopup] = useState(null);
  const [shouldShake, setShouldShake] = useState(false);
  const prevScores = useRef(null);

  // ── Server sound events ───────────────────────────────────────────────────
  useEffect(() => {
    if (!audioReady) return;
    const cleanup = onPlaySound((soundName) => {
      playSound(soundName);
      if (soundName === 'correct') fireConfetti();
      if (soundName === 'wrong') {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 900);
      }
    });
    return cleanup;
  }, [audioReady, onPlaySound, playSound]);

  // ── Score change popups ───────────────────────────────────────────────────
  useEffect(() => {
    if (prevScores.current === null) {
      prevScores.current = [...state.scores];
      return;
    }
    state.scores.forEach((score, i) => {
      const delta = score - prevScores.current[i];
      if (delta !== 0) {
        setScorePopup({ teamIdx: i, delta });
        setTimeout(() => setScorePopup(null), 1600);
      }
    });
    prevScores.current = [...state.scores];
  }, [state.scores]);

  // ── Confetti ──────────────────────────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────────────────────────
  const rankings = [0, 1, 2, 3]
    .map((i) => ({ idx: i, score: state.scores[i] }))
    .sort((a, b) => b.score - a.score);

  const q = state.currentQuestion;
  const { buzzerWinner, currentRoundName, currentRoundLabel, currentRound } =
    state;

  // SVG ring dimensions
  const RING_R = 28;
  const RING_C = 2 * Math.PI * RING_R; // circumference
  const ringOffset = state.timerExpired
    ? RING_C
    : state.timerActive
      ? RING_C * (1 - timeLeft / TIMER_TOTAL)
      : 0;

  return (
    <>
      {/* ─────────────── CSS ─────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:#0D1629; --bg-card:#131E38; --bg-card2:#1A2645;
          --bg-input:#0F1A30; --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.12);
          --text:#EEF2FF; --text-2:#94A3C8; --text-3:#4E5E82;
          --correct:#4ADE80; --correct-bg:rgba(74,222,128,0.10); --correct-border:rgba(74,222,128,0.45);
          --wrong:#F87171; --wrong-bg:rgba(248,113,113,0.08); --wrong-border:rgba(248,113,113,0.30);
          --star:#FBBF24;
        }
        html, body, #root { height:100%; background:var(--bg); overflow:hidden; }
        .dr { height:100vh; width:100vw; overflow:hidden; display:flex; flex-direction:column;
              font-family:'Nunito',sans-serif; color:var(--text); background:var(--bg); position:relative; }
        .dr-bg { position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
        .dr-bg-orb1 { position:absolute; width:55vw; height:55vw; border-radius:50%;
                      background:radial-gradient(circle,rgba(56,189,248,0.055) 0%,transparent 70%); top:-15%; left:-10%; }
        .dr-bg-orb2 { position:absolute; width:50vw; height:50vw; border-radius:50%;
                      background:radial-gradient(circle,rgba(251,191,36,0.04) 0%,transparent 70%); bottom:-15%; right:-5%; }
        .dr-bg-orb3 { position:absolute; width:30vw; height:30vw; border-radius:50%;
                      background:radial-gradient(circle,rgba(248,113,113,0.04) 0%,transparent 70%); top:30%; right:25%; }

        /* ── Header ── */
        .dr-header { position:relative; z-index:50; height:5rem; display:flex; align-items:center;
                     justify-content:space-between; padding:0 3rem;
                     background:rgba(13,22,41,0.92); backdrop-filter:blur(20px);
                     border-bottom:1px solid var(--border); }
        .dr-header-left { display:flex; align-items:center; gap:1rem; }
        .live-badge { display:flex; align-items:center; gap:0.5rem; padding:0.35rem 0.9rem;
                      margin-left:-1rem; background:rgba(248,113,113,0.12);
                      border:1px solid rgba(248,113,113,0.3); border-radius:2rem; }
        .live-dot   { width:0.45rem; height:0.45rem; border-radius:50%; background:#F87171;
                      animation:pulse 1.8s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        .live-text  { font-size:0.75rem; font-weight:800; letter-spacing:0.2em; padding-top:0.1rem;
                      text-transform:uppercase; color:#F87171; }
        .dr-show-title { font-size:1.25rem; font-weight:900; letter-spacing:0.02em; color:var(--text); }
        .dr-header-right { display:flex; align-items:center; }

        /* ── Timer bar ── */
        .dr-timer-bar {
          position: relative; z-index: 45;
          display: flex; align-items: center;
          padding: 0 3rem;
          height: 4.4rem;
          background: rgba(13,22,41,0.88);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
          gap: 1.6rem;
          overflow: hidden;
        }
        .dr-timer-bar::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, rgba(248,113,113,0.04) 0%, transparent 60%);
          pointer-events: none;
        }
        .timer-ring-wrap { flex-shrink: 0; }
        .timer-ring-label {
          font-size: 0.65rem; font-weight: 800; letter-spacing: 0.18em;
          text-transform: uppercase; color: var(--text-2);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .timer-track {
          flex: 1; height: 10px; background: rgba(255,255,255,0.07);
          border-radius: 999px; overflow: hidden;
        }
        .timer-fill {
          height: 100%; border-radius: 999px;
          transition: width 0.25s linear, background-color 0.5s;
        }
        .timer-team-tag {
          flex-shrink: 0;
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.35rem 1rem; border-radius: 999px;
          border: 1.5px solid; font-size: 0.85rem; font-weight: 800;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .timer-timeup {
          flex-shrink: 0;
          font-size: 0.95rem; font-weight: 900;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: #F87171;
          animation: timerUrgentPulse 0.7s ease-in-out infinite;
        }
        @keyframes timerUrgentPulse {
          0%,100% { opacity:1; } 50% { opacity:0.45; }
        }
        @keyframes timerUrgentShake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-3px)}
          40%{transform:translateX(3px)} 60%{transform:translateX(-2px)} 80%{transform:translateX(2px)}
        }
        .timer-bar-urgent { animation: timerUrgentPulse 0.55s ease-in-out infinite; }

        /* ── Main layout ── */
        .dr-main { position:relative; z-index:10; flex:1; display:flex; overflow:hidden; }
        .dr-left  { flex:1; display:flex; flex-direction:column; justify-content:center;
                    padding:2.5rem 3.5rem 2.5rem 4rem; border-right:1px solid var(--border); gap:1.6rem; }
        .q-card { position:relative; background:var(--bg-card); border:1px solid var(--border2);
                  border-radius:2rem; padding:2.8rem 3.5rem; min-height:14rem;
                  display:flex; flex-direction:column; justify-content:center; overflow:hidden; }
        .q-card-stripe { position:absolute; top:0; left:0; right:0; height:3px;
                         background:linear-gradient(90deg,#F87171 0%,#FBBF24 33%,#38BDF8 66%,#34D399 100%);
                         border-radius:2rem 2rem 0 0; }
        .q-watermark { position:absolute; right:2.5rem; top:50%; transform:translateY(-50%);
                       font-size:10rem; font-weight:900; line-height:1; color:rgba(255,255,255,0.025);
                       user-select:none; pointer-events:none; letter-spacing:-0.05em; }
        .q-header-row { display:flex; align-items:center; gap:0.75rem; margin-bottom:1.2rem; flex-wrap:wrap; }
        .q-round-badge { display:inline-flex; align-items:center; gap:0.4rem; padding:0.3rem 0.9rem;
                         background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.35);
                         border-radius:2rem; font-size:0.68rem; font-weight:800; letter-spacing:0.18em;
                         text-transform:uppercase; color:#C4B5FD; }
        .q-num-badge { display:inline-flex; align-items:center; gap:0.4rem; padding:0.3rem 0.9rem;
                       background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3);
                       border-radius:2rem; font-size:0.68rem; font-weight:800; letter-spacing:0.18em;
                       text-transform:uppercase; color:#FBBF24; }
        .q-pts-badge { display:inline-flex; align-items:center; gap:0.3rem; padding:0.3rem 0.8rem;
                       background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.2);
                       border-radius:2rem; font-size:0.62rem; font-weight:800; letter-spacing:0.15em;
                       text-transform:uppercase; color:var(--correct); }
        .q-text { font-size:clamp(2rem,3.2vw,3.4rem); font-weight:800; line-height:1.25; color:var(--text); position:relative; z-index:1; }
        .options-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.9rem; }
        .opt { display:flex; align-items:center; gap:1.1rem; padding:1.25rem 1.5rem; border-radius:1.25rem;
               border:1.5px solid var(--border); background:var(--bg-card);
               transition:border-color 0.3s,background 0.3s,opacity 0.3s; position:relative; overflow:hidden; cursor:default; }
        .opt::after { content:''; position:absolute; inset:0; opacity:0; transition:opacity 0.35s; pointer-events:none; }
        .opt-lbl { width:3.2rem; height:3.2rem; flex-shrink:0; border-radius:0.85rem; display:flex;
                   align-items:center; justify-content:center; font-size:1.2rem; font-weight:900;
                   background:var(--bg-input); color:var(--text-2); border:1.5px solid var(--border2); transition:all 0.3s; }
        .opt-txt { font-size:clamp(1rem,1.7vw,1.5rem); font-weight:700; line-height:1.3; color:var(--text); transition:color 0.3s; }
        .opt-icon { margin-left:auto; flex-shrink:0; width:2rem; height:2rem; border-radius:50%;
                    display:flex; align-items:center; justify-content:center; }
        .opt.locked { border-color:#FBBF24; background:rgba(251,191,36,0.07); }
        .opt.locked::after { background:radial-gradient(ellipse at left,rgba(251,191,36,0.08) 0%,transparent 65%); opacity:1; }
        .opt.locked .opt-lbl { background:#FBBF24; color:#1A1200; border-color:#FBBF24; }
        .opt.locked .opt-txt { color:#FDE68A; }
        .opt.correct { border-color:var(--correct-border); background:var(--correct-bg); }
        .opt.correct::after { background:radial-gradient(ellipse at left,rgba(74,222,128,0.10) 0%,transparent 65%); opacity:1; }
        .opt.correct .opt-lbl { background:var(--correct); color:#052e12; border-color:var(--correct); }
        .opt.correct .opt-txt { color:#DCFCE7; font-weight:800; }
        .opt.correct .opt-icon { background:var(--correct); }
        .opt.wrong { border-color:var(--wrong-border); background:var(--wrong-bg); opacity:0.62; }
        .opt.wrong .opt-lbl { background:rgba(248,113,113,0.2); color:#F87171; border-color:rgba(248,113,113,0.3); }
        .opt.wrong .opt-txt { color:#FECACA; }
        .opt.wrong .opt-icon { background:rgba(248,113,113,0.25); }
        .opt.faded { opacity:0.18; border-color:transparent; }
        .standby { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:1.8rem; }
        .standby-icon { font-size:5.5rem; line-height:1; animation:floatIcon 3s ease-in-out infinite; }
        @keyframes floatIcon { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        .standby-description { font-size:2.2rem; font-weight:900; color:var(--text-2); text-align:center; }
        .standby-round { font-size:1.1rem; font-weight:900; letter-spacing:0.12em; text-transform:uppercase;
                         color:#C4B5FD; padding:0.4rem 1.4rem; border-radius:2rem;
                         background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.3); }
        .standby-sub { font-size:0.9rem; font-weight:900; letter-spacing:0.25em; text-transform:uppercase;
                       color:var(--text-2); display:flex; align-items:center; gap:0.5rem; }
        .standby-dots span { display:inline-block; width:0.5rem; height:0.5rem; border-radius:50%;
                              background:var(--text-2); animation:dotBlink 1.2s ease-in-out infinite; margin:0 0.2rem; }
        .standby-dots span:nth-child(2) { animation-delay:0.22s; }
        .standby-dots span:nth-child(3) { animation-delay:0.44s; }
        @keyframes dotBlink { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1.2)} }

        /* ── Scoreboard ── */
        .dr-right { width:33rem; display:flex; flex-direction:column; justify-content:center;
                    padding:2.5rem 2.8rem; background:rgba(13,22,41,0.55); gap:1.6rem; }
        .lb-heading { display:flex; align-items:center; gap:0.8rem; }
        .lb-trophy  { font-size:1.5rem; line-height:1; }
        .lb-title   { font-size:1.25rem; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-2); }
        .lb-divider { flex:1; height:1px; background:var(--border); }
        .lb-list    { display:flex; flex-direction:column; gap:0.85rem; }
        .tc { position:relative; overflow:hidden; border-radius:1.4rem; border:1.5px solid var(--border);
              background:var(--bg-card); padding:1.4rem 1.7rem; display:flex; align-items:center;
              justify-content:space-between; transition:border-color 0.35s,background 0.35s; min-height:6.2rem; }
        .tc-bar { position:absolute; inset-y:0; left:0; z-index:0; opacity:0.07;
                  transition:width 0.7s cubic-bezier(0.4,0,0.2,1); border-radius:1.4rem; }
        .tc-left { display:flex; align-items:center; gap:1.2rem; position:relative; z-index:1; }
        .tc-avatar { width:3.8rem; height:3.8rem; border-radius:1rem; display:flex; align-items:center;
                     justify-content:center; font-size:1.4rem; font-weight:900; border:2px solid; transition:all 0.35s; flex-shrink:0; }
        .tc-info { display:flex; flex-direction:column; gap:0.4rem; }
        .tc-name { font-size:1.25rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:var(--text-2); transition:color 0.3s; }
        .tc-right { display:flex; flex-direction:column; align-items:flex-end; gap:0.15rem; position:relative; z-index:1; }
        .tc-score { font-size:clamp(2.6rem,3vw,3.4rem); font-weight:900; line-height:1; letter-spacing:-0.03em;
                    font-variant-numeric:tabular-nums; transition:color 0.3s; }
        .tc-pts-label { font-size:0.58rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--text-2); }
        .score-popup { position:absolute; right:1rem; top:-0.5rem; font-size:1.05rem; font-weight:900; pointer-events:none; z-index:20; }

        /* ── Ticker ── */
        .dr-ticker { position:relative; z-index:50; height:2.8rem; display:flex; align-items:center;
                     border-top:1px solid var(--border); background:rgba(13,22,41,0.96); overflow:hidden; }
        .ticker-badge { padding:0 1.4rem; height:100%; display:flex; align-items:center; gap:0.5rem;
                        border-right:1px solid var(--border); background:rgba(251,191,36,0.07); flex-shrink:0; }
        .ticker-label { font-size:0.9rem; font-weight:700; letter-spacing:0.1em; color:#FBBF24; white-space:nowrap; }
        .ticker-scroll { flex:1; overflow:hidden; padding:0 1rem; }
        .ticker-inner { display:flex; align-items:center; gap:4rem; white-space:nowrap; animation:tickerMove 30s linear infinite; }
        @keyframes tickerMove { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .ticker-item { font-size:0.9rem; font-weight:600; letter-spacing:0.08em; color:var(--text-1);
                       flex-shrink:0; display:flex; align-items:center; gap:0.6rem; }
        .ticker-dot { color:#FBBF24; font-size:0.5rem; }
      `}</style>

      {/* ── Audio Enable Overlay ──────────────────────────────────────────── */}
      {!audioReady && (
        <div
          onClick={enableAudio}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(13,22,41,0.96)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
            cursor: 'pointer',
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <div
            style={{
              fontSize: '5.5rem',
              animation: 'floatIcon 3s ease-in-out infinite',
            }}
          >
            🎮
          </div>
          <p
            style={{
              color: '#EEF2FF',
              fontSize: '2rem',
              fontWeight: 900,
              textAlign: 'center',
              maxWidth: '520px',
              lineHeight: 1.3,
            }}
          >
            Click anywhere to
            <br />
            enable audio &amp; start the show
          </p>
          <button
            style={{
              padding: '1rem 3.5rem',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #FBBF24 0%, #F87171 100%)',
              color: '#fff',
              fontWeight: 900,
              fontSize: '1.25rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 40px rgba(251,191,36,0.4)',
              letterSpacing: '0.05em',
            }}
          >
            🎬 Start Show
          </button>
          <p style={{ color: '#4E5E82', fontSize: '0.85rem', fontWeight: 600 }}>
            This screen should be opened on the projector PC
          </p>
        </div>
      )}

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
              <img src="/show-logo.png" alt="Show Logo" className="h-8" />
            </span>
          </div>

          {/* Buzzer banner — centred */}
          <div className="first-buzzer flex items-center justify-center flex-1">
            <AnimatePresence>
              {buzzerWinner !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-6 py-2 rounded-full font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] border-2"
                  style={{
                    backgroundColor: TEAMS[buzzerWinner].soft,
                    color: TEAMS[buzzerWinner].text,
                    borderColor: TEAMS[buzzerWinner].primary,
                  }}
                >
                  🚨 {TEAMS[buzzerWinner].name.toUpperCase()} BUZZED IN!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="dr-header-right">
            <img
              src="/digitines.webp"
              alt="Sponsor Logo"
              className="h-10 rounded-md"
            />
          </div>
        </header>

        {/* ── TIMER BAR ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showTimerBar && (
            <motion.div
              className="dr-timer-bar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '3rem', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* Progress bar */}
              <div className="timer-track">
                <div
                  className="timer-fill"
                  style={{
                    width: `${timerPct}%`,
                    backgroundColor: timerFillColor,
                  }}
                />
              </div>

              {/* TIME for active and time up label */}
              {state.timerActive && (
                <div
                  className={`timer-ring-wrap text-2xl ${timerIsUrgent ? 'timer-bar-urgent' : ''}`}
                >
                  {state.timerExpired ? '0' : timeLeft}
                </div>
              )}

              {state.timerExpired && (
                <div className="timer-timeup">TIME&apos;S UP!</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MAIN ── */}
        <main className="dr-main">
          {/* Left: Question + Options */}
          <section className="dr-left">
            <AnimatePresence mode="wait">
              {state.gameState !== 'idle' ? (
                <motion.div
                  key={`r${state.currentRound}-q${state.currentQuestionIndex}`}
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
                      <div className="q-round-badge">
                        {currentRoundName ?? `Round ${(currentRound ?? 0) + 1}`}
                      </div>
                      <div className="q-num-badge">
                        ⭐ Question {state.currentQuestionIndex + 1}
                      </div>
                      <div className="q-pts-badge">+10 pts</div>
                    </div>
                    <p className="q-text">{q?.text}</p>
                  </div>

                  {/* Options grid */}
                  <div className="options-grid">
                    {q?.options.map((option, idx) => {
                      let cls = '';
                      if (
                        ['option_locked', 'team_highlighted'].includes(
                          state.gameState,
                        ) &&
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
                                delay: 0.12,
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
                /* Standby screen */
                <motion.div
                  key={`standby-r${state.currentRound}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="standby"
                >
                  <div className="standby-icon">🎯</div>
                  <img
                    src="/show-logo.png"
                    alt="Quiz Time"
                    style={{ maxWidth: '500px', width: '100%' }}
                  />
                  <div className="standby-description">Season 1</div>
                  {currentRoundName && (
                    <div className="standby-round">
                      {currentRoundName}
                      {currentRoundLabel ? ` · ${currentRoundLabel}` : ''}
                    </div>
                  )}
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

          {/* ── Right: Leaderboard ── */}
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
                const barPct = Math.min(100, (Math.max(0, score) / 200) * 100);

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
            <span className="ticker-label">ExamAura</span>
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
                  <span className="ticker-dot">✦</span>Each team has 15 seconds
                  to answer once selected
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
