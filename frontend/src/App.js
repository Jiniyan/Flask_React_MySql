import React, { useEffect,} from 'react';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './components/dashboard';
import Welcome from './components/welcome';
import SimulationReports from './components/reports';
import Settings from './components/settings';
import Login from './components/Login';  // Import the Login component
import PrivateRoute from './components/PrivateRoute';  // Import PrivateRoute
import './styles/output.css';

function App() {

  useEffect(() => {
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><SimulationReports /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />

      </Routes>
    </Router>
  );
}

export default App;
