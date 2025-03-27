  import React, { useState, useEffect, useRef } from 'react';
  import 'bootstrap/dist/css/bootstrap.min.css';
  import '../styles/output.css';
  import SimulationControls from './SimulationControls';
  import WaveformDisplay from './WaveformDisplay';
  import RecentTests from './RecentTests';
  import Navbar from './Navbar';
  import SimulationDetails from './SimulationDetails';
  import axios from 'axios';
  import BatteryStatus from './BatteryStatus'; // <-- Import the new component
  

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
    const [batteryVoltage, setBatteryVoltage] = useState(0);
    const [batteryTemperature, setBatteryTemperature] = useState(0);
    const [batteryHistory, setBatteryHistory] = useState([]);
    const [waveformHistory, setWaveformHistory] = useState([]);
    const [simulationStartTime, setSimulationStartTime] = useState(null);

    // Fetch active simulation status when the component mounts
    useEffect(() => {
      const fetchSimulationStatus = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/simulation-status/${userId}`);
          if (response.data.user_simulation_id) {
            setSimulationId(response.data.user_simulation_id);
            
            // ✅ Update remaining time using system clock
            setRemainingTime(response.data.remaining_time);
            setVibrationLevel(response.data.vibration_level || 'custom');
            setDuration(response.data.duration);
            setFrequency(response.data.frequency || 0);
            setAmplitude(response.data.amplitude || 0);
            setSimulationStartTime(new Date(response.data.start_time)); 
          } else {
            setSimulationId(null);
          }
        } catch (error) {
          console.error('Error fetching simulation status:', error);
          setSimulationId(null);
        }
      };
    
      // ✅ Fetch simulation status immediately
      fetchSimulationStatus();
    
      // ✅ Check time every second to keep UI in sync
      const interval = setInterval(fetchSimulationStatus, 1000);
    
      return () => clearInterval(interval);
    }, [userId]);
    

    // Fetch vibration data for waveform periodically (either from active simulation or cache)
    useEffect(() => {
      const fetchWaveformData = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/latest-vibration`);
          if (response.data) {
            setWaveformFrequency(response.data.current_frequency);
            setWaveformIntensity(response.data.current_intensity);
            setBatteryVoltage(response.data.voltage);
            setBatteryTemperature(response.data.temperature);
          
            // Append to batteryHistory for chart
            setBatteryHistory((prev) => {
              const newPoint = {
                time: new Date().toLocaleTimeString(),
                voltage: response.data.voltage,
                temperature: response.data.temperature,
              };
              return [...prev.slice(-50), newPoint]; // Keep only last 50
            });
            setWaveformHistory((prev) => {
              const newPoint = {
                time: new Date().toLocaleTimeString(),
                frequency: response.data.current_frequency,
                intensity: response.data.current_intensity,
              };
              return [...prev.slice(-50), newPoint];
            });
            
          }
          
        } catch (error) {
          console.error('Error fetching waveform data:', error);
        }
      };

      const interval = setInterval(fetchWaveformData, 300); // Fetch every second
      return () => clearInterval(interval);
    }, [simulationId]);

    return (
      <div className="bg-black min-h-screen text-white">
        <Navbar /> {/* Navbar component */}

        <div className="dashboard-grid">
  {/* Row 1: Battery + Simulation Metrics */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <BatteryStatus
    voltage={batteryVoltage}
    temperature={batteryTemperature}
    history={batteryHistory}
  />
  <WaveformDisplay
    frequency={waveformFrequency}
    intensity={waveformIntensity}
    data={waveformHistory}
  />
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
  <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700 h-full">
  <SimulationDetails
  simulationId={simulationId}
  remainingTime={remainingTime}
  frequency={frequency}
  amplitude={amplitude}
  duration={duration}
  startTime={simulationStartTime} // ✅ PASS THIS!
/>


  </div>
  <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700 h-full">
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
  </div>
</div>

  {/* Row 3: Recent Tests Full Width */}
          <RecentTests userId={userId} />
        </div>


      </div>
    );
  };

  export default Dashboard;
