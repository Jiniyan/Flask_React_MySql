import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './steinsGateStyle.css'; // Custom CSS for animations and Steins;Gate aesthetic

function SimulationReports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null); // For the modal
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal open state
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false); // New loading state for transitions

  const fetchReports = async (page = 1) => {
    setIsLoading(true); // Show the loading screen when fetching data
    try {
      const response = await fetch(`/api/simulation-reports/?page=${page}`);
      const data = await response.json();
      setReports(data.results);
      setNextPage(data.next);
      setPrevPage(data.previous);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setIsLoading(false); // Hide the loading screen after data is fetched
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Function to open the modal with the selected report
  const openModal = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  // Function to close the modal
  const closeModal = () => {
    setSelectedReport(null);
    setIsModalOpen(false);
  };

  // Function to convert report data to XML format
  const generateXML = (report) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<simulationReport>\n`;
    xml += `<id>${report.id}</id>\n`;
    xml += `<frequency>${report.frequency}</frequency>\n`;
    xml += `<intensity>${report.intensity}</intensity>\n`;
    xml += `<duration>${report.duration}</duration>\n`;
    xml += `<vibrationLevel>${report.vibration_level}</vibrationLevel>\n`;
    xml += `<dataPoints>\n`;

    report.data_points.forEach((point, index) => {
      xml += `  <dataPoint>\n`;
      xml += `    <time>${point.time}</time>\n`;
      xml += `    <frequency>${point.frequency}</frequency>\n`;
      xml += `    <intensity>${point.intensity}</intensity>\n`;
      xml += `  </dataPoint>\n`;
    });

    xml += `</dataPoints>\n</simulationReport>`;
    return xml;
  };

  // Function to download XML
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
    <div className="container mx-auto p-6 bg-dark text-white">
      {/* Loading Screen */}
      {isLoading && (
        <div className="loading-screen">
          <div className="loading-text">Loading...</div>
        </div>
      )}

      {/* Content */}
      <div className={`content-container ${isLoading ? 'fade-out' : 'fade-in'}`}>
        <div className="d-flex justify-content-between mb-8">
          <h1 className="text-4xl font-bold text-steins-green">Simulation Reports</h1>
          <a href="/dashboard" className="btn btn-outline-light btn-hover-green">Dashboard</a>
        </div>

        <div className="table-responsive">
          <table className="table table-hover table-dark table-striped rounded shadow-lg">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Data Points</th>
                <th scope="col">Frequency</th>
                <th scope="col">Intensity</th>
                <th scope="col">Duration (seconds)</th>
                <th scope="col">Vibration Level</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>
                    <button
                      onClick={() => openModal(report)}
                      className="btn btn-primary btn-hover-blue"
                    >
                      View Data Points
                    </button>
                  </td>
                  <td>{report.frequency}</td>
                  <td>{report.intensity}</td>
                  <td>{report.duration}</td>
                  <td>{report.vibration_level}</td>
                  <td>
                    <button
                      onClick={() => downloadXML(report)}
                      className="btn btn-success btn-hover-green"
                    >
                      Download XML
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="d-flex justify-content-center mt-6">
          <button
            onClick={() => fetchReports(currentPage - 1)}
            disabled={!prevPage}
            className={`btn btn-outline-light btn-hover-green me-2 ${!prevPage ? 'disabled' : ''}`}
          >
            Previous
          </button>
          <button
            onClick={() => fetchReports(currentPage + 1)}
            disabled={!nextPage}
            className={`btn btn-outline-light btn-hover-green ms-2 ${!nextPage ? 'disabled' : ''}`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal for displaying data points */}
      {isModalOpen && selectedReport && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content bg-dark text-white border border-steins-green">
              <div className="modal-header">
                <h5 className="modal-title">Data Points for Report {selectedReport.id}</h5>
                <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={closeModal}></button>
              </div>
              <div className="modal-body overflow-auto">
                <ul className="list-group">
                  {selectedReport.data_points.map((point, index) => (
                    <li key={index} className="list-group-item bg-dark text-white">
                      <strong>Time:</strong> {point.time}s, <strong>Frequency:</strong> {point.frequency}Hz,{' '}
                      <strong>Intensity:</strong> {point.intensity}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button onClick={closeModal} className="btn btn-outline-light btn-hover-green">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimulationReports;
