// src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

// This component will check if the user is authenticated
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');  // Check if the token exists in localStorage

  if (!isAuthenticated) {
    return <Navigate to="/login" />;  // Redirect to login if not authenticated
  }

  return children;  // Render the protected component if authenticated
};

export default PrivateRoute;
