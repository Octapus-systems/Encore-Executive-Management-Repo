import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/auth';
import { ManagementLayout, RequireManagement } from '@/components/Layout';
import Login from '@/pages/Login';
import InvoiceView from '@/pages/InvoiceView';
import { Alerts } from '@/pages/shared';
import Dashboard from '@/pages/admin/Dashboard';
import Bookings from '@/pages/admin/Bookings';
import BookingDetail from '@/pages/admin/BookingDetail';
import NewBooking from '@/pages/admin/NewBooking';
import Calendar from '@/pages/admin/Calendar';
import LiveMap from '@/pages/admin/LiveMap';
import { Fleet, Drivers, Operators } from '@/pages/admin/Resources';
import Customers from '@/pages/admin/Customers';
import { Payments, Invoices } from '@/pages/admin/Money';
import { MessagesLog, ActivityLog, Settings } from '@/pages/admin/Control';
import Team from '@/pages/admin/Team';
import Reports from '@/pages/admin/Reports';
import Inbox from '@/pages/admin/Inbox';

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireManagement />}>
              <Route path="/admin" element={<ManagementLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="bookings/new" element={<NewBooking />} />
                <Route path="bookings/:id" element={<BookingDetail />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="live" element={<LiveMap />} />
                <Route path="fleet" element={<Fleet />} />
                <Route path="drivers" element={<Drivers />} />
                <Route path="operators" element={<Operators />} />
                <Route path="customers" element={<Customers />} />
                <Route path="payments" element={<Payments />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="invoices/:id" element={<InvoiceView back="/admin/invoices" />} />
                <Route path="messages" element={<MessagesLog />} />
                <Route path="inbox" element={<Alerts />} />
                <Route path="activity" element={<ActivityLog />} />
                <Route path="team" element={<Team />} />
                <Route path="reports" element={<Reports />} />
                <Route path="conversations" element={<Inbox />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
