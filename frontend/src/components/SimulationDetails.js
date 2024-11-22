import React from 'react';

const SimulationDetails = ({ simulationId, remainingTime }) => {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="bg-gray-800 p-4 rounded-md shadow-md border border-gray-700 mb-6">
      <h2 className="text-xl font-bold text-cyan-400 mb-3">Simulation Details</h2>
      {simulationId ? (
        <div>
          <p className="text-lg text-white">
            <span className="text-cyan-300">Simulation ID:</span> {simulationId}
          </p>
          <p className="text-lg text-white">
            <span className="text-cyan-300">Remaining Time:</span> {formatTime(remainingTime)}
          </p>
        </div>
      ) : (
        <p className="text-lg text-gray-400">
          <span className="text-pink-500">No active simulation.</span>
        </p>
      )}
    </div>
  );
};

export default SimulationDetails;
