import axios from 'axios';
import { getCookie } from './csrfHelper';

const isNgrok = window.location.hostname.endsWith('.ngrok.app');

const axiosInstance = axios.create({
  baseURL: isNgrok ? window.location.origin : 'http://127.0.0.1:5000',
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrftoken');

  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default axiosInstance;
