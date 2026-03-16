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
  {
    text: 'What is the largest ocean on Earth?',
    options: [
      'Atlantic Ocean',
      'Indian Ocean',
      'Arctic Ocean',
      'Pacific Ocean',
    ],
    correctAnswerIndex: 3,
  },
  {
    text: 'What is the powerhouse of the cell?',
    options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Endoplasmic Reticulum'],
    correctAnswerIndex: 2,
  },
  {
    text: 'Which element has the chemical symbol "O"?',
    options: ['Osmium', 'Oxygen', 'Oganesson', 'Gold'],
    correctAnswerIndex: 1,
  },
];

export const defaultState = {
  gameState: 'idle',
  currentQuestionIndex: 0,
  currentQuestion: QUESTION_BANK[0],
  activeTeam: null,
  lockedOption: null,
  scores: [0, 0, 0, 0],
  triggerEffect: null,
};

export function useGameState() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultState;
    } catch (e) {
      console.error('Failed to parse game state from local storage', e);
      return defaultState;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Error parsing new storage value', err);
        }
      } else if (e.key === STORAGE_KEY && !e.newValue) {
        setState(defaultState);
      }
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
      let nextIndex = prevState.currentQuestionIndex + 1;
      if (nextIndex >= QUESTION_BANK.length) nextIndex = 0;
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
