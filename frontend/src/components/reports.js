import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './steinsGateStyle.css';
import axiosInstance from '../utils/axiosInstance';  // Import the custom Axios instance
import Navbar from './Navbar';  // Import Navbar component

function SimulationReports() {
  const [reports, setReports] = useState([]);  // Initialize as an empty array
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Function to convert duration from hr/min/sec to a readable format
  const formatDuration = (durationString) => {
    const match = durationString.match(/(\d+) hr\s(\d+) min\s(\d+) sec/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      return `${hours}hr / ${minutes}min / ${seconds}sec`;
    }
    return '0hr / 0min / 0sec';
  };

  // Function to fetch reports with Axios instance
  const fetchReports = async (page = 1) => {
    setIsLoading(true);
    try {
      console.log(`Fetching reports from page ${page}`);
      const response = await axiosInstance.get(`/api/simulation-reports/?page=${page}`);
      console.log('Received data:', response.data);
      setReports(response.data.results || []);
      setNextPage(response.data.next);
      setPrevPage(response.data.previous);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports([]);  // Set fallback to empty array in case of an error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reports on component mount
  useEffect(() => {
    fetchReports();  // Call the function to fetch reports
  }, []);

  // Modal handling
  const openModal = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedReport(null);
    setIsModalOpen(false);
  };

  // Generate XML for download
  const generateXML = (report) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<simulationReport>\n`;
    xml += `<id>${report.id}</id>\n`;
    xml += `<frequency>${report.frequency}</frequency>\n`;
    xml += `<intensity>${report.intensity}</intensity>\n`;
    xml += `<duration>${report.duration}</duration>\n`;
    xml += `<vibrationLevel>${report.vibration_level}</vibrationLevel>\n<dataPoints>\n`;
    
    report.data_points?.forEach((point) => {
      xml += `  <dataPoint>\n    <time>${point.time}</time>\n    <frequency>${point.frequency}</frequency>\n    <intensity>${point.intensity}</intensity>\n  </dataPoint>\n`;
    });
    
    xml += `</dataPoints>\n</simulationReport>`;
    return xml;
  };

  const downloadXML = (report) => {
    const xmlData = generateXML(report);
    const blob = new Blob([xmlData], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `simulation-report-${report.id}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white"> {/* Apply Steins;Gate black background */}
      {/* Navbar Component */}
      <Navbar />

      {/* Simulation Reports Table */}
      {isLoading && (
        <div className="loading-screen">
          <div className="loading-text">Loading...</div>
        </div>
      )}

      <div className={`container content-container p-6 ${isLoading ? 'fade-out' : 'fade-in'}`}>
        <div className="table-responsive">
          <table className="table table-hover table-dark table-striped rounded shadow-lg">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data Points</th>
                <th>Frequency</th>
                <th>Intensity</th>
                <th>Duration (hr/min/sec)</th>
                <th>Vibration Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>
                    <button onClick={() => openModal(report)} className="btn btn-steins-blue">View Data Points</button>
                  </td>
                  <td>{report.frequency}</td>
                  <td>{report.intensity}</td>
                  <td>{formatDuration(report.duration)}</td>
                  <td>{report.vibration_level}</td>
                  <td>
                    <button onClick={() => downloadXML(report)} className="btn btn-steins-green">Download XML</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination-container d-flex justify-content-between mt-4">
          <button onClick={() => fetchReports(currentPage - 1)} disabled={!prevPage} className="btn btn-outline-light">
            Previous
          </button>
          <button onClick={() => fetchReports(currentPage + 1)} disabled={!nextPage} className="btn btn-outline-light">
            Next
          </button>
        </div>
      </div>

      {/* Modal for viewing data points */}
      {isModalOpen && selectedReport && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content bg-dark text-white">
              <div className="modal-header">
                <h5 className="modal-title">Data Points for Report {selectedReport.id}</h5>
                <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={closeModal}></button>
              </div>
              <div className="modal-body overflow-auto" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <ul className="list-group">
                  {selectedReport.data_points?.map((point, index) => (
                    <li key={index} className="list-group-item bg-dark text-white">
                      <strong>Time:</strong> {point.time}, <strong>Frequency:</strong> {point.frequency}Hz, <strong>Intensity:</strong> {point.intensity}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button onClick={closeModal} className="btn btn-outline-light">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimulationReports;
