import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import PartnerList from './components/admin/BusinessPartners/PartnerList';
import PartnerRegistration from './components/admin/BusinessPartners/PartnerRegistration';
import AdminSettings from './components/admin/Settings/AdminSettings';
import PlanSettings from './components/admin/Settings/PlanSettings';
import PlanAssignment from './components/admin/PlanManagement/PlanAssignment';
import PlanManagement from './components/admin/PlanManagement/PlanManagement';
import DealList from './components/admin/DealManagement/DealList';
import DealForm from './components/admin/DealManagement/DealForm';
import DealDetail from './components/admin/DealManagement/DealDetail';
import Activities from './components/admin/Activities/Activities';

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Header />
              <Toast />
              <main className="container">              <Routes>
                {/* Public Routes - Always accessible */}
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/business-directory" element={<BusinessDirectory />} />
                
                {/* Authentication Routes */}
                <Route path="/login" element={<UnifiedLogin />} />
                <Route path="/unified-registration" element={<UnifiedRegistration />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/merchant/login" element={<UnifiedLogin />} />
                {/* <Route path="/merchant/register" element={<MerchantRegister />} /> */}

                {/* Deals Page for Users */}
                <Route path="/deals" element={<Deals />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/merchant/dashboard" element={
                  <ProtectedRoute>
                    <MerchantDashboard />
                  </ProtectedRoute>
                } />                <Route path="/settings" element={
                  <ProtectedRoute>
                    <UserSettings />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />                <Route path="/admin/users" element={
                  <AdminRoute>
                    <UserManagement />
                  </AdminRoute>
                } />
                <Route path="/admin/partners" element={
                  <AdminRoute>
                    <PartnerList />
                  </AdminRoute>
                } />
                <Route path="/admin/partners/register" element={
                  <AdminRoute>
                    <PartnerRegistration />
                  </AdminRoute>
                } />                <Route path="/admin/settings" element={
                  <AdminRoute>
                    <AdminSettings />
                  </AdminRoute>
                } />
                <Route path="/admin/plans-settings" element={
                  <AdminRoute>
                    <PlanSettings />
                  </AdminRoute>
                } /><Route path="/admin/users/:userId/assign-plan" element={
                  <AdminRoute>
                    <PlanAssignment />
                  </AdminRoute>
                } />
                <Route path="/admin/plans" element={
                  <AdminRoute>
                    <PlanManagement />
                  </AdminRoute>
                } />
                <Route path="/admin/deals" element={
                  <AdminRoute>
                    <DealList />
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
                } />                <Route path="/admin/deals/:dealId/edit" element={
                  <AdminRoute>
                    <DealForm />
                  </AdminRoute>
                } />                <Route path="/admin/activities" element={
                  <AdminRoute>
                    <Activities />
                  </AdminRoute>
                } />
              </Routes>            </main>            <Footer />
          </div>
        </Router>
      </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
