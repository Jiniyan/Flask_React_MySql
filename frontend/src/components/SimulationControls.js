import React, { useState } from 'react';
import './steinsGateStyle.css';
import '../styles/output.css';
import axios from 'axios';

const SimulationControls = ({
  userId,
  simulationId,
  setSimulationId,
  frequency,
  setFrequency,
  amplitude,
  setAmplitude,
  duration,
  setDuration,
  remainingTime,
  setRemainingTime,
  vibrationLevel,
  setVibrationLevel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [canStartSimulation, setCanStartSimulation] = useState(!simulationId);
  const [inputHours, setInputHours] = useState(0);

  const [inputDays, setInputDays] = useState(0);
  const [inputMinutes, setInputMinutes] = useState(0);
  const [inputSeconds, setInputSeconds] = useState(0);

  const handleDurationChange = (days, hours, mins, secs) => {
    setInputDays(days);
    setInputHours(hours);
    setInputMinutes(mins);
    setInputSeconds(secs);
  
    const totalMinutes = days * 1440 + hours * 60 + mins + secs / 60;
    setDuration(Number(totalMinutes.toFixed(2)));
  };


  const createSimulation = async () => {
    if (!canStartSimulation) return;
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/start-simulation', {
        user_id: userId,
        frequency,
        intensity: amplitude,
        duration,
        preset: vibrationLevel,
      });

      if (response.status === 201) {
        setSimulationId(response.data.simulation_id);
        setRemainingTime(duration * 60);
        setCanStartSimulation(false);
      }
    } catch (error) {
      console.error('Error starting simulation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopSimulation = async () => {
    if (!simulationId) return;

    setIsLoading(true);
    try {
      const stopResponse = await axios.post('http://localhost:5000/api/stop-simulation', { simulation_id: simulationId });

      if (stopResponse.status === 200) {
        const reportResponse = await axios.post(`http://localhost:5000/api/generate-report/${simulationId}`);
        if (reportResponse.status === 201) {
          console.log('Simulation report generated');
        }
        setSimulationId(null);
        setRemainingTime(0);
        setCanStartSimulation(true);
      }
    } catch (error) {
      console.error('Error stopping simulation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSimulation = async () => {
    if (!simulationId) return;

    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/control/update', {
        simulation_id: simulationId,
        frequency,
        intensity: amplitude,
        duration,
        vibration_level: vibrationLevel,
      });

      if (response.status === 200) {
        console.log('Simulation updated');
      }
    } catch (error) {
      console.error('Error updating simulation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelayControl = async (state) => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/control/relay', { state });
      if (response.status === 200) {
        console.log(`Relay set to ${state}`);
      }
    } catch (error) {
      console.error(`Failed to set relay to ${state}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow mb-6 border">
      <form className="space-y-6">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
  <label htmlFor="frequency" className="block text-lg font-medium text-steins-green">
    Target Frequency (Hz) <span className="text-sm text-green-300 ml-1">(0–60 Hz)</span>
  </label>
  <input
    type="number"
    min="0"
    max="60"
    step="1"
    id="frequency"
    value={frequency}
    onChange={(e) => setFrequency(Number(e.target.value))}
    className="w-32 mt-2 md:mt-0 bg-gray-700 text-white text-center rounded input-preset"
  />
</div>


<div className="flex flex-col md:flex-row md:items-center md:justify-between">
  <label htmlFor="amplitude" className="block text-lg font-medium text-steins-green">
    Target Amplitude (ms²) <span className="text-sm text-green-300 ml-1">(0–15 ms²)</span>
  </label>
  <input
    type="number"
    min="0"
    max="15"
    step="0.1"
    id="amplitude"
    value={amplitude}
    onChange={(e) => setAmplitude(Number(e.target.value))}
    className="w-32 mt-2 md:mt-0 bg-gray-700 text-white text-center rounded input-preset"
  />
</div>


{/* Duration Input */}
<div>
  <label className="text-lg font-medium text-steins-green">
    Duration Input: {inputDays}d {inputHours}h {inputMinutes}m {inputSeconds}s
    <span className="ml-2 text-sm text-green-300">(~{duration} min)</span>
  </label>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
    <div>
      <label className="block text-xs text-green-300 mb-1">Days</label>
      <input
        type="number"
        min="0"
        value={inputDays}
        onChange={(e) =>
          handleDurationChange(Number(e.target.value), inputHours, inputMinutes, inputSeconds)
        }
        className="w-full bg-gray-700 text-white text-center rounded-lg input-preset"
      />
    </div>
    <div>
      <label className="block text-xs text-green-300 mb-1">Hours</label>
      <input
        type="number"
        min="0"
        max="23"
        value={inputHours}
        onChange={(e) =>
          handleDurationChange(inputDays, Number(e.target.value), inputMinutes, inputSeconds)
        }
        className="w-full bg-gray-700 text-white text-center rounded-lg input-preset"
      />
    </div>
    <div>
      <label className="block text-xs text-green-300 mb-1">Minutes</label>
      <input
        type="number"
        min="0"
        max="59"
        value={inputMinutes}
        onChange={(e) =>
          handleDurationChange(inputDays, inputHours, Number(e.target.value), inputSeconds)
        }
        className="w-full bg-gray-700 text-white text-center rounded-lg input-preset"
      />
    </div>
    <div>
      <label className="block text-xs text-green-300 mb-1">Seconds</label>
      <input
        type="number"
        min="0"
        max="59"
        value={inputSeconds}
        onChange={(e) =>
          handleDurationChange(inputDays, inputHours, inputMinutes, Number(e.target.value))
        }
        className="w-full bg-gray-700 text-white text-center rounded-lg input-preset"
      />
    </div>
  </div>
</div>

        {/* Relay Buttons */}
        <div className="flex flex-wrap justify-between mt-4 gap-2">
          <button type="button" onClick={() => handleRelayControl('CHARGE')} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded">
            Charge Relay
          </button>
          <button type="button" onClick={() => handleRelayControl('DISCHARGE')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
            Discharge Relay
          </button>
          <button type="button" onClick={() => handleRelayControl('NEUTRAL')} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
            Neutral Relay
          </button>
        </div>

        {/* Simulation Action Buttons */}
        <div className="flex flex-wrap gap-4 mt-6">
          {!simulationId ? (
            <button
              type="button"
              onClick={createSimulation}
              disabled={!canStartSimulation}
              className={`px-6 py-2 rounded-lg text-white ${
                canStartSimulation ? 'bg-green-500' : 'bg-gray-500'
              }`}
            >
              {isLoading ? 'Loading...' : 'Create Simulation'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={stopSimulation}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                {isLoading ? 'Stopping...' : 'Stop Simulation'}
              </button>
              <button
                type="button"
                onClick={updateSimulation}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {isLoading ? 'Updating...' : 'Update Simulation'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default SimulationControls;
