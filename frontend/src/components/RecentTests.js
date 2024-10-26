import React from 'react';

const RecentTests = () => {
  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg mb-6 border border-steins-green">
      <h2 className="text-xl font-semibold mb-4 text-steins-green">Recent Tests</h2>
      <table className="table-auto w-full text-left text-gray-300">
        <thead className="bg-gray-800">
          <tr>
            <th className="py-3 px-4 border-b border-gray-600">Test ID</th>
            <th className="py-3 px-4 border-b border-gray-600">Battery Type</th>
            <th className="py-3 px-4 border-b border-gray-600">Status</th>
            <th className="py-3 px-4 border-b border-gray-600">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-gray-800 transition ease-in-out duration-200">
            <td className="py-3 px-4 border-b border-gray-700">#001</td>
            <td className="py-3 px-4 border-b border-gray-700">12N12</td>
            <td className="py-3 px-4 border-b border-gray-700 text-green-400">Completed</td>
            <td className="py-3 px-4 border-b border-gray-700">2 hrs</td>
          </tr>
          <tr className="hover:bg-gray-800 transition ease-in-out duration-200">
            <td className="py-3 px-4 border-b border-gray-700">#002</td>
            <td className="py-3 px-4 border-b border-gray-700">12N12-3B</td>
            <td className="py-3 px-4 border-b border-gray-700 text-yellow-400">In Progress</td>
            <td className="py-3 px-4 border-b border-gray-700">1 hr</td>
          </tr>
          <tr className="hover:bg-gray-800 transition ease-in-out duration-200">
            <td className="py-3 px-4 border-b border-gray-700">#003</td>
            <td className="py-3 px-4 border-b border-gray-700">12N12</td>
            <td className="py-3 px-4 border-b border-gray-700 text-red-400">Error</td>
            <td className="py-3 px-4 border-b border-gray-700">30 mins</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default RecentTests;
