// src/components/BatteryStatus.js

import React from 'react';

const BatteryStatus = ({ voltage, temperature }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg mt-4 shadow-lg">
      <h3 className="text-xl font-semibold text-white mb-2">🔋 Battery Status</h3>
      <div className="flex justify-between items-center text-steins-green">
        <p>Voltage:</p>
        <p>{voltage ? `${voltage.toFixed(2)} V` : 'N/A'}</p>
      </div>
      <div className="flex justify-between items-center text-steins-green">
        <p>Temperature:</p>
        <p>{temperature ? `${temperature.toFixed(1)} °C` : 'N/A'}</p>
      </div>
    </div>
  );
};

export default BatteryStatus;
