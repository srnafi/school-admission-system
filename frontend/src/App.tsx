import { Route, Routes } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { ClassesPage } from './pages/ClassesPage';
import { HoldPage } from './pages/HoldPage';
import { MyHoldsPage } from './pages/MyHoldsPage';
import { StudentIdProvider } from './student/StudentIdContext';

export default function App() {
  return (
    <StudentIdProvider>
      <TopBar />
      <main>
        <Routes>
          <Route path="/" element={<ClassesPage />} />
          <Route path="/holds/:holdId" element={<HoldPage />} />
          <Route path="/me" element={<MyHoldsPage />} />
          <Route path="*" element={<p className="hint">এই পাতা নেই</p>} />
        </Routes>
      </main>
    </StudentIdProvider>
  );
}
