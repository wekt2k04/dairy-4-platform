import { Navigate, Route, Routes } from 'react-router-dom';

import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SimulatePage from './pages/SimulatePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/simulate" element={<SimulatePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
