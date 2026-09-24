import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/pages/DashboardLayout';
import DashboardHome from '@/pages/DashboardHome';
import LeadsPage from '@/pages/LeadsPage';
import AppointmentsPage from '@/pages/AppointmentsPage';
import HabitsPage from '@/pages/HabitsPage';
import LeadStatsPage from '@/pages/LeadStatsPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="lead-stats" element={<LeadStatsPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="habits" element={<HabitsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
