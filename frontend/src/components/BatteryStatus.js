// src/components/BatteryStatus.js

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const BatteryStatus = ({ voltage, temperature, history }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg mt-4 shadow-lg">
      <h3 className="text-xl font-semibold text-white mb-2">🔋 Battery Monitor</h3>

      {/* Current Voltage and Temperature */}
      <div className="flex justify-around mb-4 text-steins-green">
        <p>Voltage: {voltage ? `${voltage.toFixed(2)} V` : 'N/A'}</p>
        <p>Temperature: {temperature ? `${temperature.toFixed(1)} °C` : 'N/A'}</p>
      </div>

      {/* Line Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="time" stroke="#00FF41" />
          <YAxis yAxisId="left" stroke="#00FF41" domain={['auto', 'auto']} />
          <YAxis yAxisId="right" orientation="right" stroke="#00BFFF" domain={['auto', 'auto']} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="voltage" stroke="#00FF41" name="Voltage (V)" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#00BFFF" name="Temperature (°C)" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BatteryStatus;
