// src/components/Dashboard.js
import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/output.css';
import SimulationControls from './SimulationControls';
import WaveformDisplay from './WaveformDisplay';
import RecentTests from './RecentTests';
import Navbar from './Navbar';  // Import the Navbar component

const Dashboard = () => {
  const [frequency, setFrequency] = useState(30);
  const [amplitude, setAmplitude] = useState(30);
  const [duration, setDuration] = useState(60);
  const canvasRef = useRef(null);

  const getRandomSensorData = () => ({
    actualFrequency: Math.random() * 5 + 1,
    actualAmplitude: Math.random() * 50 + 10
  });

  const drawWave = (ctx, frequency, amplitude, time) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const midY = height / 2;
    const waveLength = width / frequency;
    
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const radians = (x / waveLength) * Math.PI * 2;
      const y = midY + amplitude * Math.sin(radians + time);
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = '#00FF41';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let time = 0;

    const animate = () => {
      const { actualFrequency, actualAmplitude } = getRandomSensorData();
      drawWave(ctx, actualFrequency, actualAmplitude, time);
      time += 0.05;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Navbar */}
      <Navbar /> {/* Use the Navbar component here */}

      {/* Dashboard Content */}
      <div className="container mx-auto p-6">
        <SimulationControls 
          frequency={frequency} 
          setFrequency={setFrequency} 
          amplitude={amplitude} 
          setAmplitude={setAmplitude}
          duration={duration}
          setDuration={setDuration}
        />

        <WaveformDisplay canvasRef={canvasRef} />

        <RecentTests />
      </div>
    </div>
  );
};

export default Dashboard;
