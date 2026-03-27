// src/hooks/useSocket.js
// Single socket hook — replaces both useGameState.js and useBuzzer.js
import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

// ── Singleton socket — one connection shared across all components ─────────────
let _socket = null;

function getSocket() {
  if (!_socket) {
    const url = `http://${window.location.hostname}:3001`;
    _socket = io(url, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      // Try WebSocket first, fall back to polling
      transports: ['websocket', 'polling'],
    });
    _socket.on('connect', () => console.log('[Socket] Connected to server'));
    _socket.on('disconnect', () =>
      console.log('[Socket] Disconnected — will retry'),
    );
    _socket.on('reconnect', (n) =>
      console.log(`[Socket] Reconnected after ${n} attempts`),
    );
  }
  return _socket;
}

// ── Sensible defaults while waiting for first server state ────────────────────
const INITIAL_STATE = {
  gameState: 'idle',
  currentQuestionIndex: 0,
  currentQuestion: null,
  activeTeam: null,
  lockedOption: null,
  scores: [0, 0, 0, 0],
  buzzerWinner: null,
  buzzerActive: false,
  totalQuestions: 0,
  // Timer fields
  timerActive: false,
  timerStartedAt: null,
  timerDuration: 15000,
  timerExpired: false,
};

export function useSocket() {
  const [state, setState] = useState(INITIAL_STATE);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onState = (s) => setState(s);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stateUpdate', onState);

    // Handle already-connected socket (e.g. hot-reload)
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('stateUpdate', onState);
    };
  }, []);

  /** Emit any event to the server */
  const emit = useCallback((event, data) => {
    getSocket().emit(event, data);
  }, []);

  /**
   * Register a handler for 'playSound' events from the server.
   * Returns a cleanup function — call it in your useEffect return.
   *
   * Usage:
   *   useEffect(() => onPlaySound((name) => playAudio(name)), [onPlaySound]);
   */
  const onPlaySound = useCallback((handler) => {
    const socket = getSocket();
    socket.on('playSound', handler);
    return () => socket.off('playSound', handler);
  }, []);

  return { state, connected, emit, onPlaySound };
}
