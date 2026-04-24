import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RecordsPage } from './pages/RecordsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignupPage } from './pages/SignupPage';
import { StudyPlayPage } from './pages/StudyPlayPage';
import { StudySetupPage } from './pages/StudySetupPage';
import { WrongNotesPage } from './pages/WrongNotesPage';
import { WrongPlayPage } from './pages/WrongPlayPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/study/setup" element={<StudySetupPage />} />
        <Route path="/study/play" element={<StudyPlayPage />} />
        <Route path="/wrong/play" element={<WrongPlayPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/wrong-notes" element={<WrongNotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
