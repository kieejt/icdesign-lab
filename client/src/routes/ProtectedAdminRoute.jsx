import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedAdminRoute() {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }

  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    
    if (payload.role !== 'admin') {
      return <Navigate to="/" replace />
    }
  } catch (error) {
    localStorage.removeItem('token')
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
