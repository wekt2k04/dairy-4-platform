import { Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import AuthGuard from './components/AuthGuard';

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
          <Route path="/" element={<AuthGuard><DashboardPage /></AuthGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </I18nProvider>
    </ThemeProvider>
  );
}
