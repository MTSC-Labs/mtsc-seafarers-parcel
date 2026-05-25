import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import RegisterPage from './pages/seafarer/RegisterPage';
import LoginPage from './pages/seafarer/LoginPage';
import ForgotPasswordPage from './pages/seafarer/ForgotPasswordPage';
import DashboardPage from './pages/seafarer/DashboardPage';
import NewParcelPage from './pages/seafarer/NewParcelPage';
import PaymentSuccessPage from './pages/seafarer/PaymentSuccessPage';
import PaymentCancelPage from './pages/seafarer/PaymentCancelPage';
import PastPickupsPage from './pages/seafarer/PastPickupsPage';
import TermsPage from './pages/seafarer/TermsPage';
import StaffLoginPage from './pages/staff/StaffLoginPage';
import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import CompletedPage from './pages/staff/CompletedPage';
import ReportsPage from './pages/staff/ReportsPage';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    const isStaffPath = location.pathname.startsWith('/staff');
    return <Navigate to={isStaffPath ? "/staff/login" : "/login"} />;
  }
  if (role && user.role !== role) {
    // Admins can access staff routes
    if (role === 'staff' && user.role === 'admin') return children;
    
    const target = user.role === 'staff' || user.role === 'admin' ? '/staff/dashboard' : '/dashboard';
    return <Navigate to={target} />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/login" element={user ? <Navigate to={user.role === 'staff' ? '/staff/dashboard' : '/dashboard'} /> : <LoginPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} />
      <Route path="/staff/login" element={user ? <Navigate to="/staff/dashboard" /> : <StaffLoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute role="seafarer"><DashboardPage /></ProtectedRoute>} />
      <Route path="/parcels/new" element={<ProtectedRoute role="seafarer"><NewParcelPage /></ProtectedRoute>} />
      <Route path="/payment/success" element={<ProtectedRoute role="seafarer"><PaymentSuccessPage /></ProtectedRoute>} />
      <Route path="/payment/cancel" element={<ProtectedRoute role="seafarer"><PaymentCancelPage /></ProtectedRoute>} />
      <Route path="/past-pickups" element={<ProtectedRoute role="seafarer"><PastPickupsPage /></ProtectedRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/staff/dashboard" element={<ProtectedRoute role="staff"><StaffDashboardPage /></ProtectedRoute>} />
      <Route path="/staff/completed" element={<ProtectedRoute role="staff"><CompletedPage /></ProtectedRoute>} />
      <Route path="/staff/reports" element={<ProtectedRoute role="staff"><ReportsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function AppContent() {
  const location = useLocation();
  const hideNavbarPaths = ['/login', '/register', '/forgot-password', '/staff/login'];
  const shouldHideNavbar = hideNavbarPaths.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <AppRoutes />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
