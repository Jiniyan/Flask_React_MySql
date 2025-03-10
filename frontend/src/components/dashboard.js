import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/output.css';
import SimulationControls from './SimulationControls';
import WaveformDisplay from './WaveformDisplay';
import RecentTests from './RecentTests';
import Navbar from './Navbar';
import SimulationDetails from './SimulationDetails';
import axios from 'axios';
import BatteryStatus from './BatteryStatus';
import { io } from "socket.io-client";
const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  forceNew: true,
  timeout: 20000,
  pingTimeout: 25000,
  pingInterval: 10000,
});


// Force WebSocket for stability


const Dashboard = () => {
  const [userId] = useState(1);
  const [simulationId, setSimulationId] = useState(null);
  const [frequency, setFrequency] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [duration, setDuration] = useState(60); // Duration in minutes
  const [remainingTime, setRemainingTime] = useState(0);
  const [vibrationLevel, setVibrationLevel] = useState('custom');
  const [waveformFrequency, setWaveformFrequency] = useState(0);
  const [waveformIntensity, setWaveformIntensity] = useState(0);
  const canvasRef = useRef(null);
  const [batteryVoltage, setBatteryVoltage] = useState(0);
  const [batteryTemperature, setBatteryTemperature] = useState(0);

  // 🔁 Ref to keep duration synced inside WebSocket handler
  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Fetch simulation status initially
  useEffect(() => {
    const fetchSimulationStatus = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/simulation-status/${userId}`);
        if (response.data.user_simulation_id) {
          setSimulationId(response.data.user_simulation_id);
          setRemainingTime(response.data.remaining_time || 0);
          setVibrationLevel(response.data.vibration_level || 'custom');

          if (response.data.duration) {
            setDuration(response.data.duration);
            console.log("✅ Duration updated to:", response.data.duration);
          }
        } else {
          setSimulationId(null);
        }
      } catch (error) {
        console.error('Error fetching simulation status:', error);
        setSimulationId(null);
      }
    };

    fetchSimulationStatus();
  }, [userId]);

  // Fetch waveform/sensor data if available
  useEffect(() => {
    const fetchWaveformData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/latest-vibration`);
        if (response.data) {
          setWaveformFrequency(response.data.current_frequency);
          setWaveformIntensity(response.data.current_intensity);
          setBatteryVoltage(response.data.voltage);
          setBatteryTemperature(response.data.temperature);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          console.log("⚠️ No sensor data yet.");
        } else {
          console.error('Error fetching waveform data:', error);
        }
      }
    };

    const interval = setInterval(fetchWaveformData, 300); // Optional polling
    return () => clearInterval(interval);
  }, [simulationId]);
  

  // Handle sim_time_tick from Redis → SocketIO → Frontend
  useEffect(() => {
    const handleTick = (data) => {
      console.log("📡 sim_time_tick received:", data);
      const simTime = data?.sim_time ?? 0;
      const secondsRemaining = durationRef.current * 60 - simTime;
      setRemainingTime(secondsRemaining > 0 ? secondsRemaining : 0);
    };
  
    const handleConnect = () => {
      console.log("✅ Connected to WebSocket server:", socket.id);
  
      // 🧹 Ensure there's only one listener
      socket.off("sim_time_tick", handleTick);
      socket.on("sim_time_tick", handleTick);
    };
  
    const handleDisconnect = (reason) => {
      console.warn("❌ Disconnected from WebSocket:", reason);
    };
  
    const handleReconnect = (attempt) => {
      console.info("🔁 Reconnecting to WebSocket, attempt:", attempt);
    };
  
    // 🚀 Initial attach
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect_attempt", handleReconnect);
  
    // 🔎 Optional: Debug log all events
    socket.onAny((event, ...args) => {
      console.log("📥 Event received:", event, args);
    });
  
    // 🔧 Cleanup on unmount
    return () => {
      socket.off("sim_time_tick", handleTick);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reconnect_attempt", handleReconnect);
      socket.offAny();
    };
  }, []);
  
  

  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar />

      <div className="container mx-auto p-6">
        <SimulationDetails simulationId={simulationId} remainingTime={remainingTime} />
        <BatteryStatus voltage={batteryVoltage} temperature={batteryTemperature} />

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

        <WaveformDisplay
          frequency={waveformFrequency}
          intensity={waveformIntensity}
          canvasRef={canvasRef}
        />

        <RecentTests userId={userId} />
      </div>
    </div>
  );
};

export default Dashboard;
