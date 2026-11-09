import { AppShell, Container } from '@mantine/core';
import { Route, Routes } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { ClassesPage } from './pages/ClassesPage';
import { HoldPage } from './pages/HoldPage';
import { MyHoldsPage } from './pages/MyHoldsPage';
import { StudentIdProvider } from './student/StudentIdContext';

export default function App() {
  return (
    <StudentIdProvider>
      <AppShell header={{ height: 70 }} padding="lg">
        <AppShell.Header>
          <TopBar />
        </AppShell.Header>

        <AppShell.Main>
          <Container size="lg">
            <Routes>
              <Route path="/" element={<ClassesPage />} />
              <Route path="/holds/:holdId" element={<HoldPage />} />
              <Route path="/me" element={<MyHoldsPage />} />
              <Route path="*" element={<p>এই পাতা নেই</p>} />
            </Routes>
          </Container>
        </AppShell.Main>
      </AppShell>
    </StudentIdProvider>
  );
}
