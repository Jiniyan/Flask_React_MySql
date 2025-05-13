import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/output.css';
import SimulationControls from './SimulationControls';
import WaveformDisplay from './WaveformDisplay';
import RecentTests from './RecentTests';
import Navbar from './Navbar';
import SimulationDetails from './SimulationDetails';
import BatteryStatus from './BatteryStatus';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import axiosInstance from '../utils/axiosInstance';
const Dashboard = () => {
  const [userId, setUserId] = useState(null);
  const [simulationId, setSimulationId] = useState(null);
  const [frequency, setFrequency] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [duration, setDuration] = useState(60);
  const [remainingTime, setRemainingTime] = useState(0);
  const [vibrationLevel, setVibrationLevel] = useState('custom');
  const [waveformFrequency, setWaveformFrequency] = useState(0);
  const [waveformIntensity, setWaveformIntensity] = useState(0);
  const [batteryVoltage, setBatteryVoltage] = useState(0);
  const [batteryTemperature, setBatteryTemperature] = useState(0);
  const [batteryHistory, setBatteryHistory] = useState([]);
  const [waveformHistory, setWaveformHistory] = useState([]);
  const [simulationStartTime, setSimulationStartTime] = useState(null);
  const [hasShownBatteryAlert, setHasShownBatteryAlert] = useState(false);

  const MySwal = withReactContent(Swal);

  // Fetch the current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axiosInstance.get('http://127.0.0.1:5000/api/current-user', { withCredentials: true });
        if (response.data && response.data.user_id) {
          setUserId(response.data.user_id);
        } else {
          console.error('User not authenticated');
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch simulation status
  useEffect(() => {
    if (!userId) return;
    const fetchSimulationStatus = async () => {
      try {
        const response = await axiosInstance.get(`http://localhost:5000/api/simulation-status/${userId}`);
        if (response.data.status === "ongoing") {
          setSimulationId(response.data.user_simulation_id);
          setFrequency(response.data.frequency);
          setAmplitude(response.data.amplitude);
          setDuration(response.data.duration);
          setRemainingTime(response.data.remaining_time);

          if (response.data.start_time) {
            setSimulationStartTime(new Date(response.data.start_time));
          }
        } else {
          setSimulationId(null); // Simulation not ongoing
        }
      } catch (error) {
        console.error("Error fetching simulation status:", error);
      }
    };

    fetchSimulationStatus();
    const statusInterval = setInterval(fetchSimulationStatus, 3000);
    return () => clearInterval(statusInterval);
  }, [userId]);

  // Fetch latest vibration + battery data
  useEffect(() => {
    if (!simulationId) return;
    const fetchWaveformData = async () => {
      try {
        const response = await axiosInstance.get('http://localhost:5000/api/latest-vibration');
        if (response.data) {
          const { current_frequency, current_intensity, voltage, temperature } = response.data;

          setWaveformFrequency(current_frequency);
          setWaveformIntensity(current_intensity);
          setBatteryVoltage(voltage);
          setBatteryTemperature(temperature);

          // Low battery alert
          if (voltage < 5 && !hasShownBatteryAlert) {
            MySwal.fire({
              title: '⚠️ No Battery Detected',
              text: 'Voltage is below 5V. Please check battery connection!',
              icon: 'warning',
              background: '#1f2937',
              color: '#ffffff',
              confirmButtonColor: '#ef4444',
            });
            setHasShownBatteryAlert(true);
          }

          // Append to history arrays
          const timeNow = new Date().toLocaleTimeString();

          setBatteryHistory((prev) => [...prev.slice(-49), { time: timeNow, voltage, temperature }]);
          setWaveformHistory((prev) => [...prev.slice(-49), { time: timeNow, frequency: current_frequency, intensity: current_intensity }]);
        }
      } catch (error) {
        console.error('Error fetching waveform data:', error);
      }
    };

    const interval = setInterval(fetchWaveformData, 300); // Every 300ms
    return () => clearInterval(interval);
  }, [simulationId, hasShownBatteryAlert]);

  // Reset battery alert if simulation ends
  useEffect(() => {
    if (!simulationId) {
      setHasShownBatteryAlert(false);
    }
  }, [simulationId]);

  if (userId === null) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white bg-black">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar />

      <div className="dashboard-grid">
        {/* Row 1: Battery + Simulation Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BatteryStatus
            voltage={simulationId ? batteryVoltage : null}
            temperature={simulationId ? batteryTemperature : null}
            history={simulationId ? batteryHistory : []}
          />
          <WaveformDisplay
            frequency={simulationId ? waveformFrequency : null}
            intensity={simulationId ? waveformIntensity : null}
            data={simulationId ? waveformHistory : []}
          />
        </div>

        {/* Row 2: Simulation Controls and Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700 h-full">
            <SimulationDetails
              simulationId={simulationId}
              remainingTime={remainingTime}
              frequency={frequency}
              amplitude={amplitude}
              duration={duration}
              startTime={simulationStartTime}
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

        {/* Row 3: Recent Tests */}
        <RecentTests userId={userId} />
      </div>
    </div>
  );
};

export default Dashboard;
