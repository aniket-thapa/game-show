// src/hooks/useBuzzer.js
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Connect to the socket server running on port 3001 on the same host machine
const socket = io(`http://${window.location.hostname}:3001`);

export function useBuzzer() {
  const [buzzerState, setBuzzerState] = useState({
    buzzerWinner: null,
    buzzerActive: false,
  });

  useEffect(() => {
    socket.on('buzzerState', (state) => {
      setBuzzerState(state);
    });

    return () => {
      socket.off('buzzerState');
    };
  }, []);

  const sendBuzz = (teamIndex) => socket.emit('buzz', teamIndex);
  const resetBuzzer = () => socket.emit('resetBuzzer');
  const pauseBuzzer = () => socket.emit('pauseBuzzer');

  return { ...buzzerState, sendBuzz, resetBuzzer, pauseBuzzer };
}
