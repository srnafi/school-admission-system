import { Route, Routes } from 'react-router-dom';
import { ShellHeader } from './components/ShellHeader';
import { ClassesPage } from './pages/ClassesPage';
import { HoldPage } from './pages/HoldPage';
import { MyHoldsPage } from './pages/MyHoldsPage';
import { StudentIdProvider } from './student/StudentIdContext';
import { labels, sessionLabel } from './strings';

function NotFoundPage() {
  return (
    <div className="page">
      <section className="sheet">
        <div className="state">
          <h3>{labels.notFoundTitle}</h3>
          <p>{labels.notFoundNote}</p>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <StudentIdProvider>
      <ShellHeader />
      <Routes>
        <Route path="/" element={<ClassesPage />} />
        <Route path="/holds/:holdId" element={<HoldPage />} />
        <Route path="/me" element={<MyHoldsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <footer className="foot">
        <span>
          <b>{labels.title}</b> · {labels.subtitle}
        </span>
        <span>{sessionLabel()} · আসনের তথ্য সরাসরি ডেটাবেজ থেকে আসছে</span>
      </footer>
    </StudentIdProvider>
  );
}
