import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ClassesPage from './pages/ClassesPage';
import HoldPage from './pages/HoldPage';
import MyHoldsPage from './pages/MyHoldsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ClassesPage />} />
        <Route path="/holds/:holdId" element={<HoldPage />} />
        <Route path="/me" element={<MyHoldsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
