// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Admin from './pages/Admin';
import Display from './pages/Display';
import Buzzer from './pages/Buzzer';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/display" replace />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/display" element={<Display />} />
      <Route path="/buzzer/:teamId" element={<Buzzer />} />
    </Routes>
  );
}

export default App;
