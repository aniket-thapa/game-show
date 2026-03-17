import { Routes, Route, Navigate } from 'react-router-dom';
import Admin from './pages/Admin';
import Display from './pages/Display';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/display" replace />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/display" element={<Display />} />
    </Routes>
  );
}

export default App;
