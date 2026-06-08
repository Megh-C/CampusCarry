import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import AdminLayout from '@/layouts/AdminLayout'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import SignupInitiatePage from '@/pages/auth/SignupInitiatePage'
import SignupVerifyPage from '@/pages/auth/SignupVerifyPage'
import SignupCompletePage from '@/pages/auth/SignupCompletePage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Student
import FeedPage from '@/pages/student/FeedPage'
import CreateOrderPage from '@/pages/student/CreateOrderPage'
import MyOrdersPage from '@/pages/student/MyOrdersPage'
import OrderDetailPage from '@/pages/student/OrderDetailPage'
import ProfilePage from '@/pages/student/ProfilePage'

// Admin
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage'
import AdminOrderDetailPage from '@/pages/admin/AdminOrderDetailPage'
import AdminLocationsPage from '@/pages/admin/AdminLocationsPage'
import AdminPricingPage from '@/pages/admin/AdminPricingPage'
import AdminFailedPaymentsPage from '@/pages/admin/AdminFailedPaymentsPage'

import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Auth (public) ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupInitiatePage />} />
          <Route path="/signup/verify-otp" element={<SignupVerifyPage />} />
          <Route path="/signup/complete" element={<SignupCompletePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ── Student app ── */}
          <Route element={<ProtectedRoute role="STUDENT"><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/orders/new" element={<CreateOrderPage />} />
            <Route path="/orders/me" element={<MyOrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* ── Admin ── */}
          <Route element={<ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="/admin/locations" element={<AdminLocationsPage />} />
            <Route path="/admin/pricing" element={<AdminPricingPage />} />
            <Route path="/admin/payments/failed" element={<AdminFailedPaymentsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', fontSize: '14px', fontWeight: '500' },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
