/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import AdminDashboard from './pages/AdminDashboard';
import AdminMenu from './pages/AdminMenu';
import AdminFinances from './pages/AdminFinances';

import Profile from './pages/Profile';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  
  // Requirement: Email must be verified to access protected routes
  if (!user.emailVerified) return <Navigate to="/login" />;

  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<Layout />}>
              {/* User Routes */}
              <Route index element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
              <Route path="orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="orders/:id" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
              <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              
              {/* Admin Routes */}
              <Route path="admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
              <Route path="admin/menu" element={<ProtectedRoute adminOnly><AdminMenu /></ProtectedRoute>} />
              <Route path="admin/finances" element={<ProtectedRoute adminOnly><AdminFinances /></ProtectedRoute>} />
              <Route path="admin/orders/:id" element={<ProtectedRoute adminOnly><OrderDetails /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
