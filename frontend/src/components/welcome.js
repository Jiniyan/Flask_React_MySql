import React from 'react';
import '../styles/output.css'; // Assuming output.css is placed in your public folder or accessible

const Welcome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-black via-gray-900 to-black text-white">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="p-10 bg-gray-800 shadow-lg rounded-lg border border-steins-green">
          <h1 className="text-5xl font-bold text-steins-green mb-6 text-center">
            Vehicular Vibration Simulator Platform
          </h1>
          <p className="text-lg text-gray-300 text-center mb-4">
            A project designed to test the performance of lead-acid batteries under simulated vehicular vibrations.
          </p>
          <div className="text-center mt-4">
            <a href="/dashboard" className="px-6 py-2 text-gray-900 bg-steins-green rounded-full hover:bg-green-600 hover:text-black shadow-lg transition ease-in-out duration-300">
              Learn More
            </a>
          </div>
        </div>

        <div className="mt-8 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-steins-green mb-4">Project Overview</h2>
          <p className="mb-2 text-gray-400">
            In collaboration with the Advanced Batteries Center, this project aims to address the need for standardized
            vibration testing facilities for batteries used in electric vehicles (EVs).
          </p>
          <p className="mb-4 text-gray-400">
            Our goal is to develop a cost-effective prototype that meets IEC standards for battery testing, providing an affordable
            alternative to existing vibration equipment in the Philippines.
          </p>
          <div className="flex justify-center gap-6">
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-steins-green">
              <h3 className="text-xl font-semibold text-steins-green">Client</h3>
              <p className="mt-2 text-gray-300">Advanced Batteries Center</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-steins-green">
              <h3 className="text-xl font-semibold text-steins-green">Estimated Cost</h3>
              <p className="mt-2 text-gray-300">₱14,473.56</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-steins-green">
              <h3 className="text-xl font-semibold text-steins-green">Project Timeline</h3>
              <p className="mt-2 text-gray-300">Prototype: 2nd Week of November</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
