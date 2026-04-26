import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AuthConfirmedPage } from './pages/AuthConfirmedPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ExamNotesPage } from './pages/ExamNotesPage';
import { ExamPlayPage } from './pages/ExamPlayPage';
import { ExamWrongNotesPage } from './pages/ExamWrongNotesPage';
import { ExamWrongPlayPage } from './pages/ExamWrongPlayPage';
import { HaggeutWrongNotesPage } from './pages/HaggeutWrongNotesPage';
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
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/confirmed" element={<AuthConfirmedPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/exam-notes" element={<ExamNotesPage />} />
        <Route path="/exam-notes/play" element={<ExamPlayPage />} />
        <Route path="/study/setup" element={<StudySetupPage />} />
        <Route path="/study/play" element={<StudyPlayPage />} />
        <Route path="/wrong/play" element={<WrongPlayPage />} />
        <Route path="/wrong/exam/play" element={<ExamWrongPlayPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/wrong-notes" element={<WrongNotesPage />} />
        <Route path="/wrong-notes/haggeut" element={<HaggeutWrongNotesPage />} />
        <Route path="/wrong-notes/exam" element={<ExamWrongNotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
