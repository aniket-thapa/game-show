// src/pages/Buzzer.jsx
import { useParams } from 'react-router-dom';
import { useBuzzer } from '../hooks/useBuzzer';
import { useEffect, useRef } from 'react';

const TEAMS = [
  { name: 'Team 1', color: 'bg-red-500', activeRing: 'ring-red-400' },
  { name: 'Team 2', color: 'bg-sky-500', activeRing: 'ring-sky-400' },
  { name: 'Team 3', color: 'bg-amber-500', activeRing: 'ring-amber-400' },
  { name: 'Team 4', color: 'bg-emerald-500', activeRing: 'ring-emerald-400' },
];

export default function Buzzer() {
  const { teamId } = useParams();
  const teamIndex = parseInt(teamId, 10) - 1;
  const team = TEAMS[teamIndex] || TEAMS[0];

  const { buzzerWinner, buzzerActive, sendBuzz } = useBuzzer();

  // Audio will ONLY play on this specific device
  const audioRef = useRef(
    new Audio(
      'https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg',
    ),
  );

  const isMyTeamWinner = buzzerWinner === teamIndex;

  useEffect(() => {
    if (isMyTeamWinner) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.error('Audio play failed', e));
    }
  }, [isMyTeamWinner]);

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col items-center justify-center p-6 transition-colors duration-300 ${isMyTeamWinner ? team.color : 'bg-slate-900'}`}
    >
      <h1 className="text-2xl font-black text-white p-6 text-center tracking-widest uppercase shadow-black drop-shadow-lg">
        {team.name}
      </h1>

      <button
        onClick={() => sendBuzz(teamIndex)}
        disabled={!buzzerActive && !isMyTeamWinner}
        className={`w-50 h-20 rounded-full font-black text-3xl transition-all transform active:scale-90 flex items-center justify-center select-none
          ${
            isMyTeamWinner
              ? 'bg-white text-black ring-[16px] ring-white shadow-[0_0_100px_rgba(255,255,255,0.8)]'
              : buzzerActive
                ? `${team.color} text-white hover:brightness-110 active:brightness-90 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-8 ${team.activeRing}`
                : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border-4 border-slate-700'
          }`}
      >
        {isMyTeamWinner ? '🥇 1ST' : buzzerActive ? 'BUZZ' : 'LOCKED'}
      </button>

      <div className="mt-16 text-slate-500 font-bold tracking-widest uppercase">
        {buzzerActive
          ? '🟢 System Ready'
          : isMyTeamWinner
            ? 'Winner!'
            : '🔴 System Locked'}
      </div>
    </div>
  );
}
