import React, { useState } from 'react';
import './steinsGateStyle.css'
import '../styles/output.css'; // Custom CSS for Steins;Gate theme and enhancements

const SimulationControls = ({ frequency, setFrequency, amplitude, setAmplitude, duration, setDuration }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle preset selection
  const handlePreset = (preset) => {
    if (preset === 'V1') {
      setFrequency(30);
      setAmplitude(30);
      setDuration(120); // 2 hours in minutes
    } else if (preset === 'V2') {
      setFrequency(30);
      setAmplitude(60);
      setDuration(120); // 2 hours in minutes
    } else if (preset === 'V3') {
      setFrequency(30);
      setAmplitude(60);
      setDuration(1200); // 20 hours in minutes
    }
    // Add animation to indicate the values have been changed
    document.querySelectorAll('.input-preset').forEach((input) => {
      input.classList.add('input-changed');
      setTimeout(() => {
        input.classList.remove('input-changed');
      }, 400);
    });
  };

  // Simulate loading state on form submission
  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000); // Simulate loading for 2 seconds
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow mb-6 border">
      <h2 className="text-xl font-semibold mb-4 text-steins-green">Simulation Controls</h2>
      <form className="space-y-4">
        {/* Frequency Control */}
        <div className="flex justify-between items-center">
          <label htmlFor="frequency" className="block text-lg font-medium text-steins-green">
            Target Frequency (Hz)
            <span className="text-gray-500 cursor-pointer" title="Frequency refers to how often the vibrations occur per second."> ℹ</span>
          </label>
          <div className="text-steins-green">{frequency} Hz</div> {/* Dynamic value display */}
          <input
            type="number"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-20 text-center bg-gray-700 text-white input-preset"
          />
          <input
            type="range"
            id="frequency"
            min="0"
            max="100"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full h-2 bg-steins-slider rounded-lg cursor-pointer ml-4"
          />
        </div>

        {/* Amplitude Control */}
        <div className="flex justify-between items-center">
          <label htmlFor="amplitude" className="block text-lg font-medium text-steins-green">
            Target Amplitude (ms²)
            <span className="text-gray-500 cursor-pointer" title="Amplitude refers to the strength of the vibrations."> ℹ</span>
          </label>
          <div className="text-steins-green">{amplitude} ms²</div> {/* Dynamic value display */}
          <input
            type="number"
            value={amplitude}
            onChange={(e) => setAmplitude(e.target.value)}
            className="w-20 text-center bg-gray-700 text-white input-preset"
          />
          <input
            type="range"
            id="amplitude"
            min="0"
            max="60"
            value={amplitude}
            onChange={(e) => setAmplitude(e.target.value)}
            className="w-full h-2 bg-steins-slider rounded-lg cursor-pointer ml-4"
          />
        </div>

        {/* Duration Control */}
        <div className="flex justify-between items-center">
          <label htmlFor="duration" className="block text-lg font-medium text-steins-green">
            Duration (Minutes)
            <span className="text-gray-500 cursor-pointer" title="Duration refers to how long the simulation will run."> ℹ</span>
          </label>
          <div className="text-steins-green">{duration} Minutes</div> {/* Dynamic value display */}
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full h-10 bg-gray-700 rounded-lg cursor-pointer text-center text-green-200 input-preset"
          />
        </div>

        {/* Preset Buttons for V1-V3 */}
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

        {/* Create/Update Simulation Buttons */}
        <div className="flex space-x-4 mt-6">
          <button
            type="button"
            className="relative mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            onClick={simulateLoading}
          >
            {isLoading ? <span className="loader"></span> : "Create Simulation"}
          </button>

          <button
            type="button"
            className="relative mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            onClick={simulateLoading}
          >
            {isLoading ? <span className="loader"></span> : "Update Simulation"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SimulationControls;
