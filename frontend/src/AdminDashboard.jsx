import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import {
  LayoutDashboard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Target,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  Loader2,
  Eye,
  X,
  User,
  UserRound,
  GraduationCap,
  Users,
  Landmark,
  Lightbulb,
  Wallet,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Calendar,
  Filter,
  History,
  AlertOctagon
} from 'lucide-react';
import Header from './Header';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [allApplications, setAllApplications] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [availableYears, setAvailableYears] = useState([]);
  const ITEMS_PER_PAGE = 10;

  // Fetch all applications once
  const fetchAllApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/admin/applications/all', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const appsWithYear = data.data.map(app => ({
          ...app,
          appliedYear: app.appliedDate ? new Date(app.appliedDate).getFullYear() : null
        }));
        
        setAllApplications(appsWithYear);
        
        const years = appsWithYear
          .map(app => app.appliedYear)
          .filter(y => y !== null);
        const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
        setAvailableYears(uniqueYears);
        
        // Reset to page 1 when new data is loaded
        setCurrentPage(1);
        applyFilters(appsWithYear, filter, yearFilter, searchTerm, 1);
      } else {
        setError('Failed to fetch applications');
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Error fetching applications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to applications
  const applyFilters = (apps, status, year, search, page = currentPage) => {
    let filtered = [...apps];
    
    if (status && status !== 'all') {
      filtered = filtered.filter(app => app.status === status);
    }
    
    if (year && year !== 'all') {
      const yearNum = parseInt(year);
      filtered = filtered.filter(app => app.appliedYear === yearNum);
    }
    
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter(app => {
        const name = (app.personalDetails?.name || '').toLowerCase();
        const email = (app.personalDetails?.email || '').toLowerCase();
        const registerNo = (app.additionalPersonalDetails?.registerNo || '').toLowerCase();
        return name.includes(searchLower) || 
               email.includes(searchLower) || 
               registerNo.includes(searchLower);
      });
    }
    
    updateStats(filtered);
    setTotalItems(filtered.length);
    const totalPagesCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    setTotalPages(totalPagesCount);
    
    // Ensure current page is within bounds
    const validPage = Math.min(Math.max(1, page), totalPagesCount || 1);
    if (validPage !== page) {
      setCurrentPage(validPage);
    }
    
    const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginatedItems = filtered.slice(startIndex, endIndex);
    
    setApplications(paginatedItems);
  };

  // Update stats based on filtered data
  const updateStats = (filteredApps) => {
    const total = filteredApps.length;
    const pending = filteredApps.filter(app => app.status === 'pending').length;
    const approved = filteredApps.filter(app => app.status === 'approved').length;
    const rejected = filteredApps.filter(app => app.status === 'rejected').length;
    const eligible = filteredApps.filter(app => app.isEligible === true).length;
    const notEligible = filteredApps.filter(app => app.isEligible === false).length;
    
    setStats({
      total,
      pending,
      approved,
      rejected,
      eligible,
      notEligible
    });
  };

  // Fetch application details
  const fetchApplicationDetails = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/application/${id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedApp(data.data);
        setShowModal(true);
      }
    } catch (err) {
      alert('Error fetching application details: ' + err.message);
    }
  };

  // Update application status
  const updateStatus = async (id, newStatus) => {
    if (!window.confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/scholarship/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (data.success) {
        alert('Status updated successfully!');
        fetchAllApplications();
        setShowModal(false);
      } else {
        alert('Failed to update status: ' + data.message);
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  // Calculate sibling income from family members
  const calculateSiblingIncome = (familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) return 0;
    let totalIncome = 0;
    familyMembers.forEach(member => {
      if (member.status === "working" && member.workingAmount) {
        totalIncome += parseFloat(member.workingAmount) || 0;
      }
    });
    return totalIncome;
  };

  // Check eligibility for each application
  const checkApplicationEligibility = (app) => {
    const reasons = [];
    let isEligible = true;

    const additionalDetails = app.additionalPersonalDetails || {};
    const fatherDetails = app.fatherDetails || {};
    const motherDetails = app.motherDetails || {};
    const academicDetails = app.academicDetails || {};
    const familyMembers = app.familyMembers || [];

    if (app.eligibility?.aicteFeeWaiver === "yes") {
      isEligible = false;
      reasons.push("AICTE Fee Waiver students are not eligible");
    }

    if (app.eligibility?.govtScholarship === "yes") {
      isEligible = false;
      reasons.push("7.5% Government Scholarship students are not eligible");
    }

    if (additionalDetails.quota === "management") {
      isEligible = false;
      reasons.push("Management quota students are not eligible");
    }

    const fatherIncome = parseFloat(fatherDetails.income) || 0;
    const motherIncome = parseFloat(motherDetails.income) || 0;
    const totalParentIncome = fatherIncome + motherIncome;
    if (totalParentIncome > 150000) {
      isEligible = false;
      reasons.push(`Parent income (₹${totalParentIncome.toLocaleString()}) exceeds ₹1,50,000 limit`);
    }

    const siblingIncome = calculateSiblingIncome(familyMembers);
    if (siblingIncome > 300000) {
      isEligible = false;
      reasons.push(`Sibling income (₹${siblingIncome.toLocaleString()}) exceeds ₹3,00,000 limit`);
    }

    const firstSem = parseFloat(academicDetails.firstSemGPA) || 0;
    const secondSem = parseFloat(academicDetails.secondSemGPA) || 0;
    const cgpa = (firstSem + secondSem) / 2;
    if (cgpa < 8) {
      isEligible = false;
      reasons.push(`CGPA (${cgpa.toFixed(2)}) is below 8.0`);
    }

    return {
      isEligible,
      reasons,
      details: {
        totalParentIncome,
        siblingIncome,
        cgpa
      }
    };
  };

  // Format family members for display
  const formatFamilyMembers = (familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) {
      return "N/A";
    }

    const formatted = familyMembers.map(member => {
      const relation = member.relation || 'N/A';
      const name = member.name || 'N/A';
      const qualification = member.qualification || 'N/A';
      const status = member.status || 'N/A';
      const workingAmount = member.workingAmount || 0;

      return `${relation}: ${name} (${qualification}, ${status}${status === 'working' ? `, ₹${workingAmount}` : ''})`;
    }).join("; ");

    return formatted;
  };

  // Format scholarships for display
  const formatScholarships = (scholarshipDetails) => {
    if (!scholarshipDetails || scholarshipDetails.length === 0) {
      return "No Scholarship Availed";
    }

    const validScholarships = scholarshipDetails.filter(s => s && (s.name || s.amount || s.specificName));

    if (validScholarships.length === 0) {
      return "No Scholarship Availed";
    }

    const formatted = validScholarships.map(s => {
      let name = s.name || 'Unknown';
      if (name === "anyother") {
        name = s.specificName || 'Other';
      }
      const amount = s.amount || 0;
      return `${name}: ₹${amount}`;
    }).join("; ");

    return formatted;
  };

  // Calculate total scholarship amount
  const calculateTotalScholarshipAmount = (scholarshipDetails) => {
    if (!scholarshipDetails || scholarshipDetails.length === 0) {
      return 0;
    }

    return scholarshipDetails.reduce((total, s) => {
      const amount = parseFloat(s.amount || 0);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  // Download all applications as a real .xlsx workbook with highlighting, using exceljs
  const downloadExcel = async () => {
    try {
      setDownloading(true);

      let appsToExport = allApplications;

      if (yearFilter !== 'all') {
        const yearNum = parseInt(yearFilter);
        appsToExport = appsToExport.filter(app => app.appliedYear === yearNum);
      }

      if (filter !== 'all') {
        appsToExport = appsToExport.filter(app => app.status === filter);
      }

      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase().trim();
        appsToExport = appsToExport.filter(app => {
          const name = (app.personalDetails?.name || '').toLowerCase();
          const email = (app.personalDetails?.email || '').toLowerCase();
          const registerNo = (app.additionalPersonalDetails?.registerNo || '').toLowerCase();
          return name.includes(searchLower) || 
                 email.includes(searchLower) || 
                 registerNo.includes(searchLower);
        });
      }

      if (appsToExport.length === 0) {
        alert('No applications available to download with the current filters');
        return;
      }

      const headers = [
        "S.No", "Application ID", "Name", "Email", "Mobile", "AICTE Fee Waiver",
        "7.5% Government Scholarship", "Register No", "Quota", "College Email",
        "Address", "Native", "Academic Year", "Department", "Date of Birth",
        "Student Type", "Hostel Fees", "Transport Fees", "College Fees",
        "Father Name", "Father Occupation", "Father Income", "Father Mobile",
        "Mother Name", "Mother Occupation", "Mother Income", "Mother Mobile",
        "Total Parent Income", "Siblings", "Sibling Income", "SSLC %",
        "HSLC %", "First Sem GPA", "Second Sem GPA", "CGPA",
        "First Graduate", "First Graduate Amount", "Scholarships",
        "Total Scholarship Amount", "History of Arrears", "Number of Arrears",
        "Bank Loan Availed", "Bank Name", "Bank Branch", "Loan Amount", 
        "Area of Interest", "Dream Company", "Scholarship Reason", 
        "Shortlisted", "Status", "Applied Date"
      ];

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scholarship Applications');

      // Header row
      worksheet.columns = headers.map(h => ({ header: h, key: h, width: 20 }));

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
      });

      const fillYellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      const fillGreen = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      const fillRed = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      const fillAmber = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
      const fillOrange = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB347' } };
      const fontGreen = { bold: true, color: { argb: 'FF006100' } };
      const fontRed = { bold: true, color: { argb: 'FF9C0006' } };
      const fontAmber = { bold: true, color: { argb: 'FF9C5700' } };
      const fontOrange = { bold: true, color: { argb: 'FF8B4513' } };

      // Column indices (1-based) matching the headers array above
      const COL = {
        AICTE: 6,
        GOVT: 7,
        QUOTA: 9,
        FATHER_INCOME: 22,
        MOTHER_INCOME: 26,
        TOTAL_PARENT_INCOME: 28,
        SIBLING_INCOME: 30,
        CGPA: 35,
        HISTORY_OF_ARREARS: 40,
        NUMBER_OF_ARREARS: 41,
        SHORTLISTED: 49,
        STATUS: 50
      };

      appsToExport.forEach((app, index) => {
        const personalDetails = app.personalDetails || {};
        const additionalDetails = app.additionalPersonalDetails || {};
        const feeDetails = app.feeDetails || {};
        const fatherDetails = app.fatherDetails || {};
        const motherDetails = app.motherDetails || {};
        const academicDetails = app.academicDetails || {};
        const bankLoanDetails = app.bankLoanDetails || {};
        const additionalInfo = app.additionalInfo || {};
        const eligibility = app.eligibility || {};
        const familyMembers = app.familyMembers || [];
        const scholarshipDetails = app.scholarshipDetails || [];

        const firstSem = parseFloat(academicDetails.firstSemGPA) || 0;
        const secondSem = parseFloat(academicDetails.secondSemGPA) || 0;
        const cgpa = (firstSem + secondSem) / 2;

        const totalParentIncome = (parseFloat(fatherDetails.income) || 0) + (parseFloat(motherDetails.income) || 0);

        let siblingIncome = 0;
        if (familyMembers && familyMembers.length > 0) {
          familyMembers.forEach(member => {
            if (member.status === 'working' && member.workingAmount) {
              siblingIncome += parseFloat(member.workingAmount) || 0;
            }
          });
        }

        let isEligible = app.eligibilityResult?.isEligible || false;
        let reasons = app.eligibilityResult?.reasons || [];

        if (app.eligibilityResult === undefined || Object.keys(app.eligibilityResult).length === 0) {
          const eligibilityCheck = checkApplicationEligibility(app);
          isEligible = eligibilityCheck.isEligible;
          reasons = eligibilityCheck.reasons;
        }

        // Get arrears data
        const hasArrears = app.hasArrears || false;
        const numberOfArrears = app.numberOfArrears || 0;

        const familyMembersDisplay = formatFamilyMembers(familyMembers);
        const scholarshipsDisplay = formatScholarships(scholarshipDetails);
        const totalScholarshipAmount = calculateTotalScholarshipAmount(scholarshipDetails);

        // Use the application ID from the database directly
        const appId = app.applicationId || "N/A";

        const rowValues = [
          index + 1,
          appId,
          personalDetails.name || "N/A",
          personalDetails.email || "N/A",
          personalDetails.mobileNumber || "N/A",
          eligibility.aicteFeeWaiver === "yes" ? "Yes" : "No",
          eligibility.govtScholarship === "yes" ? "Yes" : "No",
          additionalDetails.registerNo || "N/A",
          additionalDetails.quota === "management" ? "Management" : "Government",
          additionalDetails.collegeEmail || "N/A",
          additionalDetails.addressCommunication || "N/A",
          additionalDetails.native || "N/A",
          additionalDetails.year || "N/A",
          additionalDetails.department || "N/A",
          additionalDetails.dateOfBirth ? new Date(additionalDetails.dateOfBirth).toLocaleDateString() : "N/A",
          additionalDetails.studentType === "hosteller" ? "Hosteller" : additionalDetails.studentType === "dayscholar" ? "Dayscholar" : "N/A",
          feeDetails.hostelFees || "N/A",
          feeDetails.transportFees || "N/A",
          feeDetails.collegeFees || "N/A",
          fatherDetails.name || "N/A",
          fatherDetails.occupation || "N/A",
          fatherDetails.income || "N/A",
          fatherDetails.mobile || "N/A",
          motherDetails.name || "N/A",
          motherDetails.occupation || "N/A",
          motherDetails.income || "N/A",
          motherDetails.mobile || "N/A",
          totalParentIncome || "N/A",
          familyMembersDisplay,
          siblingIncome || "N/A",
          academicDetails.sslcPercentage || "N/A",
          academicDetails.hslcPercentage || "N/A",
          academicDetails.firstSemGPA || "N/A",
          academicDetails.secondSemGPA || "N/A",
          cgpa ? cgpa.toFixed(2) : "N/A",
          academicDetails.firstGraduate === "yes" ? "Yes" : academicDetails.firstGraduate === "no" ? "No" : "N/A",
          academicDetails.firstGraduateAmount || "N/A",
          scholarshipsDisplay,
          totalScholarshipAmount,
          hasArrears ? "Yes" : "No",
          hasArrears ? numberOfArrears : 0,
          bankLoanDetails.bankLoanAvailed === "yes" ? "Yes" : bankLoanDetails.bankLoanAvailed === "no" ? "No" : "N/A",
          bankLoanDetails.bankName || "N/A",
          bankLoanDetails.bankBranch || "N/A",
          bankLoanDetails.loanAmount || "N/A",
          additionalInfo.areaOfInterest || "N/A",
          additionalInfo.dreamCompany || "N/A",
          additionalInfo.message || "N/A",
          isEligible ? "Yes" : "No",
          app.status || "pending",
          app.appliedDate ? new Date(app.appliedDate).toLocaleString() : "N/A"
        ];

        const row = worksheet.addRow(rowValues);

        // Determine which columns to highlight yellow based on ineligibility reasons
        let highlightCols = [];
        if (!isEligible && reasons && reasons.length > 0) {
          reasons.forEach(reason => {
            const reasonLower = reason.toLowerCase();
            if (reasonLower.includes('aicte fee waiver')) {
              highlightCols.push(COL.AICTE);
            }
            if (reasonLower.includes('government scholarship') || reasonLower.includes('7.5%')) {
              highlightCols.push(COL.GOVT);
            }
            if (reasonLower.includes('management quota')) {
              highlightCols.push(COL.QUOTA);
            }
            if (reasonLower.includes('parent income') || reasonLower.includes('exceeds ₹1,50,000')) {
              highlightCols.push(COL.FATHER_INCOME, COL.MOTHER_INCOME, COL.TOTAL_PARENT_INCOME);
            }
            if (reasonLower.includes('sibling income') || reasonLower.includes('exceeds ₹3,00,000')) {
              highlightCols.push(COL.SIBLING_INCOME);
            }
            if (reasonLower.includes('cgpa') || reasonLower.includes('below 8.0')) {
              highlightCols.push(COL.CGPA);
            }
            if (reasonLower.includes('arrears')) {
              highlightCols.push(COL.HISTORY_OF_ARREARS, COL.NUMBER_OF_ARREARS);
            }
          });
          highlightCols = [...new Set(highlightCols)];
        }

        // Highlight arrears columns if student has arrears
        if (hasArrears) {
          highlightCols.push(COL.HISTORY_OF_ARREARS, COL.NUMBER_OF_ARREARS);
        }

        highlightCols.forEach(colIndex => {
          row.getCell(colIndex).fill = fillYellow;
        });

        // Shortlisted (eligibility) column color
        const shortlistedCell = row.getCell(COL.SHORTLISTED);
        if (isEligible) {
          shortlistedCell.fill = fillGreen;
          shortlistedCell.font = fontGreen;
        } else {
          shortlistedCell.fill = fillRed;
          shortlistedCell.font = fontRed;
        }

        // Status column color
        const statusCell = row.getCell(COL.STATUS);
        const statusVal = String(app.status || 'pending').toLowerCase();
        if (statusVal === 'approved') {
          statusCell.fill = fillGreen;
          statusCell.font = fontGreen;
        } else if (statusVal === 'rejected') {
          statusCell.fill = fillRed;
          statusCell.font = fontRed;
        } else {
          statusCell.fill = fillAmber;
          statusCell.font = fontAmber;
        }

        // Highlight Arrears columns with orange if student has arrears
        if (hasArrears) {
          const arrearsCol = row.getCell(COL.HISTORY_OF_ARREARS);
          arrearsCol.fill = fillOrange;
          arrearsCol.font = fontOrange;
          
          const numArrearsCol = row.getCell(COL.NUMBER_OF_ARREARS);
          numArrearsCol.fill = fillOrange;
          numArrearsCol.font = fontOrange;
        }
      });

      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const link = document.createElement('a');
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const fileName = yearFilter !== 'all' 
        ? `Scholarship_Applications_${yearFilter}_${dateStr}.xlsx`
        : `Scholarship_Applications_${dateStr}.xlsx`;

      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading Excel file: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    applyFilters(allApplications, newFilter, yearFilter, searchTerm, 1);
  };

  const handleYearChange = (newYear) => {
    setYearFilter(newYear);
    setCurrentPage(1);
    applyFilters(allApplications, filter, newYear, searchTerm, 1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    applyFilters(allApplications, filter, yearFilter, searchTerm, 1);
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilter('all');
    setYearFilter('all');
    setCurrentPage(1);
    applyFilters(allApplications, 'all', 'all', '', 1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      applyFilters(allApplications, filter, yearFilter, searchTerm, newPage);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAllApplications();
  }, []);

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

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#16a34a';
      case 'rejected': return '#dc2626';
      default: return '#d97706';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle2 size={14} />;
      case 'rejected': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
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

  if (loading && allApplications.length === 0) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <Header 
        title="NEC Alumni Association"
        subtitle="Admin Dashboard - Scholarship Management"
        showLogout={false}
      />

      <div className="dashboard-content-wrapper" style={{ marginTop: '20px' }}>
        
        <div className="download-section">
          <button 
            className="btn btn-download" 
            onClick={downloadExcel}
            disabled={downloading}
          >
            {downloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
            <span>{downloading ? 'Downloading...' : 'Export Excel'}</span>
          </button>
        </div>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon"><FileText size={20} /></div>
              <div className="stat-info">
                <h3>{stats.total}</h3>
                <p>Total Applications</p>
              </div>
            </div>
            <div className="stat-card pending">
              <div className="stat-icon"><Clock size={20} /></div>
              <div className="stat-info">
                <h3>{stats.pending}</h3>
                <p>Pending Review</p>
              </div>
            </div>
            <div className="stat-card approved">
              <div className="stat-icon"><CheckCircle2 size={20} /></div>
              <div className="stat-info">
                <h3>{stats.approved}</h3>
                <p>Approved</p>
              </div>
            </div>
            <div className="stat-card rejected">
              <div className="stat-icon"><XCircle size={20} /></div>
              <div className="stat-info">
                <h3>{stats.rejected}</h3>
                <p>Rejected</p>
              </div>
            </div>
            <div className="stat-card eligible">
              <div className="stat-icon"><Target size={20} /></div>
              <div className="stat-info">
                <h3>{stats.eligible}</h3>
                <p>Eligible</p>
              </div>
            </div>
            <div className="stat-card not-eligible">
              <div className="stat-icon"><AlertTriangle size={20} /></div>
              <div className="stat-info">
                <h3>{stats.notEligible}</h3>
                <p>Not Eligible</p>
              </div>
            </div>
          </div>
        )}

        <div className="filters-bar">
          <div className="filters-left">
            <div className="filter-group">
              <label>Status Filter</label>
              <select value={filter} onChange={(e) => handleFilterChange(e.target.value)}>
                <option value="all">All Applications</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Application Year</label>
              <select value={yearFilter} onChange={(e) => handleYearChange(e.target.value)}>
                <option value="all">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Results</label>
              <span className="filter-results">{totalItems} found</span>
            </div>
          </div>
          <div className="filters-right">
            <div className="search-group">
              <input
                type="text"
                placeholder="Search by name, email or register..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn btn-primary" onClick={handleSearch}>
                <Search size={16} />
                <span>Search</span>
              </button>
              <button className="btn btn-secondary" onClick={handleReset}>
                <RefreshCw size={16} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="table-container">
          <div className="table-header">
            <div className="table-title">
              <BarChart3 size={18} />
              <span>Applications List</span>
              {yearFilter !== 'all' && (
                <span className="filter-badge">
                  <Calendar size={14} />
                  {yearFilter}
                </span>
              )}
              {filter !== 'all' && (
                <span className="filter-badge">
                  <Filter size={14} />
                  {filter}
                </span>
              )}
            </div>
            <span className="table-count">
              {applications.length > 0 ? `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1} to ${Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of ${totalItems}` : '0 of 0'}
            </span>
          </div>
          <table className="applications-table">
            <thead>
              <tr>
                <th>#</th>
                <th>App ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Applied Year</th>
                <th>Status</th>
                <th>Eligible</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan="10" className="no-data">
                    <div className="no-data-content">
                      <FileText size={32} />
                      <p>No applications found</p>
                      <span>Try adjusting your filters or search terms</span>
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app, index) => {
                  // Use the application ID from the database directly
                  const appId = app.applicationId || "N/A";
                  
                  return (
                    <tr key={app.id || app._id || index}>
                      <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                      <td className="app-id">{appId}</td>
                      <td className="name">{app.name}</td>
                      <td className="email">{app.email}</td>
                      <td>{app.department}</td>
                      <td>
                        <span className="year-badge">
                          {app.appliedYear || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: getStatusColor(app.status) }}>
                          {getStatusIcon(app.status)}
                          {app.status}
                        </span>
                      </td>
                      <td>
                        {app.isEligible ? (
                          <span className="eligibility-badge eligible">
                            <CheckCircle2 size={14} /> Yes
                          </span>
                        ) : (
                          <span className="eligibility-badge not-eligible">
                            <XCircle size={14} /> No
                          </span>
                        )}
                      </td>
                      <td>{formatDate(app.appliedDate)}</td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() => fetchApplicationDetails(app.id || app._id)}
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {applications.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} entries
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
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {showModal && selectedApp && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Application Details</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="status-update">
                  <label>Update Status</label>
                  <select
                    value={selectedApp.status}
                    onChange={(e) => updateStatus(selectedApp.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="detail-section">
                  <h3><FileText size={16} /> Application Info</h3>
                  <div className="detail-grid">
                    <div>
                      <strong>Application ID:</strong> 
                      {selectedApp.applicationId || 'N/A'}
                    </div>
                    <div><strong>Applied Date:</strong> {formatDate(selectedApp.appliedDate)}</div>
                    <div><strong>Applied Year:</strong> {selectedApp.appliedYear || 'N/A'}</div>
                    <div><strong>Status:</strong> <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedApp.status) }}>{selectedApp.status}</span></div>
                    <div><strong>Eligible:</strong> {selectedApp.isEligible ? (
                      <span className="eligibility-badge eligible"><CheckCircle2 size={14} /> Yes</span>
                    ) : (
                      <span className="eligibility-badge not-eligible"><XCircle size={14} /> No</span>
                    )}</div>
                  </div>
                  {selectedApp.eligibilityResult?.reasons?.length > 0 && (
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
                    <div><strong>Date of Birth:</strong> {selectedApp.additionalDetails?.dateOfBirth ? new Date(selectedApp.additionalDetails.dateOfBirth).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Native:</strong> {selectedApp.additionalDetails?.native}</div>
                    <div><strong>Address:</strong> {selectedApp.additionalDetails?.address}</div>
                    <div><strong>College Email:</strong> {selectedApp.additionalDetails?.collegeEmail}</div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3><UserRound size={16} /> Father's Details</h3>
                  <div className="detail-grid">
                    <div><strong>Name:</strong> {selectedApp.fatherDetails?.name}</div>
                    <div><strong>Occupation:</strong> {selectedApp.fatherDetails?.occupation}</div>
                    <div><strong>Income:</strong> ₹{selectedApp.fatherDetails?.income?.toLocaleString()}</div>
                    <div><strong>Mobile:</strong> {selectedApp.fatherDetails?.mobile}</div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3><UserRound size={16} /> Mother's Details</h3>
                  <div className="detail-grid">
                    <div><strong>Name:</strong> {selectedApp.motherDetails?.name}</div>
                    <div><strong>Occupation:</strong> {selectedApp.motherDetails?.occupation}</div>
                    <div><strong>Income:</strong> ₹{selectedApp.motherDetails?.income?.toLocaleString()}</div>
                    <div><strong>Mobile:</strong> {selectedApp.motherDetails?.mobile}</div>
                  </div>
                </div>

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
                            This student has {selectedApp.numberOfArrears} arrears subject{selectedApp.numberOfArrears > 1 ? 's' : ''}.
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
                        <strong>Good Standing:</strong> This student has no history of arrears.
                      </div>
                    </div>
                  )}
                </div>

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

                <div className="detail-section">
                  <h3><Landmark size={16} /> Bank Loan Details</h3>
                  <div className="detail-grid">
                    <div><strong>Bank Loan Availed:</strong> {selectedApp.bankLoanDetails?.bankLoanAvailed}</div>
                    <div><strong>Bank Name:</strong> {selectedApp.bankLoanDetails?.bankName}</div>
                    <div><strong>Bank Branch:</strong> {selectedApp.bankLoanDetails?.bankBranch}</div>
                    <div><strong>Loan Amount:</strong> ₹{selectedApp.bankLoanDetails?.loanAmount?.toLocaleString()}</div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3><Lightbulb size={16} /> Additional Information</h3>
                  <div className="detail-grid">
                    <div><strong>Area of Interest:</strong> {selectedApp.additionalInfo?.areaOfInterest}</div>
                    <div><strong>Dream Company:</strong> {selectedApp.additionalInfo?.dreamCompany}</div>
                    <div><strong>Message:</strong> {selectedApp.additionalInfo?.message}</div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3><Wallet size={16} /> Fee Details</h3>
                  <div className="detail-grid">
                    <div><strong>Hostel Fees:</strong> ₹{selectedApp.feeDetails?.hostelFees?.toLocaleString()}</div>
                    <div><strong>Transport Fees:</strong> ₹{selectedApp.feeDetails?.transportFees?.toLocaleString()}</div>
                    <div><strong>College Fees:</strong> ₹{selectedApp.feeDetails?.collegeFees?.toLocaleString()}</div>
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