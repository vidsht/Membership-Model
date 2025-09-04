import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PerformanceOptimizer, { PerformanceDevTools, usePerformanceOptimizations } from './components/PerformanceOptimizer';
import { usePerformanceValidation } from './utils/performanceValidation';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/admin/AdminRoute';

// Critical routes - load immediately
import Home from './pages/Home';
import UnifiedLogin from './pages/UnifiedLogin';
import UnifiedRegistration from './pages/UnifiedRegistration';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import MerchantDashboard from './pages/MerchantDashboard';

// Lazy load non-critical routes for better performance
const BusinessDirectory = lazy(() => import('./components/BusinessDirectory'));
const Deals = lazy(() => import('./pages/Deals'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Terms = lazy(() => import('./pages/Terms'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));
const BusinessBenefits = lazy(() => import('./pages/BusinessBenefits'));
const MemberBenefits = lazy(() => import('./pages/MemberBenefits'));

// Admin routes - lazy loaded
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./components/admin/UserManagement/UserManagement'));
const UserForm = lazy(() => import('./components/admin/UserManagement/UserForm'));
const UserDetailPage = lazy(() => import('./components/admin/UserManagement/UserDetailPage'));
const UserDetailEdit = lazy(() => import('./components/admin/UserManagement/UserDetailEdit'));
const AdminSettings = lazy(() => import('./components/admin/Settings/AdminSettings'));
const PlanSettings = lazy(() => import('./components/admin/Settings/PlanSettings'));
const PlanAssignment = lazy(() => import('./components/admin/PlanManagement/PlanAssignment'));
const PlanManagement = lazy(() => import('./components/admin/PlanManagement/PlanManagement'));
const DealList = lazy(() => import('./components/admin/DealManagement/DealList'));
const DealForm = lazy(() => import('./components/admin/DealManagement/DealForm'));
const DealDetail = lazy(() => import('./components/admin/DealManagement/DealDetail'));
const Activities = lazy(() => import('./components/admin/Activities/Activities'));
const PartnerRegistration = lazy(() => import('./components/admin/BusinessPartners/PartnerRegistration'));
const PartnerDetail = lazy(() => import('./components/admin/BusinessPartners/PartnerDetail'));
const QuickEditDealLimit = lazy(() => import('./components/admin/BusinessPartners/QuickEditDealLimit'));
const MerchantDetailEdit = lazy(() => import('./components/admin/BusinessPartners/MerchantDetailEdit'));
const MerchantManagementEnhanced = lazy(() => import('./components/admin/BusinessPartners/MerchantManagementEnhanced'));

// ScrollToTop component
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const location = useLocation();
  const hideHeaderRoutes = ['/login', '/unified-registration'];
  const showHeader = !hideHeaderRoutes.includes(location.pathname);
  
  // Initialize performance optimizations and validation
  usePerformanceOptimizations();
  usePerformanceValidation();

  // Loading fallback component for lazy routes
  const LazyFallback = () => (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center',
      minHeight: '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div>Loading...</div>
    </div>
  );

  return (
    <>
      <ScrollToTop />
      <div className="app">
        {showHeader && <Header />}
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<UnifiedLogin />} />
            <Route path="/unified-registration" element={<UnifiedRegistration />} />
            <Route path="/business-directory" element={
              <Suspense fallback={<LazyFallback />}>
                <BusinessDirectory />
              </Suspense>
            } />
            <Route path="/deals" element={
              <Suspense fallback={<LazyFallback />}>
                <Deals />
              </Suspense>
            } />
            <Route path="/about" element={
              <Suspense fallback={<LazyFallback />}>
                <About />
              </Suspense>
            } />
            <Route path="/contact" element={
              <Suspense fallback={<LazyFallback />}>
                <Contact />
              </Suspense>
            } />
            <Route path="/terms" element={
              <Suspense fallback={<LazyFallback />}>
                <Terms />
              </Suspense>
            } />
            <Route path="/disclaimer" element={
              <Suspense fallback={<LazyFallback />}>
                <Disclaimer />
              </Suspense>
            } />
            <Route path="/business-benefits" element={
              <Suspense fallback={<LazyFallback />}>
                <BusinessBenefits />
              </Suspense>
            } />
            <Route path="/member-benefits" element={
              <Suspense fallback={<LazyFallback />}>
                <MemberBenefits />
              </Suspense>
            } />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/merchant-dashboard" element={
              <ProtectedRoute>
                <Suspense fallback={<LazyFallback />}>
                  <MerchantDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Suspense fallback={<LazyFallback />}>
                  <UserSettings />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <AdminDashboard />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/users" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <UserManagement />
                </Suspense>
              </AdminRoute>
            } />

            <Route path="/admin/users/create" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <UserForm />
                </Suspense>
              </AdminRoute>
            } />

            <Route path="/admin/users/:userId" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <UserDetailPage />
                </Suspense>
              </AdminRoute>
            } />

            <Route path="/admin/users/:userId/details" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <UserDetailEdit />
                </Suspense>
              </AdminRoute>
            } />

            <Route path="/admin/users/:userId/edit" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <UserForm />
                </Suspense>
              </AdminRoute>
            } />

            <Route path="/admin/users/:userId/assign-plan" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <PlanAssignment />
                </Suspense>
              </AdminRoute>
            } />
            
            {/* Business Partner Routes */}
            <Route path="/admin/partners" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <MerchantManagementEnhanced />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/partners/register" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <PartnerRegistration />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/partners/:id/edit" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <PartnerRegistration />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/partners/:id" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <PartnerDetail />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/partners/:id/details" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <PartnerDetail />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/partners/:id/detail-edit" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <MerchantDetailEdit />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/partners/:id/quick-edit" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <QuickEditDealLimit />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/settings" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <AdminSettings />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/plans-settings" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <PlanSettings />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/plan-assignment" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <PlanAssignment />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/plan-management" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <PlanManagement />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/plan-management/users/:userId/assign-plan" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <PlanAssignment />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/deals/create" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <DealForm />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/deals/:dealId" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <DealDetail />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/deals/:dealId/edit" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <DealForm />
                </Suspense>
              </AdminRoute>
            } />
            
            <Route path="/admin/activities" element={
              <AdminRoute>
                <Suspense fallback={<LazyFallback />}>
                  <Activities />
                </Suspense>
              </AdminRoute>
            } />
          </Routes>
        </main>
        {showHeader && <Footer />}
        <Toast />
        <PerformanceDevTools />
      </div>
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <ErrorBoundary>
          <PerformanceOptimizer>
            <AuthProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </AuthProvider>
          </PerformanceOptimizer>
        </ErrorBoundary>
      </Router>
    </HelmetProvider>
  );
}

export default App;
