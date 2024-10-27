// src/components/Register.js
import React, { useState } from 'react';
import axios from 'axios';
import './steinsGateStyle.css';
import '../styles/output.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password1 !== password2) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/auth/registration/', {
        username,
        email,
        password1,
        password2,
      });
      setError('');
      alert('Registration successful!');
    } catch (err) {
      setError('Failed to register. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container fade-in">
      <h2 className="text-steins-green text-center mb-4">Register</h2>
      <form onSubmit={handleRegister} className="text-steins-green">
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-control bg-dark text-white"
            required
          />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-control bg-dark text-white"
            required
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            className="form-control bg-dark text-white"
            required
          />
        </div>
        <div className="form-group">
          <label>Confirm Password:</label>
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="form-control bg-dark text-white"
            required
          />
        </div>
        {error && <p className="text-danger">{error}</p>}
        <button type="submit" className="btn btn-hover-green mt-3">
          {loading ? <div className="loader"></div> : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;
