import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const WaveformDisplay = ({ data }) => {
  const now = Date.now();

  const { maxFreq, maxIntensity } = useMemo(() => {
    const recentData = data
      .map((point, index) => ({
        ...point,
        timestamp: now - (data.length - index) * 300, // simulate timestamp at 300ms intervals
      }))
      .filter(point => now - point.timestamp <= 5000);

    let maxFreq = null;
    let maxIntensity = null;

    for (const point of recentData) {
      if (typeof point.frequency === 'number') {
        if (maxFreq === null || point.frequency > maxFreq) {
          maxFreq = point.frequency;
        }
      }

      if (typeof point.intensity === 'number') {
        if (maxIntensity === null || point.intensity > maxIntensity) {
          maxIntensity = point.intensity;
        }
      }
    }

    return { maxFreq, maxIntensity };
  }, [data]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg mt-4 shadow-lg">
      <h3 className="text-xl font-semibold text-white mb-2">📊 Simulation Metrics</h3>

      <div className="flex justify-around mb-4 text-steins-green">
        <p>Max Frequency (5s): {maxFreq !== null ? `${maxFreq.toFixed(2)} Hz` : 'N/A'}</p>
        <p>Max Intensity (5s): {maxIntensity !== null ? `${maxIntensity.toFixed(2)} ms²` : 'N/A'}</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="time" stroke="#00FF41" />
          <YAxis yAxisId="left" stroke="#00FF41" />
          <YAxis yAxisId="right" orientation="right" stroke="#FFA500" />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="frequency" stroke="#00FF41" name="Frequency (Hz)" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="intensity" stroke="#FFA500" name="Intensity (ms²)" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WaveformDisplay;
