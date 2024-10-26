import React, { useEffect } from 'react';

const WaveformDisplay = ({ canvasRef }) => {

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let time = 0;

    const drawWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sample wave effect
      const midY = canvas.height / 2;
      const amplitude = 50;
      const frequency = 5;

      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const y = midY + amplitude * Math.sin((x / canvas.width) * 2 * Math.PI * frequency + time);
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = '#00FF41'; // Green wave effect
      ctx.lineWidth = 2;
      ctx.stroke();

      time += 0.05; // Wave animation speed
      requestAnimationFrame(drawWave);
    };

    drawWave();
  }, [canvasRef]);

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg mb-6 border border-steins-green">
      <h2 className="text-xl font-semibold mb-4 text-steins-green">Waveform Display</h2>
      <canvas ref={canvasRef} width="800" height="300" className="w-full h-48 bg-black"></canvas>
      <p className="text-gray-300 text-center mt-4">Simulated Sensor Data in Real-Time</p>
    </div>
  );
};

export default WaveformDisplay;
