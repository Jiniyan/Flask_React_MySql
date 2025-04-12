
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
// Generate XML for download
const generateXML = (report) => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<simulationReport>\n`;
  xml += `  <id>${report.id}</id>\n`;
  xml += `  <frequency>${report.frequency}</frequency>\n`;
  xml += `  <intensity>${report.intensity}</intensity>\n`;
  xml += `  <duration>${report.duration}</duration>\n`;
  xml += `  <vibrationLevel>${report.vibration_level}</vibrationLevel>\n`;
  // Add to XML generation
  xml += `  <batteryStatus>${report.battery_status ?? 'N/A'}</batteryStatus>\n`;

  xml += `  <dataPoints>\n`;

  report.data_points?.forEach((point) => {
    xml += `    <dataPoint>\n`;
    xml += `      <time>${point.time}</time>\n`;
    xml += `      <frequency>${point.frequency}</frequency>\n`;
    xml += `      <intensity>${point.intensity}</intensity>\n`;
    xml += `      <voltage>${point.voltage ?? 'N/A'}</voltage>\n`;
    xml += `      <temperature>${point.temperature ?? 'N/A'}</temperature>\n`;
    xml += `    </dataPoint>\n`;
  });

  xml += `  </dataPoints>\n</simulationReport>`;
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
    let cursorY = 30;
    const chartHeight = 50;
    const chartWidth = 180;
    const dataPoints = report.data_points || [];
  
    const navyBlue = [20, 40, 80];
    const neonGreen = [57, 255, 20];
  
    // === 1. Calculate averages ===
    const calcAverage = (field) =>
      (dataPoints.reduce((sum, p) => sum + (parseFloat(p[field]) || 0), 0) / dataPoints.length).toFixed(2);
  
    const avgFreq = calcAverage('frequency');
    const avgInt = calcAverage('intensity');
    const avgVolt = calcAverage('voltage');
    const avgTemp = calcAverage('temperature');
  
    // === 2. Title ===
    doc.setFontSize(24);
    doc.setTextColor(...navyBlue);
    doc.text('Simulation Report', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  
    // === 3. Header & Summary Side by Side ===
    doc.setFontSize(14);

    // === Report Details (Left Column) ===
    doc.setTextColor(...navyBlue);
    doc.setFont(undefined, 'normal');

// Add to PDF Report Header Data
  const headerData = [
    { label: 'Report ID', value: `${report.id}` },
    { label: 'Duration', value: formatDuration(report.duration) },
    { label: 'Vibration Level', value: report.vibration_level },
    { label: 'Battery Status', value: report.battery_status || 'N/A' }
  ];


    const leftLabelX = margin;
    const leftColonX = margin + 35;
    const leftValueX = margin + 45;

    headerData.forEach((item) => {
      doc.text(item.label, leftLabelX, cursorY);
      doc.text(':', leftColonX, cursorY);
      doc.text(item.value, leftValueX, cursorY);
      cursorY += 6;
    });
  
    let rightX = 110;
    let summaryY = 30;
    doc.setTextColor(...navyBlue);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("Averages Summary", rightX, summaryY);
    doc.setFont(undefined, 'normal');
    summaryY += 8;
    doc.setTextColor(...navyBlue);
    doc.setFontSize(12);

    const summaryData = [
      { label: 'Frequency', value: `${avgFreq} Hz` },
      { label: 'Intensity', value: `${avgInt} m/s²` },
      { label: 'Voltage', value: `${avgVolt} V` },
      { label: 'Temperature', value: `${avgTemp} °C` },
    ];
    
    const labelX = rightX;
    const colonX = rightX + 35;
    const valueX = rightX + 45;
    
    summaryData.forEach((item) => {
      doc.text(item.label, labelX, summaryY);
      doc.text(':', colonX, summaryY);
      doc.text(item.value, valueX, summaryY);
      summaryY += 6;
    });
  
    cursorY = Math.max(cursorY, summaryY) + 10;
  
    // === Time Formatter ===
    const formatElapsedTime = (seconds) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
    
      if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
      if (mins > 0) return `${mins}m ${secs}s`;
      return `${secs}s`;
    };
    
    const createChartImage = async (label, dataField, color) => {
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = 600 * scale;
      canvas.height = 200 * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
    
      const dataset = dataPoints.map(p => parseFloat(p[dataField]) || 0);
      const minVal = Math.min(...dataset);
      const maxVal = Math.max(...dataset);
      const padding = (maxVal - minVal) * 0.2 || 1;
    
      // === Actual Time Handling ===
      let elapsedTimes = [];
    
      const hasTimestamps = dataPoints.every(p => p.time);
      if (hasTimestamps) {
        const startTime = new Date(dataPoints[0].time).getTime();
        elapsedTimes = dataPoints.map(p =>
          Math.floor((new Date(p.time).getTime() - startTime) / 1000)
        );
      } else {
        const durationSec = report.duration || dataPoints.length;
        const interval = durationSec / dataPoints.length;
        elapsedTimes = dataPoints.map((_, i) => Math.floor(i * interval));
      }
    
      // === Labels - Limit to 10 ===
      const step = Math.ceil(dataPoints.length / 10);
      const labels = elapsedTimes.map((elapsed, i) =>
        i % step === 0 ? formatElapsedTime(elapsed) : ''
      );
      // === Highlighted Dots Configuration ===
      const pointRadius = dataPoints.map((_, i) => (i % step === 0 ? 3 : 0));
      const pointColors = dataPoints.map((_, i) => (i % step === 0 ? 'red' : 'transparent'));

      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label,
            data: dataset,
            fill: false,
            borderColor: color,
            borderWidth: 3,
            pointRadius: pointRadius,
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
          }],
          
          
        },
        options: {
          responsive: false,
          animation: false,
          scales: {
            x: {
              ticks: {
                color: 'navy',
                font: { size: 45 },
                maxRotation: 45,
                minRotation: 45,
                maxTicksLimit: 10,
              },
              grid: { color: 'rgba(20, 40, 80, 0.2)' },
            },
            y: {
              min: minVal - padding,
              max: maxVal + padding,
              ticks: { color: 'navy', font: { size: 45 } },
              grid: { color: 'rgba(20, 40, 80, 0.2)' },
            },
          },
          plugins: {
            legend: {
              labels: {
                color: 'navy',
                font: { size: 60 },
              },
            },
            decimation: {
              enabled: true,
              algorithm: 'lttb',
            },
          },
        },
      });
    
      await new Promise(resolve => setTimeout(resolve, 300));
      return canvas.toDataURL('image/png', 1.0);
    };
  
    // === Chart Definitions ===
    const charts = [
      { label: 'Frequency (Hz)', field: 'frequency', color: 'rgba(0, 255, 128, 1)' },
      { label: 'Intensity (m/s²)', field: 'intensity', color: 'rgba(57, 255, 20, 1)' },
      { label: 'Voltage (V)', field: 'voltage', color: 'rgba(0, 200, 255, 1)' },
      { label: 'Temperature (°C)', field: 'temperature', color: 'rgba(255, 255, 0, 1)' },
    ];
  
    for (const chart of charts) {
      const imgData = await createChartImage(chart.label, chart.field, chart.color);
      if (cursorY + chartHeight > 250) {
        doc.addPage();
        cursorY = margin;
      }
      doc.addImage(imgData, 'PNG', margin, cursorY, chartWidth, chartHeight);
      cursorY += chartHeight + 10;
    }
  
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
      <th>Battery Status</th>
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
        <td>{report.battery_status || 'N/A'}</td>

        
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