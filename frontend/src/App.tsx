import { AppShell } from '@mantine/core';
import { Route, Routes } from 'react-router-dom';
import { ShellHeader } from './components/ShellHeader';
import { NavRail } from './components/NavRail';
import { ClassesPage } from './pages/ClassesPage';
import { HoldPage } from './pages/HoldPage';
import { MyHoldsPage } from './pages/MyHoldsPage';
import { StudentIdProvider } from './student/StudentIdContext';

export default function App() {
  return (
    <StudentIdProvider>
      <AppShell header={{ height: 70 }} padding={0}>
        <AppShell.Header className="shell-header">
          <ShellHeader />
        </AppShell.Header>

        <AppShell.Main>
          <div className="shell-main">
            <nav className="mobile-nav" aria-label="মোবাইল মেনু">
              <NavRail />
            </nav>
            <main className="content">
              <Routes>
                <Route path="/" element={<ClassesPage />} />
                <Route path="/holds/:holdId" element={<HoldPage />} />
                <Route path="/me" element={<MyHoldsPage />} />
                <Route
                  path="*"
                  element={
                    <div className="empty-classes-state">
                      <h3>এই পাতা নেই</h3>
                      <p>অনুরোধকৃত পাতাটি খুঁজে পাওয়া যায়নি।</p>
                    </div>
                  }
                />
              </Routes>
            </main>
          </div>
        </AppShell.Main>
      </AppShell>
    </StudentIdProvider>
  );
}
