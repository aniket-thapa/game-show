// src/pages/Buzzer.jsx
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

const TEAMS = [
  { name: 'Team 1', color: 'bg-red-500', activeRing: 'ring-red-400' },
  { name: 'Team 2', color: 'bg-sky-500', activeRing: 'ring-sky-400' },
  { name: 'Team 3', color: 'bg-amber-500', activeRing: 'ring-amber-400' },
  { name: 'Team 4', color: 'bg-emerald-500', activeRing: 'ring-emerald-400' },
];

export default function Buzzer() {
  const { teamId } = useParams();
  const teamIndex = parseInt(teamId, 10) - 1;
  const team = TEAMS[teamIndex] ?? TEAMS[0];
  const { state, connected, emit } = useSocket();

  const { buzzerWinner, buzzerActive } = state;
  const isMyTeamWinner = buzzerWinner === teamIndex;

  const handleBuzz = () => {
    if (buzzerActive && buzzerWinner === null) {
      emit('buzz', teamIndex);
    }
  };

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col items-center justify-center p-6 transition-colors duration-500 ${
        isMyTeamWinner ? team.color : 'bg-slate-900'
      }`}
    >
      {/* Team name */}
      <h1 className="text-2xl font-black text-white pb-6 text-center tracking-widest uppercase drop-shadow-lg">
        {team.name}
      </h1>

      {/* Big buzzer button */}
      <button
        onClick={handleBuzz}
        disabled={!buzzerActive || buzzerWinner !== null}
        className={`
          w-72 h-72 rounded-full font-black text-4xl
          transition-all duration-200 transform active:scale-90
          flex items-center justify-center select-none
          ${
            isMyTeamWinner
              ? 'bg-white text-black ring-[16px] ring-white shadow-[0_0_100px_rgba(255,255,255,0.8)]'
              : buzzerActive
                ? `${team.color} text-white hover:brightness-110 shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-8 ${team.activeRing} active:brightness-90`
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border-4 border-slate-700'
          }
        `}
      >
        {isMyTeamWinner ? '🥇 1ST!' : buzzerActive ? 'BUZZ!' : '🔒'}
      </button>

      {/* Status text */}
      <div className="mt-12 text-sm font-bold tracking-widest uppercase text-center">
        {!connected ? (
          <span className="text-yellow-400 animate-pulse">📡 Connecting…</span>
        ) : isMyTeamWinner ? (
          <span className="text-white text-lg">🏆 You buzzed first!</span>
        ) : buzzerWinner !== null ? (
          <span className="text-slate-500">Another team buzzed in</span>
        ) : buzzerActive ? (
          <span className="text-emerald-400">🟢 Ready — tap to buzz!</span>
        ) : (
          <span className="text-red-400">🔴 Waiting for next question</span>
        )}
      </div>

      {/* Connection indicator */}
      <div
        className={`mt-6 w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`}
      />
    </div>
  );
}
