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
      <AppShell
        header={{ height: 56 }}
        navbar={{ width: 232, breakpoint: 'sm', collapsed: { mobile: true } }}
        padding={0}
      >
        <AppShell.Header className="shell-header">
          <ShellHeader />
        </AppShell.Header>

        <AppShell.Navbar className="shell-rail">
          <NavRail />
        </AppShell.Navbar>

        <AppShell.Main>
          <div className="shell-main">
            <nav className="mobile-nav">
              <NavRail />
            </nav>
            <div className="content">
              <Routes>
                <Route path="/" element={<ClassesPage />} />
                <Route path="/holds/:holdId" element={<HoldPage />} />
                <Route path="/me" element={<MyHoldsPage />} />
                <Route path="*" element={<p>এই পাতা নেই</p>} />
              </Routes>
            </div>
          </div>
        </AppShell.Main>
      </AppShell>
    </StudentIdProvider>
  );
}
