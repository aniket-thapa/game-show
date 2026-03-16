import { useState } from 'react';
import { useGameState, QUESTION_BANK } from '../hooks/useGameState';

export default function Admin() {
  const { state, updateState, resetState, nextQuestion } = useGameState();

  const handleNextQuestion = () => {
    nextQuestion();
    setTimeout(() => {
      updateState({ triggerEffect: null });
    }, 500);
  };

  const highlightTeam = (teamIndex) => {
    updateState({
      activeTeam: teamIndex,
      gameState: 'team_highlighted',
      triggerEffect: 'buzzer',
    });
    setTimeout(() => updateState({ triggerEffect: null }), 500);
  };

  const lockOption = (optionIndex) => {
    updateState({ lockedOption: optionIndex, gameState: 'option_locked' });
  };

  const submitAnswer = (isCorrect) => {
    if (state.activeTeam === null || state.currentQuestion === null) return;

    const newScores = [...state.scores];

    if (isCorrect) {
      newScores[state.activeTeam] += 10;
      updateState({
        gameState: 'revealed',
        scores: newScores,
        triggerEffect: 'win',
      });
    } else {
      if (newScores[state.activeTeam] >= 10) {
        newScores[state.activeTeam] -= 10;
      }
      updateState({
        gameState: 'revealed',
        scores: newScores,
        triggerEffect: 'lose',
      });
    }

    setTimeout(() => updateState({ triggerEffect: null }), 500);
  };

  const handleIdle = () => {
    updateState({
      gameState: 'idle',
      activeTeam: null,
      lockedOption: null,
      triggerEffect: null,
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Operator Dashboard</h1>
          <button
            onClick={() => window.open('/display', '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700"
          >
            Open Display
          </button>
        </header>

        <section className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-semibold border-b pb-2 flex-grow">1. Game State & Setup</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
               <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="font-bold mb-2">Current Question Bank:</h3>
                  <p className="text-sm mb-1"><strong>Q:</strong> {state.currentQuestion?.text}</p>
                  <p className="text-sm font-semibold text-green-600">Correct Answer: {state.currentQuestion?.options[state.currentQuestion?.correctAnswerIndex]}</p>
               </div>
            </div>

            <div className="flex flex-col justify-center space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="font-semibold mb-2">
                  Current Status: <span className="text-blue-600 uppercase">{state.gameState}</span>
                </p>
                <p className="text-sm mb-1">
                  Team: {state.activeTeam !== null ? state.activeTeam + 1 : 'None'}
                </p>
                <p className="text-sm">
                  Option Locked: {state.lockedOption !== null ? ['A', 'B', 'C', 'D'][state.lockedOption] : 'None'}
                </p>
              </div>

              <button
                onClick={handleNextQuestion}
                className="w-full px-4 py-3 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 active:scale-95 transition-transform"
              >
                Next Question from Bank (Whoosh)
              </button>
              <button
                onClick={handleIdle}
                className="w-full px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-600 active:scale-95 transition-transform"
              >
                Reset to Idle Screen
              </button>
              <button
                onClick={() => {
                  if (confirm('Reset ALL scores and state to beginning?'))
                    resetState();
                }}
                className="w-full px-4 py-2 border border-red-500 text-red-600 font-semibold rounded-lg shadow-sm hover:bg-red-50 active:scale-95 transition-transform mt-2"
              >
                Full Game Reset
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">2. Live Game Controls</h2>

          <div className="mb-6">
            <h3 className="font-medium mb-3 text-gray-500">Highlight Team (Buzzer)</h3>
            <div className="grid grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((team) => (
                <button
                  key={	eam-$team}
                  onClick={() => highlightTeam(team)}
                  className={"py-3 rounded-lg font-bold transition-colors $"{
                    state.activeTeam === team ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }}
                >
                  Team {team + 1}
                  <div className="text-sm font-normal opacity-90">Score: {state.scores[team]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-medium mb-3 text-gray-500">Lock Answer Choice</h3>
            <div className="grid grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((opt) => (
                <button
                  key={opt-$opt}
                  onClick={() => lockOption(opt)}
                  className={"py-3 rounded-lg font-bold transition-colors $"{
                    state.lockedOption === opt ? 'bg-yellow-500 text-white shadow-md' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }}
                >
                  Option {['A', 'B', 'C', 'D'][opt]}
                </button>
              ))}
            </div>
          </div>

           <div>
            <h3 className="font-medium mb-3 text-gray-500">Submit Answer (Auto Verify)</h3>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => submitAnswer(state.lockedOption === state.currentQuestion?.correctAnswerIndex)}
                disabled={state.activeTeam === null || state.lockedOption === null}
                className="py-4 rounded-xl font-bold bg-indigo-600 text-white text-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
              >
                Reveal & Verify Answer
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
