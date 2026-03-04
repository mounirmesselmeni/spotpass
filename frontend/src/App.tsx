import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { LoginPage } from './pages/Login';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { DashboardPage } from './pages/Dashboard';
import { ReservationsPage } from './pages/Reservations';
import { ReservationDetailsPage } from './pages/ReservationDetails';
import { ClientsPage } from './pages/Clients';
import { TablesPage } from './pages/Tables';
import { TableAvailabilityPage } from './pages/TableAvailability';
import { ZonesPage } from './pages/Zones';
import { ProfilePage } from './pages/Profile';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reservations/:id" element={<ReservationDetailsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="tables/availability" element={<TableAvailabilityPage />} />
        <Route path="zones" element={<ZonesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
