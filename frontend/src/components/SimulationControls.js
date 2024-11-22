
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

  // Helper function to format time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Function to handle preset selection
  const handlePreset = (preset) => {
    if (preset === 'V1') {
      setFrequency(30);
      setAmplitude(30);
      setDuration(120); // 2 hours in minutes
      setVibrationLevel('V1');
    } else if (preset === 'V2') {
      setFrequency(30);
      setAmplitude(60);
      setDuration(120); // 2 hours in minutes
      setVibrationLevel('V2');
    } else if (preset === 'V3') {
      setFrequency(30);
      setAmplitude(60);
      setDuration(1200); // 20 hours in minutes
      setVibrationLevel('V3');
    }
    document.querySelectorAll('.input-preset').forEach((input) => {
      input.classList.add('input-changed');
      setTimeout(() => {
        input.classList.remove('input-changed');
      }, 400);
    });
  };

  // Function to create a new simulation
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
        setRemainingTime(duration * 60); // Convert minutes to seconds
        setCanStartSimulation(false);
      }
    } catch (error) {
      console.error('Error starting simulation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to stop the simulation
  const stopSimulation = async () => {
    if (!simulationId) return;

    setIsLoading(true);
    try {
      // Step 1: Stop the simulation
      const stopResponse = await axios.post('http://localhost:5000/api/stop-simulation', { simulation_id: simulationId });

      if (stopResponse.status === 200) {
        console.log('Simulation stopped successfully');

        // Step 2: Generate the report
        const reportResponse = await axios.post(`http://localhost:5000/api/generate-report/${simulationId}`);

        if (reportResponse.status === 201) {
          console.log('Simulation report generated successfully');
        } else {
          console.error('Failed to generate simulation report:', reportResponse.data.error);
        }

        // Update state after successful stop and report generation
        setSimulationId(null);
        setRemainingTime(0);
        setCanStartSimulation(true);
      }
    } catch (error) {
      console.error('Error stopping simulation or generating report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update the existing simulation
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
        console.log('Simulation updated successfully');
      }
    } catch (error) {
      console.error('Error updating simulation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow mb-6 border">

      <form className="space-y-4">
        {/* Frequency Control */}
        <div className="flex justify-between items-center">
          <label htmlFor="frequency" className="block text-lg font-medium text-steins-green">
            Target Frequency (Hz)
            <span className="text-gray-500 cursor-pointer" title="Frequency refers to how often the vibrations occur per second."> ℹ</span>
          </label>
          <div className="text-steins-green">{frequency} Hz</div>
          <input
            type="number"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
            className="w-20 text-center bg-gray-700 text-white input-preset"
          />
          <input
            type="range"
            id="frequency"
            min="0"
            max="100"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
            className="w-full h-2 bg-steins-slider rounded-lg cursor-pointer ml-4"
          />
        </div>

        {/* Amplitude Control */}
        <div className="flex justify-between items-center">
          <label htmlFor="amplitude" className="block text-lg font-medium text-steins-green">
            Target Amplitude (ms²)
            <span className="text-gray-500 cursor-pointer" title="Amplitude refers to the strength of the vibrations."> ℹ</span>
          </label>
          <div className="text-steins-green">{amplitude} ms²</div>
          <input
            type="number"
            value={amplitude}
            onChange={(e) => setAmplitude(Number(e.target.value))}
            className="w-20 text-center bg-gray-700 text-white input-preset"
          />
          <input
            type="range"
            id="amplitude"
            min="0"
            max="60"
            value={amplitude}
            onChange={(e) => setAmplitude(Number(e.target.value))}
            className="w-full h-2 bg-steins-slider rounded-lg cursor-pointer ml-4"
          />
        </div>

        {/* Duration Control */}
        <div className="flex justify-between items-center">
          <label htmlFor="duration" className="block text-lg font-medium text-steins-green">
            Duration (Minutes)
            <span className="text-gray-500 cursor-pointer" title="Duration refers to how long the simulation will run."> ℹ</span>
          </label>
          <div className="text-steins-green">{duration} Minutes</div>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full h-10 bg-gray-700 rounded-lg cursor-pointer text-center text-green-200 input-preset"
          />
        </div>

        {/* Preset Buttons */}
        <div className="flex justify-between items-center mt-4">
          <button
            type="button"
            className="px-4 py-2 bg-steins-green hover:bg-green-600 text-gray-900 font-semibold rounded-l-lg"
            onClick={() => handlePreset('V1')}
          >
            V1 Preset
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-steins-green hover:bg-green-600 text-gray-900 font-semibold"
            onClick={() => handlePreset('V2')}
          >
            V2 Preset
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-steins-green hover:bg-green-600 text-gray-900 font-semibold rounded-r-lg"
            onClick={() => handlePreset('V3')}
          >
            V3 Preset
          </button>
        </div>

        {/* Create/Stop/Update Simulation Buttons */}
        <div className="flex space-x-4 mt-6">
          {!simulationId ? (
            <button
              type="button"
              className={`relative mt-4 px-6 py-2 ${
                canStartSimulation ? 'bg-green-500' : 'bg-gray-500'
              } text-white rounded-lg`}
              onClick={createSimulation}
              disabled={!canStartSimulation}
            >
              {isLoading ? <span className="loader"></span> : "Create Simulation"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="relative mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                onClick={stopSimulation}
              >
                {isLoading ? <span className="loader"></span> : "Stop Simulation"}
              </button>
              <button
                type="button"
                className="relative mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={updateSimulation}
              >
                {isLoading ? <span className="loader"></span> : "Update Simulation"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default SimulationControls;