// src/components/Navbar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation(); // To get the current route for highlighting active link

  return (
    <nav className="bg-gray-900 border-b-2 border-steins-green p-3">
      <div className="flex space-x-6">
        <Link
          to="/dashboard"
          className={`text-steins-green hover:text-steins-green text-lg font-mono transition-colors duration-300 ${location.pathname === '/dashboard' ? 'border-b-2 border-steins-green' : ''}`}
        >
          Dashboard
        </Link>
        <Link
          to="/reports"
          className={`text-steins-green hover:text-steins-green text-lg font-mono transition-colors duration-300 ${location.pathname === '/reports' ? 'border-b-2 border-steins-green' : ''}`}
        >
          Reports
        </Link>
        <Link
          to="/settings"
          className={`text-steins-green hover:text-steins-green text-lg font-mono transition-colors duration-300 ${location.pathname === '/settings' ? 'border-b-2 border-steins-green' : ''}`}
        >
          Settings
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
