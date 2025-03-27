
import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './steinsGateStyle.css';
import axiosInstance from '../utils/axiosInstance'; // Import the custom Axios instance
import Navbar from './Navbar'; // Import Navbar component
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Chart from 'chart.js/auto';

function SimulationReports() {
  const [reports, setReports] = useState([]); // Initialize as an empty array
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc'); // Sorting state for the timestamp column

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
  const fetchReports = async (page = 1, order = sortOrder) => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/simulation-reports/?page=${page}&sort=timestamp&order=${order}`);
      setReports(response.data.results || []);
      setNextPage(response.data.next);
      setPrevPage(response.data.previous);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  
  // Fetch reports on component mount
  useEffect(() => {
    fetchReports(1, sortOrder);
  }, [sortOrder]);
  

  // Handle sorting
  const sortReportsByTimestamp = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
  };
  

  // Modal handling
  const openModal = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedReport(null);
    setIsModalOpen(false);
  };
// Format timestamp into a readable format like "Nov 25, 2024 | 6:47 PM"
  const formatTimestamp = (isoString) => {
    if (!isoString) return 'N/A';

    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
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

  // Generate PDF for download
  const generatePDF = async (report) => {
    const doc = new jsPDF();
    const margin = 10;
    let cursorY = 10;
  
    const dataPoints = report.data_points || [];
  
    // === 1. Calculate averages ===
    const calcAverage = (field) =>
      (dataPoints.reduce((sum, p) => sum + (parseFloat(p[field]) || 0), 0) / dataPoints.length).toFixed(2);
  
    const avgFreq = calcAverage('frequency');
    const avgInt = calcAverage('intensity');
    const avgVolt = calcAverage('voltage');
    const avgTemp = calcAverage('temperature');
  
    // === 2. Report Header ===
    doc.setFontSize(16);
    doc.text(`Simulation Report ID: ${report.id}`, margin, cursorY);
    cursorY += 10;
  
    doc.setFontSize(12);
    doc.text(`Duration: ${formatDuration(report.duration)}`, margin, cursorY);
    cursorY += 10;
    doc.text(`Vibration Level: ${report.vibration_level}`, margin, cursorY);
    cursorY += 10;
  
    // === 3. Averages Summary ===
    doc.setFontSize(14);
    doc.text("Averages", margin, cursorY);
    cursorY += 8;
  
    doc.setFontSize(12);
    doc.text(`Avg Frequency: ${avgFreq} Hz`, margin, cursorY); cursorY += 6;
    doc.text(`Avg Intensity: ${avgInt} m/s²`, margin, cursorY); cursorY += 6;
    doc.text(`Avg Voltage: ${avgVolt} V`, margin, cursorY); cursorY += 6;
    doc.text(`Avg Temperature: ${avgTemp} °C`, margin, cursorY); cursorY += 10;
  
    // === 4. Create Chart (canvas -> image) ===
    const createChartImage = async (label, dataField, color = 'rgba(255,99,132,0.8)') => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
  
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: dataPoints.map((p, i) => `T${i}`),
          datasets: [{
            label,
            data: dataPoints.map(p => p[dataField]),
            fill: false,
            borderColor: color,
            tension: 0.1,
          }],
        },
        options: {
          responsive: false,
          animation: false,
          scales: {
            x: { ticks: { display: false } },
          },
        }
      });
  
      await new Promise((resolve) => setTimeout(resolve, 500)); // give Chart.js time to draw
      return canvas.toDataURL('image/png');
    };
  
    const charts = [
      { label: 'Frequency (Hz)', field: 'frequency' },
      { label: 'Intensity (m/s²)', field: 'intensity' },
      { label: 'Voltage (V)', field: 'voltage' },
      { label: 'Temperature (°C)', field: 'temperature' },
    ];
  
    for (const chart of charts) {
      const imgData = await createChartImage(chart.label, chart.field);
      doc.addImage(imgData, 'PNG', margin, cursorY, 180, 50);
      cursorY += 55;
    }
  
    // === 5. Table of Raw Data ===
    const tableRows = dataPoints.map(p => [
      formatTimestamp(p.time),
      p.frequency,
      p.intensity,
      p.voltage ?? 'N/A',
      p.temperature ?? 'N/A',
    ]);
  
    doc.autoTable({
      startY: cursorY,
      head: [['Time', 'Frequency', 'Intensity', 'Voltage', 'Temperature']],
      body: tableRows,
      margin: { top: 10 },
      styles: { fontSize: 8 },
    });
  
    doc.save(`simulation-summary-${report.id}.pdf`);
  };
  

  return (
    <div className="bg-gray-900 min-h-screen text-white">
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
      <th>First Timestamp 
        <button onClick={sortReportsByTimestamp} className="btn btn-link text-light ms-2">
          Sort {sortOrder === 'asc' ? '▲' : '▼'}
        </button>
      </th>
      <th>Frequency</th>
      <th>Intensity</th>
      <th>Duration (hr/min/sec)</th>
      <th>Vibration Level</th>
      <th>Data Points</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {reports.map((report) => (
      <tr key={report.id}>
        <td>{report.id}</td>
        <td>{formatTimestamp(report.data_points?.[0]?.time)}</td>
        <td>{report.frequency}</td>
        <td>{report.intensity}</td>
        <td>{formatDuration(report.duration)}</td>
        <td>{report.vibration_level}</td>
        <td>
          <button onClick={() => openModal(report)} className="btn btn-info btn-sm">View</button>
        </td>
        <td>
          <button onClick={() => downloadXML(report)} className="btn btn-steins-green btn-sm">Download XML</button>
          <button onClick={() => generatePDF(report)} className="btn btn-steins-orange btn-sm ms-2">Download PDF</button>
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
                      <strong>Time:</strong> {formatTimestamp(point.time)},
                      <strong> Frequency:</strong> {point.frequency}Hz, 
                      <strong> Intensity:</strong> {point.intensity}m/s^-2, 
                      <strong> Voltage:</strong> {point.voltage ?? 'N/A'}V, 
                      <strong> Temp:</strong> {point.temperature ?? 'N/A'}°C
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