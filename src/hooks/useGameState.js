import { useState, useEffect } from 'react';

const STORAGE_KEY = 'gameShowState';

export const QUESTION_BANK = [
  {
    text: 'What is the capital of France?',
    options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
    correctAnswerIndex: 2,
  },
  {
    text: 'Which planet is known as the Red Planet?',
    options: ['Mars', 'Venus', 'Jupiter', 'Saturn'],
    correctAnswerIndex: 0,
  },
  {
    text: 'What does HTML stand for?',
    options: [
      'Hyper Text Markup Language',
      'High Tech Machine Learning',
      'Home Tool Markup Language',
      'Hyperlinks and Text Markup Language',
    ],
    correctAnswerIndex: 0,
  },
  {
    text: 'Who painted the Mona Lisa?',
    options: [
      'Vincent van Gogh',
      'Pablo Picasso',
      'Leonardo da Vinci',
      'Michelangelo',
    ],
    correctAnswerIndex: 2,
  },
];

export const defaultState = {
  gameState: 'idle', // idle, question_active, team_highlighted, option_locked, revealed
  currentQuestionIndex: 0,
  currentQuestion: QUESTION_BANK[0],
  activeTeam: null,
  lockedOption: null,
  scores: [0, 0, 0, 0],
  triggerEffect: null, // whoosh, buzzer, win, lose
};

export function useGameState() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultState;
    } catch (e) {
      return defaultState;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) setState(JSON.parse(e.newValue));
      else if (e.key === STORAGE_KEY && !e.newValue) setState(defaultState);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateState = (newStateUpdates) => {
    setState((prevState) => {
      const merged = { ...prevState, ...newStateUpdates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const resetState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    setState(defaultState);
  };

  const nextQuestion = () => {
    setState((prevState) => {
      let nextIndex =
        (prevState.currentQuestionIndex + 1) % QUESTION_BANK.length;
      const merged = {
        ...prevState,
        gameState: 'question_active',
        currentQuestionIndex: nextIndex,
        currentQuestion: QUESTION_BANK[nextIndex],
        activeTeam: null,
        lockedOption: null,
        triggerEffect: 'whoosh',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  return { state, updateState, resetState, nextQuestion };
}
