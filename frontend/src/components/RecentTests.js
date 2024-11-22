// src/components/RecentTests.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const RecentTests = ({ userId }) => {
  const [recentSimulations, setRecentSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to fetch recent simulation data
const fetchRecentSimulations = async () => {
  try {
    const response = await axios.get(`http://localhost:5000/api/user/${userId}/recent-simulations`);
    console.log('API Response:', response.data);
    setRecentSimulations(response.data);
  } catch (err) {
    console.error('Error fetching recent simulations:', err);
    setError('Unable to fetch recent simulations.');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRecentSimulations();
  }, [userId]);

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg mb-6 border border-steins-green">
      <h2 className="text-xl font-semibold mb-4 text-steins-green">Recent Simulations</h2>
      {loading ? (
        <p className="text-steins-green">Loading...</p>
      ) : error ? (
        <p className="text-steins-green">{error}</p>
      ) : (
        <table className="table-auto w-full text-left text-gray-300">
          <thead className="bg-gray-800">
            <tr>
              <th className="py-3 px-4 border-b border-gray-600">Simulation ID</th>
              <th className="py-3 px-4 border-b border-gray-600">Status</th>
              <th className="py-3 px-4 border-b border-gray-600">Duration</th>
              <th className="py-3 px-4 border-b border-gray-600">Created At</th>
            </tr>
          </thead>
          <tbody>
            {recentSimulations.length > 0 ? (
              recentSimulations.map((simulation) => (
                <tr key={simulation.id} className="hover:bg-gray-800 transition ease-in-out duration-200">
                  <td className="py-3 px-4 border-b border-gray-700">#{simulation.id}</td>
                  <td className="py-3 px-4 border-b border-gray-700">{simulation.status}</td>
                  <td className="py-3 px-4 border-b border-gray-700">{simulation.duration} mins</td>
                  <td className="py-3 px-4 border-b border-gray-700">{simulation.created_at}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">No recent simulations available.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RecentTests;
