import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Camera, RefreshCw, Send, CheckCircle, AlertCircle, User, Phone, Home, Mail, Eye, Trash2, Edit2, BarChart3, Search, Download, Printer } from 'lucide-react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  // Main navigation state
  const [currentPage, setCurrentPage] = useState('checkin'); // checkin or admin
  const [adminPassword, setAdminPassword] = useState('');

  // Admin tab state
  const [currentAdminTab, setCurrentAdminTab] = useState('visitors'); // visitors, stats, search
  
  // Check-in form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    flatNumber: '',
    flatOwnerEmail: ''
  });
  
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [stream, setStream] = useState(null);
  
  // Visitors list state
  const [visitors, setVisitors] = useState([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Stats state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const cameraStreamRef = useRef(null);

  // Initialize camera
  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      console.log('Got media stream:', mediaStream);
      console.log('Media stream tracks:', mediaStream.getTracks().length);
      
      // Set the stream state which will trigger the useEffect to connect it to the video element
      setStream(mediaStream);
      setCameraActive(true);
      showNotification('info', 'Camera ready! Click "Capture Photo" when ready.');
    } catch (err) {
      console.error('Camera error:', err);
      showNotification('error', 'Camera access denied. Please enable permissions in browser settings.');
    }
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    // Stop tracks if a stream exists
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // Ensure the video element is cleared and paused so any pending play() is not interrupted
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch (e) { /* ignore */ }
      try { videoRef.current.srcObject = null; } catch (e) { /* ignore */ }
    }

    // Clear stream state and UI flag
    setStream(null);
    setCameraActive(false);
  }, [stream]);

  // Capture photo
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    console.log('=== CAPTURE PHOTO STARTED ===');
    console.log('Video element:', video);
    console.log('Canvas element:', canvas);
    
    if (!video || !canvas) {
      console.error('❌ Video or canvas not available');
      showNotification('error', 'Camera not ready. Please try again.');
      return;
    }

    try {
      // Log video properties
      console.log('Video properties:');
      console.log('  readyState:', video.readyState, '(4=HAVE_ENOUGH_DATA)');
      console.log('  videoWidth:', video.videoWidth);
      console.log('  videoHeight:', video.videoHeight);
      console.log('  paused:', video.paused);
      console.log('  currentTime:', video.currentTime);
      
      // Check if video is ready
      if (video.readyState < 2) {
        console.error('❌ Video not ready. ReadyState:', video.readyState);
        showNotification('error', 'Camera not ready. Please wait and try again.');
        return;
      }

      // Check if video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('❌ Video has no dimensions. Width:', video.videoWidth, 'Height:', video.videoHeight);
        showNotification('error', 'Video dimensions are 0. Please try again.');
        return;
      }
      
      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log('✅ Canvas dimensions set to:', canvas.width, 'x', canvas.height);
      
      // Get canvas context
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2D context');
      }
      console.log('✅ Got canvas 2D context');
      
      // Draw the video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log('✅ Image drawn to canvas');
      
      // Convert to data URL
      const photoData = canvas.toDataURL('image/jpeg', 0.85);
      console.log('✅ Photo data URL created');
      console.log('   Length:', photoData.length);
      console.log('   First 50 chars:', photoData.substring(0, 50));
      
      // Validate the data URL
      if (!photoData || photoData.length < 100) {
        throw new Error('Generated photo data is invalid or too small. Length: ' + photoData.length);
      }
      console.log('✅ Photo data validated');
      
      console.log('📝 Setting state...');
      // Set both states
      setPhoto(photoData);
      setPhotoPreview(photoData);
      console.log('✅ setPhoto() and setPhotoPreview() called');
      
      console.log('🛑 Stopping camera...');
      // Stop camera
      stopCamera();
      
      showNotification('success', '✅ Photo captured successfully!');
      console.log('=== CAPTURE PHOTO COMPLETED ===');
    } catch (err) {
      console.error('❌ Capture error:', err);
      showNotification('error', `Failed to capture photo: ${err.message}`);
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    startCamera();
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Show notification
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 5000);
  };

  // Admin authentication
  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setCurrentPage('admin');
      setAdminPassword('');
      showNotification('success', '✅ Admin panel unlocked');
    } else {
      showNotification('error', '❌ Incorrect password');
    }
  };

  const handleAdminLogout = () => {
    setCurrentPage('checkin');
    setAdminPassword('');
    showNotification('info', 'Logged out of admin panel');
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!photo) {
      showNotification('error', 'Please take a photo first');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📤 Preparing form submission...');
      
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('phone', formData.phone);
      submitData.append('flat_number', formData.flatNumber);
      // Send photo as base64 string (the data URL from canvas.toDataURL())
      submitData.append('photo', photo);
      
      if (formData.flatOwnerEmail) {
        submitData.append('flat_owner_email', formData.flatOwnerEmail);
      }

      console.log('📨 Submitting to:', `${API_URL}/api/visitors`);
      
      const submitResponse = await fetch(`${API_URL}/api/visitors`, {
        method: 'POST',
        body: submitData
      });

      console.log('Response status:', submitResponse.status);
      
      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('Server error:', errorText);
        throw new Error(`Server error: ${submitResponse.status} - ${errorText}`);
      }

      const responseData = await submitResponse.json();
      console.log('✅ Submission successful:', responseData);
      
      showNotification('success', '✅ Check-in successful! Security has been notified.');
      
      // Reset form after 2 seconds
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (err) {
      showNotification('error', '⚠️ Failed to submit. Please try again.');
      console.error('❌ Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      flatNumber: '',
      flatOwnerEmail: ''
    });
    setPhoto(null);
    setPhotoPreview(null);
    setCameraActive(false);
  };

  // ===== VISITORS LIST FUNCTIONS =====
  const loadVisitors = async () => {
    setLoadingVisitors(true);
    try {
      const response = await fetch(`${API_URL}/api/visitors`);
      const data = await response.json();
      setVisitors(data.visitors || []);
    } catch (err) {
      showNotification('error', 'Failed to load visitors');
      console.error(err);
    } finally {
      setLoadingVisitors(false);
    }
  };

  const deleteVisitor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this visitor?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/visitors/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showNotification('success', '✅ Visitor deleted');
        loadVisitors();
      } else {
        showNotification('error', 'Failed to delete visitor');
      }
    } catch (err) {
      showNotification('error', 'Error deleting visitor');
    }
  };

  const startEditing = (visitor) => {
    setEditingVisitor(visitor.id);
    setEditFormData({
      name: visitor.name,
      phone: visitor.phone,
      flatNumber: visitor.flat_number
    });
  };

  const saveEdit = async (id) => {
    try {
      const formDataEdit = new FormData();
      formDataEdit.append('name', editFormData.name);
      formDataEdit.append('phone', editFormData.phone);
      formDataEdit.append('flat_number', editFormData.flatNumber);
      
      const response = await fetch(`${API_URL}/api/visitors/${id}`, {
        method: 'PUT',
        body: formDataEdit
      });
      
      if (response.ok) {
        showNotification('success', '✅ Visitor updated');
        setEditingVisitor(null);
        loadVisitors();
      } else {
        showNotification('error', 'Failed to update visitor');
      }
    } catch (err) {
      showNotification('error', 'Error updating visitor');
    }
  };

  // ===== STATS FUNCTIONS =====
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      showNotification('error', 'Failed to load statistics');
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  // ===== SEARCH FUNCTIONS =====
  const performSearch = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/visitors/search/${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.visitors || []);
    } catch (err) {
      showNotification('error', 'Search failed');
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // ===== PDF EXPORT =====
  const exportToPDF = () => {
    // Note: jsPDF library would need to be installed separately
    // For now, use the browser's print function instead
    printVisitors();
    showNotification('info', 'Opening print dialog for PDF export...');
  };

  // ===== PRINT FUNCTION =====
  const printVisitors = () => {
    const printWindow = window.open('', '', 'width=900,height=600');
    let html = `
      <html>
        <head>
          <title>Visitor Report</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #667eea; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h2>Visitor Report</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Flat</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    visitors.forEach(v => {
      html += `
        <tr>
          <td>${v.id}</td>
          <td>${v.name}</td>
          <td>${v.phone}</td>
          <td>${v.flat_number}</td>
          <td>${new Date(v.timestamp).toLocaleString()}</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle camera setup when stream becomes available
  useEffect(() => {
    // Only proceed if we have a stream and it's different from what we've already set up
    if (!stream || !videoRef.current || cameraStreamRef.current === stream) {
      return;
    }

    console.log('Setting up video element with stream...');
    const videoElement = videoRef.current;
    cameraStreamRef.current = stream; // Mark this stream as initialized
    videoElement.srcObject = stream;
    console.log('✅ srcObject set');

    let playTimer = null;
    let mounted = true;

    const attemptPlay = async () => {
      if (!mounted || !videoElement.isConnected) return;
      
      try {
        console.log('[Play] Calling play()...');
        await videoElement.play();
        console.log('✅ Video playing!');
      } catch (err) {
        console.warn('[Play Error]', err.name);
      }
    };

    // Wait for metadata or timeout
    const handleMetadata = () => {
      if (mounted) {
        console.log('✅ Metadata loaded');
        attemptPlay();
      }
    };

    videoElement.addEventListener('loadedmetadata', handleMetadata);

    // Fallback timer after 1 second
    playTimer = setTimeout(() => {
      if (mounted) {
        console.log('[Timeout] Attempting play via timeout');
        attemptPlay();
      }
    }, 1000);

    return () => {
      mounted = false;
      videoElement.removeEventListener('loadedmetadata', handleMetadata);
      if (playTimer) clearTimeout(playTimer);
    };
  }, [stream]);

  // Monitor photo state changes
  useEffect(() => {
    console.log('📊 Photo state changed:', photo ? `✅ SET (${photo.length} bytes)` : '❌ NOT SET');
  }, [photo]);

  const isFormValid = formData.name && formData.phone && formData.flatNumber && photo;

  return (
    <div className="app-container">
      {/* Animated background */}
      <div className="background-animation">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          {notification.type === 'success' ? (
            <CheckCircle size={20} />
          ) : notification.type === 'info' ? (
            <Camera size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="main-card">
        {/* Header */}
        <div className="card-header">
          <div className="header-icon">🏢</div>
          {currentPage === 'checkin' ? (
            <>
              <h1 className="header-title">Visitor Check-In</h1>
              <p className="header-subtitle">Please register your visit for security purposes</p>
            </>
          ) : (
            <>
              <h1 className="header-title">Admin Dashboard</h1>
              <p className="header-subtitle">Manage visitors and view statistics</p>
            </>
          )}
        </div>

        {/* CHECK-IN PAGE */}
        {currentPage === 'checkin' && (
        <div>
          {/* Admin Access Button */}
          <div style={{ textAlign: 'right', padding: '0 var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => {
                const pwd = prompt('Enter admin password:');
                if (pwd) {
                  setAdminPassword(pwd);
                  setTimeout(() => handleAdminLogin(), 100);
                }
              }}
              style={{ fontSize: '0.8rem' }}
            >
              Admin Access
            </button>
          </div>

          <form onSubmit={handleSubmit} className="form-container">
          {/* Visitor Information Section */}
          <div className="section">
            <div className="section-header">
              <User size={20} />
              <h2>Visitor Information</h2>
            </div>

            <div className="input-group">
              <label htmlFor="name">
                Full Name <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="phone">
                Phone Number <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="flatNumber">
                Flat Number Visiting <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <Home size={18} className="input-icon" />
                <select
                  id="flatNumber"
                  name="flatNumber"
                  value={formData.flatNumber}
                  onChange={handleInputChange}
                  required
                  className="select-input"
                >
                  <option value="">-- Select Flat Number --</option>
                  <optgroup label="Ground Floor (G)">
                    <option value="G01">G01</option>
                    <option value="G02">G02</option>
                    <option value="G03">G03</option>
                    <option value="G04">G04</option>
                    <option value="G05">G05</option>
                    <option value="G06">G06</option>
                    <option value="G07">G07</option>
                    <option value="G08">G08</option>
                    <option value="G09">G09</option>
                    <option value="G10">G10</option>
                    <option value="G11">G11</option>
                  </optgroup>
                  <optgroup label="First Floor (1)">
                    <option value="101">101</option>
                    <option value="102">102</option>
                    <option value="103">103</option>
                    <option value="104">104</option>
                    <option value="105">105</option>
                    <option value="106">106</option>
                    <option value="107">107</option>
                    <option value="108">108</option>
                    <option value="109">109</option>
                    <option value="110">110</option>
                    <option value="111">111</option>
                  </optgroup>
                  <optgroup label="Second Floor (2)">
                    <option value="201">201</option>
                    <option value="202">202</option>
                    <option value="203">203</option>
                    <option value="204">204</option>
                    <option value="205">205</option>
                    <option value="206">206</option>
                    <option value="207">207</option>
                    <option value="208">208</option>
                    <option value="209">209</option>
                    <option value="210">210</option>
                    <option value="211">211</option>
                  </optgroup>
                  <optgroup label="Third Floor (3)">
                    <option value="301">301</option>
                    <option value="302">302</option>
                    <option value="303">303</option>
                    <option value="304">304</option>
                    <option value="305">305</option>
                    <option value="306">306</option>
                    <option value="307">307</option>
                    <option value="308">308</option>
                    <option value="309">309</option>
                    <option value="310">310</option>
                    <option value="311">311</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="flatOwnerEmail">
                Flat Owner Email <span className="optional">(Optional)</span>
              </label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="flatOwnerEmail"
                  name="flatOwnerEmail"
                  value={formData.flatOwnerEmail}
                  onChange={handleInputChange}
                  placeholder="owner@email.com"
                />
              </div>
              <small className="help-text">Owner will be notified of your visit</small>
            </div>
          </div>

          {/* Photo Section */}
          <div className="section">
            <div className="section-header">
              <Camera size={20} />
              <h2>Visitor Photo</h2>
            </div>

            {/* Debug Info */}
            <div style={{
              background: '#f0f0f0',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              Photo state: {photo ? '✅ SET' : '❌ NOT SET'}<br/>
              Camera active: {cameraActive ? '✅ YES' : '❌ NO'}<br/>
              Photo length: {photo ? photo.length : 'N/A'}
            </div>

            {!photo ? (
              <div className="camera-section">
                {!cameraActive ? (
                  <div className="camera-placeholder">
                    <div className="camera-placeholder-icon">
                      <Camera size={48} />
                    </div>
                    <p>Take a photo for security records</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={startCamera}
                    >
                      <Camera size={20} />
                      Start Camera
                    </button>
                  </div>
                ) : (
                  <div className="camera-container">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      width={1280}
                      height={720}
                      className="camera-video"
                    />
                    <button
                      type="button"
                      className="btn btn-primary capture-btn"
                      onClick={capturePhoto}
                    >
                      <Camera size={20} />
                      Capture Photo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="photo-preview-section">
                <div style={{ marginBottom: '10px', color: 'green', fontSize: '14px' }}>
                  ✅ Photo loaded in preview!
                </div>
                <div className="photo-preview">
                  <img 
                    src={photoPreview} 
                    alt="Visitor" 
                    onLoad={() => console.log('Image loaded successfully!')}
                    onError={(e) => console.error('Image failed to load:', e)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={retakePhoto}
                >
                  <RefreshCw size={20} />
                  Retake Photo
                </button>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-success btn-submit"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={20} />
                Submit Check-In
              </>
            )}
          </button>

          <p className="form-footer">
            All fields marked with <span className="required">*</span> are required
          </p>
        </form>
        </div>
        )}

        {/* ADMIN DASHBOARD */}
        {currentPage === 'admin' && (
        <div>
          {/* Admin Navigation Tabs */}
          <div className="nav-tabs">
            <button 
              className={`tab-button ${currentAdminTab === 'visitors' ? 'active' : ''}`}
              onClick={() => { setCurrentAdminTab('visitors'); loadVisitors(); }}
            >
              <Eye size={18} />
              Visitors
            </button>
            <button 
              className={`tab-button ${currentAdminTab === 'stats' ? 'active' : ''}`}
              onClick={() => { setCurrentAdminTab('stats'); loadStats(); }}
            >
              <BarChart3 size={18} />
              Statistics
            </button>
            <button 
              className={`tab-button ${currentAdminTab === 'search' ? 'active' : ''}`}
              onClick={() => setCurrentAdminTab('search')}
            >
              <Search size={18} />
              Search
            </button>
            <button 
              className="tab-button" 
              onClick={handleAdminLogout}
              style={{ marginLeft: 'auto', color: '#ef4444' }}
            >
              Logout
            </button>
          </div>

          {/* VISITORS TAB */}
          {currentAdminTab === 'visitors' && (
          <div className="tab-content">
            <div className="section-header" style={{ marginBottom: '20px' }}>
              <Eye size={20} />
              <h2>All Visitors</h2>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={printVisitors}>
                  <Printer size={16} />
                  Print
                </button>
                <button className="btn btn-secondary" onClick={exportToPDF}>
                  <Download size={16} />
                  Export PDF
                </button>
              </div>
            </div>

            {loadingVisitors ? (
              <p style={{ textAlign: 'center', padding: '20px' }}>Loading visitors...</p>
          ) : visitors.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No visitors yet</p>
          ) : (
            <div className="visitors-list">
              {visitors.map(visitor => (
                <div key={visitor.id} className="visitor-card">
                  <div className="visitor-info">
                    <h3>{visitor.name}</h3>
                    <p><Phone size={14} /> {visitor.phone}</p>
                    <p><Home size={14} /> Flat: {visitor.flat_number}</p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(visitor.timestamp).toLocaleString()}
                    </p>
                  </div>

                  {editingVisitor === visitor.id ? (
                    <div className="edit-form">
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                        placeholder="Phone"
                      />
                      <input
                        type="text"
                        value={editFormData.flatNumber}
                        onChange={(e) => setEditFormData({...editFormData, flatNumber: e.target.value})}
                        placeholder="Flat"
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(visitor.id)}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingVisitor(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="visitor-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => startEditing(visitor)}>
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteVisitor(visitor.id)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* STATISTICS TAB */}
        {currentAdminTab === 'stats' && (
        <div className="tab-content">
          <div className="section-header" style={{ marginBottom: '20px' }}>
            <BarChart3 size={20} />
            <h2>Statistics & Analytics</h2>
          </div>

          {loadingStats ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>Loading statistics...</p>
          ) : stats ? (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Visitors</h3>
                <p className="stat-number">{stats.total_visitors}</p>
              </div>
              <div className="stat-card">
                <h3>Today's Visitors</h3>
                <p className="stat-number">{stats.today_visitors}</p>
              </div>
              <div className="stat-card">
                <h3>Email Success Rate</h3>
                <p className="stat-number">{Math.round(stats.email_success_rate)}%</p>
              </div>

              <div className="stat-card full-width">
                <h3>Top 5 Visited Flats</h3>
                <div className="top-flats">
                  {stats.top_flats && stats.top_flats.length > 0 ? (
                    stats.top_flats.map((item, idx) => (
                      <div key={idx} className="flat-bar">
                        <span>{item.flat}</span>
                        <div className="bar">
                          <div className="bar-fill" style={{ width: `${(item.visits / stats.top_flats[0].visits) * 100}%` }}>
                            {item.visits}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No data available</p>
                  )}
                </div>
              </div>

              <div className="stat-card full-width">
                <h3>Visits Over 7 Days</h3>
                <div className="daily-chart">
                  {stats.daily_visitors && stats.daily_visitors.length > 0 ? (
                    stats.daily_visitors.map((item, idx) => (
                      <div key={idx} className="day-bar">
                        <div className="bar-container">
                          <div className="bar" style={{ height: `${(item.count / Math.max(...stats.daily_visitors.map(d => d.count))) * 100}%` }}></div>
                        </div>
                        <span>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ))
                  ) : (
                    <p>No data available</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        )}

        {/* SEARCH TAB */}
        {currentAdminTab === 'search' && (
        <div className="tab-content">
          <div className="section-header" style={{ marginBottom: '20px' }}>
            <Search size={20} />
            <h2>Search Visitors</h2>
          </div>

          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name, phone, or flat number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                performSearch(e.target.value);
              }}
              className="search-input"
            />
          </div>

          {searchLoading ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>Searching...</p>
          ) : searchResults.length > 0 ? (
            <div className="search-results">
              <p style={{ marginBottom: '15px', color: '#666' }}>Found {searchResults.length} result(s)</p>
              {searchResults.map(visitor => (
                <div key={visitor.id} className="visitor-card" style={{ marginBottom: '10px' }}>
                  <div className="visitor-info">
                    <h3>{visitor.name}</h3>
                    <p><Phone size={14} /> {visitor.phone}</p>
                    <p><Home size={14} /> {visitor.flat_number}</p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(visitor.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteVisitor(visitor.id)}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery && !searchLoading ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No visitors found matching your search</p>
          ) : (
            <p style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Enter a search query to find visitors</p>
          )}
        </div>
        )}
        </div>
        )}
      </div>

      {/* Footer */}
      <div className="app-footer">
        <p>Secured by Apartment Security System</p>
      </div>
    </div>
  );
}

export default App;
