import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewMeetingPage } from '@/pages/NewMeetingPage';
import { ProcessingPage } from '@/pages/ProcessingPage';
import { MeetingDetailPage } from '@/pages/MeetingDetailPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SharedMeetingPage } from '@/pages/SharedMeetingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/shared/:token" element={<SharedMeetingPage />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/meeting/new" element={<NewMeetingPage />} />
          <Route path="/meeting/:id/processing" element={<ProcessingPage />} />
          <Route path="/meeting/:id" element={<MeetingDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <p className="fixed top-2 left-3 text-[10px] text-gray-400 select-none pointer-events-none z-50">
        © David HS Kim
      </p>
    </BrowserRouter>
  );
}
