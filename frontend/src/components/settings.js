import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import axiosInstance from '../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    platform: 'Checking...',
    vibration_sensor: 'Checking...',
    temperature_sensor: 'Checking...'
  });
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await axiosInstance.get('/api/sensor-status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const reconnectArduino = async () => {
    setIsReconnecting(true);
    try {
      await axiosInstance.post('/api/reconnect-arduino');
      alert('Reconnect command sent!');
      fetchStatus();
    } catch (error) {
      console.error('Error reconnecting:', error);
      alert('Failed to reconnect. Try again.');
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await axiosInstance.post('/auth/logout');
      localStorage.removeItem('token');
      navigate('/login');
      
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };
  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="bg-dark text-white min-h-screen">
      <Navbar />
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold text-steins-green">Settings</h1>
        <p className="text-lg mt-4">Manage sensors and preferences.</p>

        <div className="mt-8 p-4 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-steins-green">Sensor Details</h2>
          <div className="mt-4 space-y-2">
            <p><strong>Platform:</strong> {status.platform}</p>
            <p><strong>Vibration Sensor:</strong> {status.vibration_sensor}</p>
            <p><strong>Temperature Sensor:</strong> {status.temperature_sensor}</p>
          </div>
          <button
            onClick={reconnectArduino}
            disabled={isReconnecting}
            className={`mt-4 px-4 py-2 rounded-lg font-semibold shadow-md transition ${
              isReconnecting
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-steins-green text-black hover:bg-green-700 hover:scale-105'
            }`}
          >
            {isReconnecting ? 'Reconnecting...' : 'Reconnect Sensors'}
          </button>
        </div>

        <div className="mt-8">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`px-4 py-2 rounded-lg font-semibold shadow-md transition ${
              isLoggingOut
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-steins-red text-white hover:bg-red-700 hover:scale-105'
            }`}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
