import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  GraduationCap,
  Calendar,
  ChevronRight,
  Plus,
  Eye,
  Download,
  Filter,
  Search,
  RefreshCw,
  Loader2,
  Award,
  TrendingUp,
  Wallet,
  BookOpen,
  Home,
  Users,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  School,
  BadgeCheck,
  AlertTriangle,
  History,
  Clock as ClockIcon,
  ArrowLeft,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  BarChart3,
  AlertOctagon
} from 'lucide-react';
import Header from './Header';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const { email } = useParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState('');
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch student applications
  const fetchApplications = async () => {
    try {
      setLoading(true);
      setAccessDenied('');
      
      if (!email) {
        setError('Email not provided');
        setLoading(false);
        return;
      }

      const url = `http://localhost:5000/api/student/applications?email=${encodeURIComponent(email)}`;
      console.log('📡 Fetching from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📡 Response:', data);

      if (data.success) {
        // Process applications to ensure arrears data is properly extracted
        const processedApps = data.data.map(app => {
          // Extract arrears from multiple possible locations
          const hasArrears = app.hasArrears || 
                            app.arrearsDetails?.historyOfArrears === 'yes' ||
                            app.eligibilityResult?.hasArrears || false;
          
          const numberOfArrears = app.numberOfArrears || 
                                 app.arrearsDetails?.numberOfArrears || 
                                 app.eligibilityResult?.numberOfArrears || 0;
          
          return {
            ...app,
            hasArrears: hasArrears,
            numberOfArrears: numberOfArrears,
            // Keep the original data for reference
            arrearsDetails: app.arrearsDetails || { historyOfArrears: 'no', numberOfArrears: 0 },
            eligibilityResult: app.eligibilityResult || {}
          };
        });
        
        setApplications(processedApps);
        setStats(data.stats);
        setUser(data.user);
        setTotalItems(processedApps.length);
        setCurrentPage(1);
      } else if (data.isAdmin) {
        navigate('/admin');
      } else if (response.status === 403) {
        setAccessDenied(data.message || 'Only current 2nd year students can access this dashboard.');
      } else {
        setError('Failed to fetch applications: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Error fetching applications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch application details
  const fetchApplicationDetails = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/student/application/${id}`);
      const data = await response.json();
      if (data.success) {
        // Process the selected app to ensure arrears data is properly extracted
        const appData = data.data;
        const hasArrears = appData.hasArrears || 
                          appData.arrearsDetails?.historyOfArrears === 'yes' ||
                          appData.eligibilityResult?.hasArrears || false;
        
        const numberOfArrears = appData.numberOfArrears || 
                               appData.arrearsDetails?.numberOfArrears || 
                               appData.eligibilityResult?.numberOfArrears || 0;
        
        setSelectedApp({
          ...appData,
          hasArrears: hasArrears,
          numberOfArrears: numberOfArrears
        });
        setShowModal(true);
      }
    } catch (err) {
      alert('Error fetching application details: ' + err.message);
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge configuration
  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        color: '#d97706',
        bg: '#fef4e6',
        icon: <Clock size={14} />,
        label: 'Pending Review'
      },
      approved: {
        color: '#16a34a',
        bg: '#e9f9ef',
        icon: <CheckCircle2 size={14} />,
        label: 'Approved'
      },
      rejected: {
        color: '#dc2626',
        bg: '#fdecec',
        icon: <XCircle size={14} />,
        label: 'Rejected'
      }
    };
    return configs[status] || configs.pending;
  };

  // Get eligibility badge configuration
  const getEligibilityConfig = (isEligible) => {
    return isEligible 
      ? { color: '#16a34a', bg: '#e9f9ef', icon: <BadgeCheck size={14} />, label: 'Eligible' }
      : { color: '#dc2626', bg: '#fdecec', icon: <AlertTriangle size={14} />, label: 'Not Eligible' };
  };

  // Get filtered applications
  const getFilteredApplications = () => {
    let filtered = applications;
    
    if (filter !== 'all') {
      filtered = filtered.filter(app => app.status === filter);
    }
    
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(app => 
        app.applicationId?.toLowerCase().includes(searchLower) ||
        app.personalDetails?.name?.toLowerCase().includes(searchLower) ||
        app.additionalPersonalDetails?.registerNo?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  };

  // Get current page items
  const getCurrentPageItems = () => {
    const filtered = getFilteredApplications();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages
  const getTotalPages = () => {
    const filtered = getFilteredApplications();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (page >= 1 && page <= getTotalPages()) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers
  const getPageNumbers = () => {
    const totalPages = getTotalPages();
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Go back to form with email
  const goBack = () => {
    if (email) {
      navigate(`/?email=${encodeURIComponent(email)}`);
    } else {
      navigate('/form');
    }
  };

  // Navigate to new application with email
  const handleNewApplication = () => {
    if (email) {
      navigate(`/form?email=${encodeURIComponent(email)}`);
    } else {
      navigate('/form');
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilter('all');
    setCurrentPage(1);
  };

  // Initial load
  useEffect(() => {
    if (email) {
      fetchApplications();
    }
  }, [email]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  if (loading) {
    return (
      <div className="student-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-error-container">
        <div className="error-content">
          <AlertCircle size={48} color="#dc2626" />
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={goBack}>
            <ArrowLeft size={16} />
            Back to Application
          </button>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="student-error-container">
        <div className="error-content">
          <AlertOctagon size={48} color="#dc2626" />
          <h2>Not Eligible for Scholarship Dashboard</h2>
          <p>{accessDenied}</p>
        </div>
      </div>
    );
  }

  const filteredApps = getFilteredApplications();
  const currentItems = getCurrentPageItems();
  const totalPages = getTotalPages();

  return (
    <div className="student-dashboard">
      {/* Header - Using the reusable Header component like Admin Dashboard */}
      <Header 
        title="NEC Alumni Association"
        subtitle="Student Dashboard - Scholarship Management"
      />

      {/* Add wrapper div with margin-top */}
      <div className="dashboard-content-wrapper" style={{ marginTop: '20px' }}>
        {/* User Profile Card */}
        {user && (
          <div className="student-profile-card">
            <div className="profile-avatar">
              <User size={32} />
            </div>
            <div className="profile-info">
              <h3>{user.personalDetails?.name || 'Student'}</h3>
              <div className="profile-details">
                <span><Mail size={14} /> {user.personalDetails?.email || email}</span>
                <span><School size={14} /> {user.additionalPersonalDetails?.department || 'N/A'}</span>
                <span><Calendar size={14} /> {user.additionalPersonalDetails?.year || 'N/A'}</span>
                <span><Users size={14} /> {user.additionalPersonalDetails?.registerNo || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon"><FileText size={20} /></div>
              <div className="stat-info">
                <h3>{stats.total}</h3>
                <p>Total Applications</p>
              </div>
              <div className="stat-trend">
                <TrendingUp size={16} />
                <span>All time</span>
              </div>
            </div>
            <div className="stat-card pending">
              <div className="stat-icon"><Clock size={20} /></div>
              <div className="stat-info">
                <h3>{stats.pending}</h3>
                <p>Pending Review</p>
              </div>
              <div className="stat-trend">
                <ClockIcon size={16} />
                <span>Awaiting response</span>
              </div>
            </div>
            <div className="stat-card approved">
              <div className="stat-icon"><CheckCircle2 size={20} /></div>
              <div className="stat-info">
                <h3>{stats.approved}</h3>
                <p>Approved</p>
              </div>
              <div className="stat-trend">
                <Award size={16} />
                <span>Scholarship granted</span>
              </div>
            </div>
            <div className="stat-card rejected">
              <div className="stat-icon"><XCircle size={20} /></div>
              <div className="stat-info">
                <h3>{stats.rejected}</h3>
                <p>Rejected</p>
              </div>
              <div className="stat-trend">
                <AlertCircle size={16} />
                <span>Not approved</span>
              </div>
            </div>
          </div>
        )}

        {/* New Application Button - Moved here for better visibility */}
        <div className="new-application-container">
          <button className="btn btn-primary new-app-btn" onClick={handleNewApplication}>
            <Plus size={18} />
            <span>New Application</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="filters-left">
            <div className="filter-group">
              <label>Status</label>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Applications</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Results</label>
              <span className="filter-results">{filteredApps.length} found</span>
            </div>
          </div>
          <div className="filters-right">
            <div className="search-group">
              <input
                type="text"
                placeholder="Search by ID, name or register..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-secondary" onClick={resetFilters}>
                <RefreshCw size={16} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="applications-container">
          {filteredApps.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>No Applications Found</h3>
              <p>You haven't submitted any scholarship applications yet.</p>
              <button className="btn btn-primary" onClick={handleNewApplication}>
                <Plus size={16} />
                Apply Now
              </button>
            </div>
          ) : (
            <>
              <div className="applications-grid">
                {currentItems.map((app, index) => {
                  const statusConfig = getStatusConfig(app.status);
                  const eligibilityConfig = getEligibilityConfig(app.isEligible);
                  
                  // Get arrears data from the processed app
                  const hasArrears = app.hasArrears || false;
                  const numberOfArrears = app.numberOfArrears || 0;
                  
                  return (
                    <div key={app.id || index} className="application-card">
                      <div className="card-header">
                        <div className="card-id">
                          <span className="id-label">Application ID</span>
                          <span className="id-value">{app.applicationId}</span>
                        </div>
                        <div className="card-status">
                          <span className="status-badge" style={{ backgroundColor: statusConfig.color }}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                      
                      <div className="card-body">
                        <div className="card-main-info">
                          <div className="student-info">
                            <h4>{app.personalDetails?.name || 'N/A'}</h4>
                            <div className="student-meta">
                              <span><School size={14} /> {app.additionalPersonalDetails?.department}</span>
                              <span><Calendar size={14} /> {app.additionalPersonalDetails?.year}</span>
                              <span><Users size={14} /> {app.additionalPersonalDetails?.registerNo}</span>
                            </div>
                          </div>
                          <div className="eligibility-badge" style={{ 
                            backgroundColor: eligibilityConfig.bg, 
                            color: eligibilityConfig.color 
                          }}>
                            {eligibilityConfig.icon}
                            {eligibilityConfig.label}
                          </div>
                        </div>
                        
                        <div className="card-details">
                          <div className="detail-item">
                            <span className="detail-label">Applied Date</span>
                            <span className="detail-value">{formatDate(app.appliedDate)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">CGPA</span>
                            <span className="detail-value highlight">{app.academicDetails?.cgpa || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Total Fees</span>
                            <span className="detail-value">
                              ₹{(app.feeDetails?.collegeFees || 0) + (app.feeDetails?.hostelFees || 0) + (app.feeDetails?.transportFees || 0)}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Parent Income</span>
                            <span className="detail-value">₹{app.eligibilityResult?.totalParentIncome?.toLocaleString() || 'N/A'}</span>
                          </div>
                        </div>
                        
                        {app.eligibilityResult?.reasons?.length > 0 && !app.isEligible && (
                          <div className="reasons-container">
                            <div className="reasons-header">
                              <AlertTriangle size={14} />
                              <span>Not Eligible Reasons</span>
                            </div>
                            <ul className="reasons-list">
                              {app.eligibilityResult.reasons.slice(0, 2).map((reason, i) => (
                                <li key={i}>{reason}</li>
                              ))}
                              {app.eligibilityResult.reasons.length > 2 && (
                                <li className="more-reasons">+{app.eligibilityResult.reasons.length - 2} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="card-footer">
                        <button 
                          className="btn-view-details"
                          onClick={() => fetchApplicationDetails(app.id)}
                        >
                          <Eye size={16} />
                          <span>View Details</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Showing {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredApps.length)} of {filteredApps.length} entries
                  </div>
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <div className="pagination-pages">
                      {currentPage > 3 && (
                        <>
                          <button
                            className="pagination-btn page-btn"
                            onClick={() => handlePageChange(1)}
                          >
                            1
                          </button>
                          {currentPage > 4 && <span className="pagination-ellipsis">…</span>}
                        </>
                      )}
                      {getPageNumbers().map(page => (
                        <button
                          key={page}
                          className={`pagination-btn page-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      ))}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && <span className="pagination-ellipsis">…</span>}
                          <button
                            className="pagination-btn page-btn"
                            onClick={() => handlePageChange(totalPages)}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal - Application Details */}
        {showModal && selectedApp && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Application Details</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <XCircle size={18} />
                </button>
              </div>

              <div className="modal-body">
                {/* Status */}
                <div className="modal-status-bar">
                  <span className="status-label">Current Status</span>
                  <span className="status-badge" style={{ 
                    backgroundColor: getStatusConfig(selectedApp.status).color 
                  }}>
                    {getStatusConfig(selectedApp.status).icon}
                    {getStatusConfig(selectedApp.status).label}
                  </span>
                </div>

                {/* Application Info */}
                <div className="detail-section">
                  <h3><FileText size={16} /> Application Information</h3>
                  <div className="detail-grid">
                    <div><strong>Application ID:</strong> {selectedApp.applicationId}</div>
                    <div><strong>Applied Date:</strong> {formatDate(selectedApp.appliedDate)}</div>
                    <div><strong>Eligible:</strong> 
                      <span className="eligibility-badge" style={{
                        backgroundColor: getEligibilityConfig(selectedApp.isEligible).bg,
                        color: getEligibilityConfig(selectedApp.isEligible).color
                      }}>
                        {getEligibilityConfig(selectedApp.isEligible).icon}
                        {getEligibilityConfig(selectedApp.isEligible).label}
                      </span>
                    </div>
                  </div>
                  {selectedApp.eligibilityResult?.reasons?.length > 0 && !selectedApp.isEligible && (
                    <div className="reasons">
                      <strong>Not Eligible Reasons:</strong>
                      <ul>
                        {selectedApp.eligibilityResult.reasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Personal Details */}
                <div className="detail-section">
                  <h3><User size={16} /> Personal Details</h3>
                  <div className="detail-grid">
                    <div><strong>Name:</strong> {selectedApp.personalDetails?.name}</div>
                    <div><strong>Email:</strong> {selectedApp.personalDetails?.email}</div>
                    <div><strong>Mobile:</strong> {selectedApp.personalDetails?.mobileNumber}</div>
                    <div><strong>Register No:</strong> {selectedApp.additionalDetails?.registerNo}</div>
                    <div><strong>Department:</strong> {selectedApp.additionalDetails?.department}</div>
                    <div><strong>Year:</strong> {selectedApp.additionalDetails?.year}</div>
                    <div><strong>Quota:</strong> {selectedApp.additionalDetails?.quota}</div>
                    <div><strong>Student Type:</strong> {selectedApp.additionalDetails?.studentType}</div>
                  </div>
                </div>

                {/* Academic Details */}
                <div className="detail-section">
                  <h3><GraduationCap size={16} /> Academic Details</h3>
                  <div className="detail-grid">
                    <div><strong>SSLC %:</strong> {selectedApp.academicDetails?.sslcPercentage}%</div>
                    <div><strong>HSLC %:</strong> {selectedApp.academicDetails?.hslcPercentage}%</div>
                    <div><strong>1st Sem GPA:</strong> {selectedApp.academicDetails?.firstSemGPA}</div>
                    <div><strong>2nd Sem GPA:</strong> {selectedApp.academicDetails?.secondSemGPA}</div>
                    <div><strong>CGPA:</strong> {selectedApp.academicDetails?.cgpa}</div>
                    <div><strong>First Graduate:</strong> {selectedApp.academicDetails?.firstGraduate}</div>
                    <div><strong>First Graduate Amount:</strong> ₹{selectedApp.academicDetails?.firstGraduateAmount?.toLocaleString()}</div>
                  </div>
                </div>

                {/* History of Arrears - New Section */}
                <div className="detail-section">
                  <h3><History size={16} /> History of Arrears</h3>
                  <div className="detail-grid">
                    <div>
                      <strong>History of Arrears:</strong> 
                      <span style={{ 
                        marginLeft: '8px',
                        fontWeight: 600,
                        color: selectedApp.hasArrears ? '#dc2626' : '#16a34a'
                      }}>
                        {selectedApp.hasArrears ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {selectedApp.hasArrears && (
                      <div>
                        <strong>Number of Arrears:</strong>
                        <span style={{ 
                          marginLeft: '8px',
                          fontWeight: 600,
                          color: '#dc2626'
                        }}>
                          {selectedApp.numberOfArrears || 0}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedApp.hasArrears && (
                    <div style={{ 
                      marginTop: '12px',
                      padding: '12px 16px', 
                      backgroundColor: '#fdecec', 
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <AlertOctagon size={18} />
                      <div>
                        <strong>Note:</strong> Students with arrears are not eligible for this scholarship.
                        {selectedApp.numberOfArrears > 0 && (
                          <span style={{ display: 'block', marginTop: '4px' }}>
                            You have {selectedApp.numberOfArrears} arrears subject{selectedApp.numberOfArrears > 1 ? 's' : ''}.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!selectedApp.hasArrears && (
                    <div style={{ 
                      marginTop: '12px',
                      padding: '12px 16px', 
                      backgroundColor: '#e9f9ef', 
                      borderRadius: '8px',
                      border: '1px solid #86efac',
                      color: '#166534',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <CheckCircle2 size={18} />
                      <div>
                        <strong>Good Standing:</strong> You have no history of arrears.
                      </div>
                    </div>
                  )}
                </div>

                {/* Fee Details */}
                <div className="detail-section">
                  <h3><Wallet size={16} /> Fee Details</h3>
                  <div className="detail-grid">
                    <div><strong>College Fees:</strong> ₹{selectedApp.feeDetails?.collegeFees?.toLocaleString()}</div>
                    <div><strong>Hostel Fees:</strong> ₹{selectedApp.feeDetails?.hostelFees?.toLocaleString()}</div>
                    <div><strong>Transport Fees:</strong> ₹{selectedApp.feeDetails?.transportFees?.toLocaleString()}</div>
                    <div><strong>Total Fees:</strong> 
                      <strong style={{ color: '#4f46e5' }}>
                        ₹{(selectedApp.feeDetails?.collegeFees || 0) + (selectedApp.feeDetails?.hostelFees || 0) + (selectedApp.feeDetails?.transportFees || 0)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Family Members */}
                {selectedApp.familyMembers?.length > 0 && (
                  <div className="detail-section">
                    <h3><Users size={16} /> Family Members</h3>
                    <table className="family-table">
                      <thead>
                        <tr>
                          <th>Relation</th>
                          <th>Name</th>
                          <th>Qualification</th>
                          <th>Status</th>
                          <th>Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedApp.familyMembers.map((member, i) => (
                          <tr key={i}>
                            <td>{member.relation}</td>
                            <td>{member.name}</td>
                            <td>{member.qualification}</td>
                            <td>{member.status}</td>
                            <td>{member.workingAmount ? `₹${member.workingAmount.toLocaleString()}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Scholarship Details */}
                {selectedApp.scholarshipDetails?.length > 0 && (
                  <div className="detail-section">
                    <h3><GraduationCap size={16} /> Scholarship Details</h3>
                    <table className="scholarship-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedApp.scholarshipDetails.map((sch, i) => (
                          <tr key={i}>
                            <td>{sch.name === 'anyother' ? sch.specificName || 'Other' : sch.name}</td>
                            <td>₹{sch.amount?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Additional Info */}
                <div className="detail-section">
                  <h3><BookOpen size={16} /> Additional Information</h3>
                  <div className="detail-grid">
                    <div><strong>Area of Interest:</strong> {selectedApp.additionalInfo?.areaOfInterest}</div>
                    <div><strong>Dream Company:</strong> {selectedApp.additionalInfo?.dreamCompany}</div>
                    <div><strong>Message:</strong> {selectedApp.additionalInfo?.message}</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="close-modal-btn" onClick={() => setShowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
