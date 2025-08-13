import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';
import Home from './pages/Home';
import UnifiedLogin from './pages/UnifiedLogin';
import UnifiedRegistration from './pages/UnifiedRegistration';
import BusinessDirectory from './components/BusinessDirectory';
import Deals from './pages/Deals';
// import Register from './pages/UserRegister';
// import RegisterClean from './pages/RegisterClean';
// import MerchantRegister from './pages/MerchantRegister';
import MerchantDashboard from './pages/MerchantDashboard';
import Dashboard from './pages/Dashboard';
import UserSettings from './pages/UserSettings';
import About from './pages/About';
import Contact from './pages/Contact';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/admin/AdminRoute';
import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement/UserManagement';
import UserForm from './components/admin/UserManagement/UserForm';
import UserDetailPage from './components/admin/UserManagement/UserDetailPage';
import AdminSettings from './components/admin/Settings/AdminSettings';
import PlanSettings from './components/admin/Settings/PlanSettings';
import PlanAssignment from './components/admin/PlanManagement/PlanAssignment';
import PlanManagement from './components/admin/PlanManagement/PlanManagement';
import DealList from './components/admin/DealManagement/DealList';
import DealForm from './components/admin/DealManagement/DealForm';
import DealDetail from './components/admin/DealManagement/DealDetail';
import Activities from './components/admin/Activities/Activities';
import PartnerRegistration from './components/admin/BusinessPartners/PartnerRegistration';
import PartnerDetail from './components/admin/BusinessPartners/PartnerDetail';
import QuickEditDealLimit from './components/admin/BusinessPartners/QuickEditDealLimit';

function AppContent() {
  const location = useLocation();
  const hideHeaderRoutes = ['/login', '/unified-registration'];
  const showHeader = !hideHeaderRoutes.includes(location.pathname);

  return (
    <div className="app">
      {showHeader && <Header />}
      <main className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<UnifiedLogin />} />
          <Route path="/unified-registration" element={<UnifiedRegistration />} />
          <Route path="/business-directory" element={<BusinessDirectory />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/merchant-dashboard" element={
            <ProtectedRoute>
              <MerchantDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <UserSettings />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          
          <Route path="/admin/users" element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          } />

          <Route path="/admin/users/create" element={
            <AdminRoute>
              <UserForm />
            </AdminRoute>
          } />

          <Route path="/admin/users/:userId" element={
            <AdminRoute>
              <UserDetailPage />
            </AdminRoute>
          } />

          <Route path="/admin/users/:userId/edit" element={
            <AdminRoute>
              <UserForm />
            </AdminRoute>
          } />

          <Route path="/admin/users/:userId/assign-plan" element={
            <AdminRoute>
              <PlanAssignment />
            </AdminRoute>
          } />
          
          {/* Business Partner Routes */}
          <Route path="/admin/partners" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          
          <Route path="/admin/partners/register" element={
            <AdminRoute>
              <PartnerRegistration />
            </AdminRoute>
          } />
          
          <Route path="/admin/partners/:id/edit" element={
            <AdminRoute>
              <PartnerRegistration />
            </AdminRoute>
          } />
          
          <Route path="/admin/partners/:id" element={
            <AdminRoute>
              <PartnerDetail />
            </AdminRoute>
          } />
          
          <Route path="/admin/partners/:id/details" element={
            <AdminRoute>
              <PartnerDetail />
            </AdminRoute>
          } />
          
          <Route path="/admin/partners/:id/quick-edit" element={
            <AdminRoute>
              <QuickEditDealLimit />
            </AdminRoute>
          } />
          
          <Route path="/admin/settings" element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          } />
          
          <Route path="/admin/plans-settings" element={
            <AdminRoute>
              <PlanSettings />
            </AdminRoute>
          } />
          
          <Route path="/admin/plan-assignment" element={
            <AdminRoute>
              <PlanAssignment />
            </AdminRoute>
          } />
          
          <Route path="/admin/plan-management" element={
            <AdminRoute>
              <PlanManagement />
            </AdminRoute>
          } />
          
          <Route path="/admin/plan-management/users/:userId/assign-plan" element={
            <AdminRoute>
              <PlanAssignment />
            </AdminRoute>
          } />
          
          <Route path="/admin/deals/create" element={
            <AdminRoute>
              <DealForm />
            </AdminRoute>
          } />
          
          <Route path="/admin/deals/:dealId" element={
            <AdminRoute>
              <DealDetail />
            </AdminRoute>
          } />
          
          <Route path="/admin/deals/:dealId/edit" element={
            <AdminRoute>
              <DealForm />
            </AdminRoute>
          } />
          
          <Route path="/admin/activities" element={
            <AdminRoute>
              <Activities />
            </AdminRoute>
          } />
        </Routes>
      </main>
      {showHeader && <Footer />}
      <Toast />
    </div>
  );
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
