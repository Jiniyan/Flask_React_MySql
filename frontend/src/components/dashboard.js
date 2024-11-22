import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/output.css';
import SimulationControls from './SimulationControls';
import WaveformDisplay from './WaveformDisplay';
import RecentTests from './RecentTests';
import Navbar from './Navbar';
import SimulationDetails from './SimulationDetails';
import axios from 'axios';

const Dashboard = () => {
  const [userId] = useState(1); // User ID remains static for now
  const [simulationId, setSimulationId] = useState(null); // Track active simulation
  const [frequency, setFrequency] = useState(0); // Frequency control
  const [amplitude, setAmplitude] = useState(0); // Amplitude control
  const [duration, setDuration] = useState(60); // Duration control (in minutes)
  const [remainingTime, setRemainingTime] = useState(0); // Remaining time in seconds
  const [vibrationLevel, setVibrationLevel] = useState('custom');
  const [waveformFrequency, setWaveformFrequency] = useState(0);
  const [waveformIntensity, setWaveformIntensity] = useState(0);
  const canvasRef = useRef(null); // Ref for waveform canvas

  // Fetch active simulation status when the component mounts
  useEffect(() => {
    const fetchSimulationStatus = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/simulation-status/${userId}`);
        if (response.data.user_simulation_id) {
          setSimulationId(response.data.user_simulation_id);
          setRemainingTime(response.data.remaining_time || 0);
          setVibrationLevel(response.data.vibration_level || 'custom');
        } else {
          setSimulationId(null);
        }
      } catch (error) {
        console.error('Error fetching simulation status:', error);
        setSimulationId(null); // Set simulationId to null if there is an error
      }
    };

    fetchSimulationStatus();
  }, [userId]);

  // Fetch vibration data for waveform periodically (either from active simulation or cache)
  useEffect(() => {
    const fetchWaveformData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/latest-vibration`);
        if (response.data) {
          setWaveformFrequency(response.data.current_frequency);
          setWaveformIntensity(response.data.current_intensity);
        }
      } catch (error) {
        console.error('Error fetching waveform data:', error);
      }
    };

    const interval = setInterval(fetchWaveformData, 1000); // Fetch every second
    return () => clearInterval(interval);
  }, [simulationId]);

  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar /> {/* Navbar component */}

      <div className="container mx-auto p-6">
        {/* Simulation Details */}
        <SimulationDetails simulationId={simulationId} remainingTime={remainingTime} />

        {/* Simulation Controls */}
        <SimulationControls
          userId={userId}
          simulationId={simulationId}
          setSimulationId={setSimulationId}
          frequency={frequency}
          setFrequency={setFrequency}
          amplitude={amplitude}
          setAmplitude={setAmplitude}
          duration={duration}
          setDuration={setDuration}
          remainingTime={remainingTime}
          setRemainingTime={setRemainingTime}
          vibrationLevel={vibrationLevel}
          setVibrationLevel={setVibrationLevel}
        />

        {/* Waveform Display */}
        <WaveformDisplay
          frequency={waveformFrequency}
          intensity={waveformIntensity}
          canvasRef={canvasRef}
        />

        {/* Recent Tests */}
        <RecentTests userId={userId} />
      </div>
    </div>
  );
};

export default Dashboard;
