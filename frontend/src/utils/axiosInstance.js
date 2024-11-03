// src/utils/axiosInstance.js
import axios from 'axios';
import { getCookie } from './csrfHelper';  // Helper to get CSRF token from cookies

// Determine the base URL dynamically
const isNgrok = window.location.hostname.endsWith('.ngrok.app');  // Check if the hostname ends with .ngrok.app
const axiosInstance = axios.create({
  baseURL: isNgrok ? window.location.origin : 'http://127.0.0.1:5000',  // Use Ngrok or localhost
  withCredentials: true,  // Send cookies with each request
});

// Automatically add the CSRF token and the authentication token to every request
axiosInstance.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrftoken');  // Get CSRF token from cookies
  const authToken = localStorage.getItem('token');  // Get the authentication token from localStorage

  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;  // Include CSRF token in headers
  }

  if (authToken) {
    config.headers['Authorization'] = `Token ${authToken}`;  // Include the auth token in headers
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default axiosInstance;
