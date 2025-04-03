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

  const fetchStatus = async () => {
    try {
      const response = await axiosInstance.get('/api/sensor-status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const reconnectArduino = async () => {
    try {
      await axiosInstance.post('/api/reconnect-arduino');
      fetchStatus();  // Optionally refresh status
    } catch (error) {
      console.error('Error reconnecting:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
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
        <p className="text-lg mt-4">Manage sensors and user preferences.</p>

        <div className="mt-8 p-4 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-steins-green">Sensor Details</h2>
          <div className="mt-4 space-y-2">
            <p><strong>Platform:</strong> {status.platform}</p>
            <p><strong>Vibration Sensor:</strong> {status.vibration_sensor}</p>
            <p><strong>Temperature Sensor:</strong> {status.temperature_sensor}</p>
          </div>
          <button onClick={reconnectArduino} className="btn btn-steins-green mt-4">Reconnect Sensors</button>
        </div>

        <div className="mt-8">
          <button onClick={handleLogout} className="btn btn-steins-red">Logout</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
