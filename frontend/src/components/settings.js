import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';  // Import the Navbar component

const Settings = () => {
  // State for connection statuses
  const [platformStatus, setPlatformStatus] = useState('Checking...');
  const [vibrationSensorStatus, setVibrationSensorStatus] = useState('Checking...');
  const [temperatureSensorStatus, setTemperatureSensorStatus] = useState('Checking...');
  const [ipConnectionStatus, setIpConnectionStatus] = useState('Checking...');

  // Mock function to simulate connection and sensor status
  const checkPlatformStatus = () => {
    // Simulating status check with a timeout
    setTimeout(() => {
      setPlatformStatus(Math.random() > 0.2 ? 'Connected' : 'Disconnected');  // 80% chance of being connected
    }, 1000);
  };

  const checkVibrationSensor = () => {
    setTimeout(() => {
      setVibrationSensorStatus(Math.random() > 0.2 ? 'OK' : 'FAIL');  // 80% chance of being OK
    }, 1000);
  };

  const checkTemperatureSensor = () => {
    setTimeout(() => {
      setTemperatureSensorStatus(Math.random() > 0.2 ? 'OK' : 'FAIL');  // 80% chance of being OK
    }, 1000);
  };

  const checkIpConnection = () => {
    setTimeout(() => {
      setIpConnectionStatus(Math.random() > 0.2 ? 'Reachable' : 'Unreachable');  // 80% chance of being reachable
    }, 1000);
  };

  // Simulate checking on component mount
  useEffect(() => {
    checkPlatformStatus();
    checkVibrationSensor();
    checkTemperatureSensor();
    checkIpConnection();
  }, []);

  return (
    <div className="bg-dark text-white min-h-screen">
      {/* Navbar */}
      <Navbar />

      {/* Settings Page Content */}
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold text-steins-green">Settings</h1>
        <p className="text-lg mt-4">Here you can configure your preferences and system settings.</p>

        {/* Connection and Sensor Status Section */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-steins-green">System Status</h2>
          <div className="mt-4">
            <p><strong>Platform Connection:</strong> {platformStatus}</p>
            <p><strong>Vibration Sensor Status:</strong> {vibrationSensorStatus}</p>
            <p><strong>Temperature Sensor Status:</strong> {temperatureSensorStatus}</p>
            <p><strong>Platform IP Connection:</strong> {ipConnectionStatus}</p>
          </div>
        </div>

        {/* You can add more settings or configurations here */}
      </div>
    </div>
  );
};

export default Settings;
