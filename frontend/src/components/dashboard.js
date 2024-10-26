import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/output.css'; // Assuming output.css is placed in your public folder or accessible
import SimulationControls from './SimulationControls';
import WaveformDisplay from './WaveformDisplay';
import RecentTests from './RecentTests';

const Dashboard = () => {
  const [frequency, setFrequency] = useState(30); // Target frequency
  const [amplitude, setAmplitude] = useState(30); // Target amplitude
  const [duration, setDuration] = useState(60); // Duration in minutes
  const canvasRef = useRef(null);

  // Randomized sensor input for actual frequency and amplitude (hypothetical sensor data)
  const getRandomSensorData = () => ({
    actualFrequency: Math.random() * 5 + 1, // Random frequency between 1 and 6 Hz
    actualAmplitude: Math.random() * 50 + 10 // Random amplitude between 10 and 60
  });

  // Function to draw the sine wave on the canvas (representing actual sensor data)
  const drawWave = (ctx, frequency, amplitude, time) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const midY = height / 2;
    const waveLength = width / frequency;
    
    ctx.clearRect(0, 0, width, height); // Clear previous wave
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const radians = (x / waveLength) * Math.PI * 2;
      const y = midY + amplitude * Math.sin(radians + time);
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = '#00FF41'; // Matrix-like green color
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

    animate(); // Start animation

    return () => cancelAnimationFrame(animationFrameId); // Clean up
  }, []);

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Navbar */}
      <nav className="bg-gray-900 text-green-400 p-4 shadow-lg">
        <div className="container mx-auto flex justify-between">
          <h1 className="text-3xl font-semibold">Vibration Simulation Dashboard</h1>
          <div>
            <a href="/" className="px-3 py-2 hover:bg-gray-800 rounded">Home</a>
            <a href="/reports" className="px-3 py-2 hover:bg-gray-800 rounded">Reports</a>
            <a href="#" className="px-3 py-2 hover:bg-gray-800 rounded">Settings</a>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container mx-auto p-6">
        {/* Simulation Controls Section */}
        <SimulationControls 
          frequency={frequency} 
          setFrequency={setFrequency} 
          amplitude={amplitude} 
          setAmplitude={setAmplitude}
          duration={duration}
          setDuration={setDuration}
        />

        {/* Waveform Display Section */}
        <WaveformDisplay canvasRef={canvasRef} />

        {/* Recent Tests Section */}
        <RecentTests />
      </div>
    </div>
  );
};

export default Dashboard;
