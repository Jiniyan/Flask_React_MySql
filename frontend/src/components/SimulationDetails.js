import React from 'react';

const SimulationDetails = ({
  simulationId,
  remainingTime,
  frequency,
  amplitude,
  duration,
  startTime, // ✅ New prop
}) => {
  const formatTime = (seconds) => {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const calculateEndTime = () => {
    if (!startTime) return 'Calculating...';
  
    const end = new Date(startTime.getTime() + duration * 60000);
    return end.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });
  };
  

  return (
    <div className="h-full w-full bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
      <h2 className="text-xl font-bold text-cyan-400 mb-3">Simulation Details</h2>

      {simulationId ? (
        <>
          <p className="text-lg text-white">
            <span className="text-cyan-300">Simulation ID:</span> {simulationId}
          </p>
          <p className="text-lg text-white">
            <span className="text-cyan-300">Remaining Time:</span> {formatTime(remainingTime)}
          </p>
          <p className="text-lg text-white">
            <span className="text-cyan-300">Expected End Time:</span> {calculateEndTime()}
          </p>

          <div className="mt-4">
            <p className="text-md text-green-400">
              🎯 Frequency Control Set To: <span className="text-white">{frequency} Hz</span>
            </p>
            <p className="text-md text-green-400">
              🎯 Amplitude Control Set To: <span className="text-white">{amplitude} ms²</span>
            </p>
          </div>
        </>
      ) : (
        <p className="text-lg text-pink-500 text-center">No active simulation.</p>
      )}
    </div>
  );
};

export default SimulationDetails;
