import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudentIdProvider } from '../student/StudentIdContext';

export function renderRoute(path: string, route: string, element: ReactElement): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <StudentIdProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={element} />
          </Routes>
        </MemoryRouter>
      </StudentIdProvider>
    </QueryClientProvider>,
  );
}

export const testStudentId = '20152691234590001';
