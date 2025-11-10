import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import './Solar_Power.css';

const firebaseConfig = {
  apiKey: "AIzaSyB9ererNsNonAzH0zQo_GS79XPOyCoMxr4",
  authDomain: "waterdtection.firebaseapp.com",
  databaseURL: "https://waterdtection-default-rtdb.firebaseio.com",
  projectId: "waterdtection",
  storageBucket: "waterdtection.firebasestorage.app",
  messagingSenderId: "690886375729",
  appId: "1:690886375729:web:172c3a47dda6585e4e1810",
  measurementId: "G-TXF33Y6XY0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

function SolarPower() {
  const [solarData, setSolarData] = useState({
    Battery_Percent: 0,
    Car_Current: 0,
    Car_Voltage: 0,
    Wired: 0,
    Wired_Voltage: 0,
    Wireless: 0,
    Wireless_Voltage: 0
  });

  const [dataHistory, setDataHistory] = useState({
    Battery_Percent: [],
    Car_Current: [],
    Car_Voltage: [],
    Wired_Voltage: [],
    Wireless_Voltage: []
  });

  const canvasRefs = {
    battery: useRef(null),
    carCurrent: useRef(null),
    carVoltage: useRef(null),
    solarVoltage: useRef(null),
    wirelessVoltage: useRef(null)
  };

  useEffect(() => {
    const solarRef = ref(database, 'Hybrid_Power');
    
    const unsubscribe = onValue(solarRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSolarData({
          Battery_Percent: data.Battery_Percent || 0,
          Car_Current: data.Car_Current || 0,
          Car_Voltage: data.Car_Voltage || 0,
          Wired: data.Wired || 0,
          Wired_Voltage: data.Wired_Voltage || 0,
          Wireless: data.Wireless || 0,
          Wireless_Voltage: data.Wireless_Voltage || 0
        });

        // Update history for graphs
        setDataHistory(prev => ({
          Battery_Percent: [...prev.Battery_Percent.slice(-29), data.Battery_Percent || 0],
          Car_Current: [...prev.Car_Current.slice(-29), data.Car_Current || 0],
          Car_Voltage: [...prev.Car_Voltage.slice(-29), data.Car_Voltage || 0],
          Wired_Voltage: [...prev.Wired_Voltage.slice(-29), data.Wired_Voltage || 0],
          Wireless_Voltage: [...prev.Wireless_Voltage.slice(-29), data.Wireless_Voltage || 0]
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  // Draw sine wave graphs
  useEffect(() => {
    drawSineWave(canvasRefs.battery.current, dataHistory.Battery_Percent, '#6366f1', '%');
    drawSineWave(canvasRefs.carCurrent.current, dataHistory.Car_Current, '#10b981', 'A');
    drawSineWave(canvasRefs.carVoltage.current, dataHistory.Car_Voltage, '#f59e0b', 'V');
    drawSineWave(canvasRefs.solarVoltage.current, dataHistory.Wired_Voltage, '#ef4444', 'V');
    drawSineWave(canvasRefs.wirelessVoltage.current, dataHistory.Wireless_Voltage, '#8b5cf6', 'V');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataHistory]);

  const drawSineWave = (canvas, data, color, unit) => {
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw light grid lines
    ctx.strokeStyle = 'rgba(230, 230, 230, 0.6)';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    const gridSpacing = 30;
    for (let i = 0; i < width; i += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i < height; i += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Find min and max for scaling
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    // Create smooth sine wave using more points
    const points = [];
    for (let i = 0; i < width; i++) {
      const dataIndex = Math.floor((i / width) * data.length);
      const value = data[dataIndex] || 0;
      const x = i;
      const y = height - ((value - min) / range) * (height - 20) - 10;
      points.push({ x, y });
    }

    // Draw the smooth wave with bezier curves
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Use quadratic curves for smooth sine wave
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    // Draw the last segment
    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
    }

    ctx.stroke();

    // Add value labels at corners
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    const currentValue = parseFloat(data[data.length - 1]) || 0;
    ctx.fillText(`${currentValue.toFixed(3)} ${unit}`, 8, 15);
  };

  const getBatteryStatus = () => {
    const percent = solarData.Battery_Percent;
    if (percent >= 80) return { status: 'Excellent', color: '#51cf66', icon: '🔋' };
    if (percent >= 50) return { status: 'Good', color: '#ffd93d', icon: '🔋' };
    if (percent >= 20) return { status: 'Low', color: '#ff922b', icon: '🪫' };
    return { status: 'Critical', color: '#ff6b6b', icon: '🪫' };
  };

  const batteryStatus = getBatteryStatus();

  return (
    <div className="solar-container">
      <div className="solar-header">
        <h1 className="solar-title">☀️ Solar Power Monitoring System</h1>
        <div className="solar-subtitle">Hybrid Energy Management Dashboard</div>
        <div className="live-indicator">
          <span className="pulse-dot"></span>
          <span>LIVE DATA</span>
        </div>
      </div>

      <div className="solar-cards-grid">
        {/* Battery Percent Card */}
        <div className="solar-card battery-card">
          <div className="card-header">
            <div className="card-icon-circle" style={{ background: '#eef2ff' }}>
              <span style={{ color: '#6366f1' }}>✓</span>
            </div>
            <h3>Battery Level</h3>
          </div>
          <div className="card-body">
            <div className="main-value" style={{ color: '#1e293b' }}>
              {solarData.Battery_Percent || 0}
              <span className="unit">%</span>
            </div>
            <div className="sub-label">Percentage</div>
          </div>
          <div className="card-graph-wrapper">
            <div className="graph-header">
              <span className="graph-title">📊 Battery Level Wave</span>
              <span className="graph-value" style={{ color: '#6366f1' }}>
                {solarData.Battery_Percent || 0}%
              </span>
            </div>
            <div className="card-graph">
              <canvas ref={canvasRefs.battery} width="500" height="150"></canvas>
            </div>
          </div>
        </div>

        {/* Car Current Card */}
        <div className="solar-card current-card">
          <div className="card-header">
            <div className="card-icon-circle" style={{ background: '#f0fdf4' }}>
              <span style={{ color: '#10b981' }}>!</span>
            </div>
            <h3>Car Current</h3>
          </div>
          <div className="card-body">
            <div className="main-value" style={{ color: '#1e293b' }}>
              {solarData.Car_Current || 0}
              <span className="unit">A</span>
            </div>
            <div className="sub-label">Amperes</div>
          </div>
          <div className="card-graph-wrapper">
            <div className="graph-header">
              <span className="graph-title">📊 Current Wave</span>
              <span className="graph-value" style={{ color: '#10b981' }}>
                {solarData.Car_Current || 0} A
              </span>
            </div>
            <div className="card-graph">
              <canvas ref={canvasRefs.carCurrent} width="500" height="150"></canvas>
            </div>
          </div>
        </div>

        {/* Car Voltage Card */}
        <div className="solar-card voltage-card">
          <div className="card-header">
            <div className="card-icon-circle" style={{ background: '#fef3c7' }}>
              <span style={{ color: '#f59e0b' }}>⚡</span>
            </div>
            <h3>Car Voltage</h3>
          </div>
          <div className="card-body">
            <div className="main-value" style={{ color: '#1e293b' }}>
              {solarData.Car_Voltage || 0}
              <span className="unit">V</span>
            </div>
            <div className="sub-label">Volts</div>
          </div>
          <div className="card-graph-wrapper">
            <div className="graph-header">
              <span className="graph-title">📊 Voltage Wave</span>
              <span className="graph-value" style={{ color: '#f59e0b' }}>
                {solarData.Car_Voltage || 0} V
              </span>
            </div>
            <div className="card-graph">
              <canvas ref={canvasRefs.carVoltage} width="500" height="150"></canvas>
            </div>
          </div>
        </div>

        {/* Solar Voltage Card (Wired) */}
        <div className="solar-card solar-voltage-card">
          <div className="card-header">
            <div className="card-icon-circle" style={{ background: '#fef2f2' }}>
              <span style={{ color: '#ef4444' }}>☀</span>
            </div>
            <h3>Solar Voltage</h3>
          </div>
          <div className="card-body">
            <div className="main-value" style={{ color: '#1e293b' }}>
              {solarData.Wired_Voltage || 0}
              <span className="unit">V</span>
            </div>
            <div className="sub-label">Volts</div>
          </div>
          <div className="card-graph-wrapper">
            <div className="graph-header">
              <span className="graph-title">📊 Solar Voltage Wave</span>
              <span className="graph-value" style={{ color: '#ef4444' }}>
                {solarData.Wired_Voltage || 0} V
              </span>
            </div>
            <div className="card-graph">
              <canvas ref={canvasRefs.solarVoltage} width="500" height="150"></canvas>
            </div>
          </div>
        </div>

        {/* Wireless Voltage Card */}
        <div className="solar-card wireless-card">
          <div className="card-header">
            <div className="card-icon-circle" style={{ background: '#faf5ff' }}>
              <span style={{ color: '#8b5cf6' }}>📡</span>
            </div>
            <h3>Wireless Voltage</h3>
          </div>
          <div className="card-body">
            <div className="main-value" style={{ color: '#1e293b' }}>
              {solarData.Wireless_Voltage || 0}
              <span className="unit">V</span>
            </div>
            <div className="sub-label">Volts</div>
          </div>
          <div className="card-graph-wrapper">
            <div className="graph-header">
              <span className="graph-title">📊 Wireless Wave</span>
              <span className="graph-value" style={{ color: '#8b5cf6' }}>
                {solarData.Wireless_Voltage || 0} V
              </span>
            </div>
            <div className="card-graph">
              <canvas ref={canvasRefs.wirelessVoltage} width="500" height="150"></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="system-overview">
        <h2>System Overview</h2>
        <div className="overview-grid">
          <div className="overview-item">
            <span className="overview-label">Battery Charge:</span>
            <span className="overview-value" style={{ color: batteryStatus.color }}>
              {solarData.Battery_Percent}%
            </span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Current Draw:</span>
            <span className="overview-value">{solarData.Car_Current} A</span>
          </div>
          <div className="overview-item">
            <span className="overview-label">System Voltage:</span>
            <span className="overview-value">{solarData.Car_Voltage} V</span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Solar Input:</span>
            <span className="overview-value">{solarData.Wired_Voltage} V</span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Wireless Power:</span>
            <span className="overview-value">{solarData.Wireless_Voltage} V</span>
          </div>
          <div className="overview-item">
            <span className="overview-label">Power Source:</span>
            <span className="overview-value">
              {solarData.Wired === 1 && solarData.Wireless === 1 ? 'Hybrid' : 
               solarData.Wired === 1 ? 'Solar' : 
               solarData.Wireless === 1 ? 'Wireless' : 'Battery'}
            </span>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="status-section">
        <h3>Power Sources Status</h3>
        <div className="status-grid">
          <div className={`status-card ${solarData.Wired === 1 ? 'active-source' : 'inactive-source'}`}>
            <div className="status-icon">☀️</div>
            <div className="status-name">Solar (Wired)</div>
            <div className="status-value">{solarData.Wired === 1 ? 'ACTIVE' : 'INACTIVE'}</div>
          </div>
          <div className={`status-card ${solarData.Wireless === 1 ? 'active-source' : 'inactive-source'}`}>
            <div className="status-icon">📡</div>
            <div className="status-name">Wireless Charging</div>
            <div className="status-value">{solarData.Wireless === 1 ? 'ACTIVE' : 'INACTIVE'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SolarPower;
