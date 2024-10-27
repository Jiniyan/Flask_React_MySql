// src/components/Login.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { getCookie } from '../utils/csrfHelper';  // Import the helper function
import { useNavigate } from 'react-router-dom';
import './steinsGateStyle.css';  // Import Steins;Gate styling

const Login = () => {
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const navigate = useNavigate();

  // Check if the user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // If token is found, redirect to the dashboard
      setAuthenticated(true);
      navigate('/dashboard');
    }
  }, [navigate]);  // Run the effect when the component mounts

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      const csrftoken = getCookie('csrftoken');
  
      const response = await axios.post('http://localhost:5000/auth/login', {
        identifier: username,  // Use a generic 'identifier' for either email or username
        password,
      }, {
        headers: {
          'X-CSRFToken': csrftoken,
        },
        withCredentials: true,
      });
  
      localStorage.setItem('token', response.data.key);  // Save the token in localStorage
      setAuthenticated(true);
      setError('');
      navigate('/dashboard');  // Redirect to the dashboard
    } catch (err) {
      setError('Invalid username/email or password.');
    } finally {
      setLoading(false);
    }
  };
  

  if (authenticated) {
    return <p className="text-steins-green">Redirecting to the dashboard...</p>;
  }

  return (
    <div className="login-container steins-bg">  {/* Steins;Gate Background */}
      <div className="login-box steins-box">  {/* Steins;Gate styled box */}
        <h2 className="text-steins-green text-center mb-6">Login</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="text-steins-green">Username or Email:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-control bg-dark text-white"
              required
            />
          </div>
          <div className="form-group">
            <label className="text-steins-green">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control bg-dark text-white"
              required
            />
          </div>
          {error && <p className="error-message text-steins-green">{error}</p>}
          <button type="submit" className="btn steins-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
