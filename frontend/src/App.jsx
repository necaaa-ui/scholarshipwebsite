import React, { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import "./App.css";

// Import Admin Dashboard
import AdminDashboard from "./AdminDashboard";
import StudentDashboard from './StudentDashboard';

// Entry point used by the alumni portal. The `email` query parameter is Base64 encoded
// by the portal, then checked against our existing user endpoint before navigation.
function ScholarshipSsoEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Signing you in...');

  useEffect(() => {
    let isActive = true;

    const signInFromAlumniPortal = async () => {
      const encodedEmail = new URLSearchParams(location.search).get('email');

      if (!encodedEmail) {
        if (isActive) setMessage('Login link is missing the email address. Please return to the alumni portal.');
        return;
      }

      let email;
      try {
        // Support standard Base64 and URL-safe Base64 values.
        let base64 = encodedEmail.trim().replace(/-/g, '+').replace(/_/g, '/');
        base64 += '='.repeat((4 - (base64.length % 4)) % 4);
        // Some portal implementations encode the email with encodeURIComponent
        // before applying Base64, so accept both `name@nec.edu.in` and `name%40nec.edu.in`.
        email = decodeURIComponent(atob(base64).trim());

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Invalid email');
        }
      } catch {
        if (isActive) setMessage('This login link is invalid. Please open the scholarship portal from the alumni website again.');
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/user?email=${encodeURIComponent(email)}`);
        const data = await response.json();

        if (response.status === 404) {
          throw new Error('You are not eligible for this scholarship dashboard. Only current 2nd year students can access it.');
        }

        if (!response.ok || !data.success || !data.user) {
          throw new Error(data.message || 'User not found');
        }

        if (!isActive) return;

        if (data.user.isAdmin) {
          navigate('/admin', { replace: true });
        } else {
          navigate(`/student/${encodeURIComponent(data.user.email || email)}`, { replace: true });
        }
      } catch (error) {
        if (isActive) setMessage(error.message || 'Unable to sign you in. Please try again from the alumni portal.');
      }
    };

    signInFromAlumniPortal();
    return () => { isActive = false; };
  }, [location.search, navigate]);

  return (
    <div className="app-container" style={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}>
      <p>{message}</p>
    </div>
  );
}

// Main Form Component
function AICTEFeeWaiverForm() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get email from URL query params
  const getEmailFromURL = () => {
    const params = new URLSearchParams(location.search);
    return params.get('email') || '';
  };

  const [formData, setFormData] = useState({
    // Personal Details - Auto-fetch fields (First part)
    name: "",
    email: getEmailFromURL(), // Auto-fill email from URL
    mobileNumber: "",
    
    // Eligibility Questions
    aicteFeeWaiver: "",
    govtScholarship: "",
    
    // Personal Details - Remaining fields
    registerNo: "",
    quota: "",
    collegeEmail: "",
    addressCommunication: "",
    native: "",
    year: "",
    department: "",
    dateOfBirth: "",
    studentType: "",
    
    // Fees
    hostelFees: "",
    transportFees: "",
    collegeFees: "",
    
    // Father Details
    fatherName: "",
    fatherOccupation: "",
    fatherIncome: "",
    fatherMobile: "",
    
    // Mother Details
    motherName: "",
    motherOccupation: "",
    motherIncome: "",
    motherMobile: "",
    
    // Family Members
    familyMembers: [{ name: "", relation: "", qualification: "", status: "", workingAmount: "" }],
    
    // Academic Details
    sslcPercentage: "",
    hslcPercentage: "",
    firstSemGPA: "",
    secondSemGPA: "",
    firstGraduate: "",
    firstGraduateAmount: "",
    
    // History of Arrears
    historyOfArrears: "",
    numberOfArrears: "",
    
    // Scholarship Details
    scholarships: [{ name: "", amount: "", specificName: "" }],
    
    // Bank Loan
    bankLoanAvailed: "",
    bankName: "",
    bankBranch: "",
    loanAmount: "",
    
    // Additional Info
    areaOfInterest: "",
    dreamCompany: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quotaError, setQuotaError] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState("");
  const [eligibilityType, setEligibilityType] = useState("");
  
  // States for auto-fetch
  const [isFetching, setIsFetching] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [fetchedUser, setFetchedUser] = useState(null);
  const [eligibilityCheck, setEligibilityCheck] = useState({
    isEligible: false,
    reasons: [],
    graduationYear: null,
    branch: null,
    isCurrentlyStudying: false
  });
  const [apiError, setApiError] = useState("");
  const [autoFetched, setAutoFetched] = useState(false);
  
  const successRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Get email from URL for navigation
  const currentEmail = getEmailFromURL();

  // Auto-scroll to success message when submitted
  useEffect(() => {
    if (submitted && successRef.current) {
      setTimeout(() => {
        successRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [submitted]);

  // Auto-fetch when email is present in URL on load
  useEffect(() => {
    const emailFromURL = getEmailFromURL();
    if (emailFromURL) {
      console.log('📧 Email found in URL:', emailFromURL);
      // Trigger auto-fetch after a small delay
      setTimeout(() => {
        if (formData.email) {
          fetchUserData(formData.email, 'email');
        }
      }, 500);
    }
  }, []);

  // Helper function to determine current year from graduation year
  const getYearFromGraduation = (graduationYear) => {
    if (!graduationYear) return '';
    const currentYear = new Date().getFullYear();
    const diff = graduationYear - currentYear;
    
    if (diff === 4) return '1st Year';
    if (diff === 3) return '2nd Year';
    if (diff === 2) return '3rd Year';
    if (diff === 1) return '4th Year';
    if (diff === 0) return 'Final Year';
    return '';
  };

  const getAcademicYearLabel = (academicYear) => {
    const suffix = { 1: 'st', 2: 'nd', 3: 'rd', 4: 'th' }[academicYear];
    return suffix ? `${academicYear}${suffix} Year` : 'an unknown year';
  };

  // Check user eligibility based on fetched data
  const checkUserEligibility = (user) => {
    let isEligible = true;
    let reasons = [];
    let graduationYear = user.graduationYear || 'Unknown';
    let branch = user.branch || 'Unknown';
    
    // Check 1: Must be currently studying
    if (!user.isCurrentlyStudying) {
      isEligible = false;
      reasons.push(`This student is not currently studying (Graduation year: ${graduationYear})`);
    }
    
    // Check 2: Must have a valid branch
    if (!user.branch || user.branch === '') {
      isEligible = false;
      reasons.push('Branch information is missing');
    }
    
    // Check 3: Must have valid graduation year
    if (!user.graduationYear) {
      isEligible = false;
      reasons.push('Graduation year information is missing');
    }

    if (!user.isSecondYear) {
      isEligible = false;
      reasons.push(`Only 2nd year students are eligible. This student is in ${getAcademicYearLabel(user.academicYear)}.`);
    }
    
    const eligibilityResult = {
      isEligible,
      reasons,
      graduationYear,
      academicYear: user.academicYear,
      isSecondYear: user.isSecondYear,
      branch,
      fullName: user.fullName,
      isCurrentlyStudying: user.isCurrentlyStudying
    };
    
    setEligibilityCheck(eligibilityResult);
    
    // If not eligible, show alert
    if (!isEligible) {
      const alertMessage = `❌ ${user.fullName} is NOT eligible for this scholarship.\n\nReasons:\n${reasons.map((r, i) => `${i+1}. ${r}`).join('\n')}\n\nPlease contact the alumni office for assistance.`;
      alert(alertMessage);
    }
    
    return eligibilityResult;
  };

  // Auto-fetch function
  const fetchUserData = async (searchValue, searchType = 'email') => {
    isFetchingRef.current = true;
    
    try {
      setIsFetching(true);
      setUserNotFound(false);
      setFetchedUser(null);
      setApiError("");
      setAutoFetched(false);
      
      if (!searchValue || searchValue.trim() === '') {
        setIsFetching(false);
        isFetchingRef.current = false;
        return null;
      }

      const trimmedValue = searchValue.trim();
      console.log(`🔍 Fetching user by ${searchType}:`, trimmedValue);

      const queryParam = searchType === 'email' 
        ? `email=${encodeURIComponent(trimmedValue)}` 
        : `registerNo=${encodeURIComponent(trimmedValue)}`;
      
      const url = `http://localhost:5000/api/user?${queryParam}`;
      console.log(`📡 Fetching from URL:`, url);
      
      const response = await fetch(url);
      console.log(`📡 Response status:`, response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('❌ User not found (404)');
          setUserNotFound(true);
          setAutoFetched(false);
          setIsFetching(false);
          isFetchingRef.current = false;
          return null;
        }
        if (response.status === 500) {
          setApiError('Server error. Please try again later.');
          setIsFetching(false);
          isFetchingRef.current = false;
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (data && data.success === true && data.user) {
        const user = data.user;
        console.log('✅ User found:', user.fullName);
        
        if (user.isAdmin) {
          setIsFetching(false);
          isFetchingRef.current = false;
          navigate('/admin');
          return user;
        }

        setFetchedUser(user);
        setUserNotFound(false);
        setAutoFetched(true);
        
        // Auto-populate form fields
        setFormData(prev => ({
          ...prev,
          name: user.fullName || prev.name,
          email: user.email || prev.email,
          mobileNumber: user.mobile || prev.mobileNumber,
          registerNo: user.registerNo || prev.registerNo,
          department: user.branch || prev.department,
          year: user.graduationYear ? getYearFromGraduation(user.graduationYear) : prev.year,
          dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : prev.dateOfBirth,
        }));
        
        // Check eligibility
        checkUserEligibility(user);
        
        setIsFetching(false);
        isFetchingRef.current = false;
        return user;
      }
      
      console.log('❌ No user data in response');
      setUserNotFound(true);
      setAutoFetched(false);
      setIsFetching(false);
      isFetchingRef.current = false;
      return null;
      
    } catch (error) {
      console.error('❌ Fetch error:', error);
      setApiError(`Failed to connect to server: ${error.message}`);
      setUserNotFound(true);
      setAutoFetched(false);
      setIsFetching(false);
      isFetchingRef.current = false;
      return null;
    }
  };

  // Auto-fetch when email changes
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    if (!formData.email || formData.email.trim() === '') {
      setUserNotFound(false);
      setFetchedUser(null);
      setAutoFetched(false);
      setIsFetching(false);
      isFetchingRef.current = false;
      return;
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setUserNotFound(false);
      setFetchedUser(null);
      setAutoFetched(false);
      return;
    }

    if (formData.email.length < 5) {
      setUserNotFound(false);
      setFetchedUser(null);
      setAutoFetched(false);
      return;
    }

    console.log('📧 Email changed to:', formData.email);

    fetchTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Timeout triggered, fetching user data...');
      fetchUserData(formData.email, 'email');
    }, 800);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [formData.email]);

  // Navigate to Student Dashboard with email
  const goToDashboard = () => {
    if (currentEmail) {
      navigate(`/student/${encodeURIComponent(currentEmail)}`);
    } else {
      alert('No email found to navigate to dashboard');
    }
  };

  // Validation helper functions
  const validateMobileNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 10) return cleaned;
    return cleaned.slice(0, 10);
  };

  const validateNumber = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    return cleaned;
  };

  const validateGPA = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (cleaned === '') return '';
    const num = parseFloat(cleaned);
    if (num > 10) return '10';
    if (num < 0) return '0';
    return cleaned;
  };

  const validatePercentage = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (cleaned === '') return '';
    const num = parseFloat(cleaned);
    if (num > 100) return '100';
    if (num < 0) return '0';
    return cleaned;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Check eligibility questions - AICTE Fee Waiver
    if (name === "aicteFeeWaiver" || name === "govtScholarship") {
      if (value === "yes") {
        const questionName = name === "aicteFeeWaiver" ? "AICTE Fee Waiver" : "7.5% Government Scholarship";
        setEligibilityError(true);
        setEligibilityType(name === "aicteFeeWaiver" ? "AICTE Fee Waiver" : "7.5% Government Scholarship");
        setEligibilityMessage(`⚠️ You have selected "Yes" for ${questionName}. This makes you ineligible for this scholarship. Please contact the alumni office for assistance.`);
        
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
        setErrors({});
        return;
      } else {
        setEligibilityError(false);
        setEligibilityMessage("");
        setEligibilityType("");
        setFormData((prev) => ({ ...prev, [name]: value }));
        return;
      }
    }

    // Check if quota is management - Just show warning, don't disable fields
    if (name === "quota") {
      if (value === "management") {
        setQuotaError(true);
        setFormData((prev) => ({ ...prev, quota: value }));
        alert("⚠️ Management quota students are not eligible for this scholarship. You can still fill the form, but you won't be able to submit.");
        return;
      } else {
        setQuotaError(false);
        setFormData((prev) => ({ ...prev, quota: value }));
        return;
      }
    }
    
    // Apply validations based on field type
    let processedValue = value;
    
    // Mobile number validation - only numbers, max 10 digits
    // Skip validation for auto-fetched mobile numbers
    if (name === "mobileNumber") {
      if (autoFetched) {
        // Allow auto-fetched mobile number to be edited without validation
        processedValue = value;
      } else {
        const cleaned = value.replace(/\D/g, '');
        processedValue = cleaned.slice(0, 10);
      }
    }
    
    // Father and Mother mobile - always validate (not auto-fetched)
    if (name === "fatherMobile" || name === "motherMobile") {
      const cleaned = value.replace(/\D/g, '');
      processedValue = cleaned.slice(0, 10);
    }
    
    // Income fields - only numbers (no letters)
    if (name === "fatherIncome" || name === "motherIncome" || name === "firstGraduateAmount" || 
        name === "loanAmount" || name === "hostelFees" || name === "transportFees" || 
        name === "collegeFees") {
      processedValue = value.replace(/[^0-9]/g, '');
    }
    
    // GPA fields - numbers only, max 10
    if (name === "firstSemGPA" || name === "secondSemGPA") {
      processedValue = validateGPA(value);
    }
    
    // Percentage fields - numbers only, max 100
    if (name === "sslcPercentage" || name === "hslcPercentage") {
      processedValue = validatePercentage(value);
    }
    
    // Family member working amount - numbers only
    if (name === "workingAmount") {
      processedValue = value.replace(/[^0-9]/g, '');
    }
    
    // Scholarship amount - numbers only
    if (name === "amount") {
      processedValue = value.replace(/[^0-9]/g, '');
    }
    
    // Number of arrears - numbers only
    if (name === "numberOfArrears") {
      processedValue = value.replace(/[^0-9]/g, '');
    }
    
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFamilyMemberChange = (index, field, value) => {
    const updatedMembers = [...formData.familyMembers];
    
    // Validate workingAmount field
    if (field === "workingAmount") {
      value = value.replace(/[^0-9]/g, '');
    }
    
    updatedMembers[index][field] = value;
    setFormData((prev) => ({ ...prev, familyMembers: updatedMembers }));
  };

  const addFamilyMember = () => {
    setFormData((prev) => ({
      ...prev,
      familyMembers: [
        ...prev.familyMembers,
        { name: "", relation: "", qualification: "", status: "", workingAmount: "" },
      ],
    }));
  };

  const removeFamilyMember = (index) => {
    if (formData.familyMembers.length > 1) {
      const updatedMembers = formData.familyMembers.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, familyMembers: updatedMembers }));
    }
  };

  // Scholarship handlers
  const handleScholarshipChange = (index, field, value) => {
    const updatedScholarships = [...formData.scholarships];
    
    // Validate amount field
    if (field === "amount") {
      value = value.replace(/[^0-9]/g, '');
    }
    
    updatedScholarships[index][field] = value;
    setFormData((prev) => ({ ...prev, scholarships: updatedScholarships }));
  };

  const addScholarship = () => {
    setFormData((prev) => ({
      ...prev,
      scholarships: [...prev.scholarships, { name: "", amount: "", specificName: "" }],
    }));
  };

  const removeScholarship = (index) => {
    if (formData.scholarships.length > 1) {
      const updatedScholarships = formData.scholarships.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, scholarships: updatedScholarships }));
    }
  };

  // Calculate total sibling income
  const calculateSiblingIncome = () => {
    let totalIncome = 0;
    formData.familyMembers.forEach(member => {
      if (member.status === "working" && member.workingAmount) {
        totalIncome += parseFloat(member.workingAmount) || 0;
      }
    });
    return totalIncome;
  };

  // Check eligibility and get reasons
  const checkEligibility = () => {
    const reasons = [];
    let isEligible = true;

    if (formData.aicteFeeWaiver === "yes") {
      isEligible = false;
      reasons.push("AICTE Fee Waiver students are not eligible");
    }

    if (formData.govtScholarship === "yes") {
      isEligible = false;
      reasons.push("7.5% Government Scholarship students are not eligible");
    }

    if (formData.quota === "management") {
      isEligible = false;
      reasons.push("Management quota students are not eligible");
    }

    const fatherIncome = parseFloat(formData.fatherIncome) || 0;
    const motherIncome = parseFloat(formData.motherIncome) || 0;
    const totalParentIncome = fatherIncome + motherIncome;
    if (totalParentIncome > 150000) {
      isEligible = false;
      reasons.push(`Parent income (₹${totalParentIncome.toLocaleString()}) exceeds ₹1,50,000 limit`);
    }

    const siblingIncome = calculateSiblingIncome();
    if (siblingIncome > 300000) {
      isEligible = false;
      reasons.push(`Sibling income (₹${siblingIncome.toLocaleString()}) exceeds ₹3,00,000 limit`);
    }

    const firstSem = parseFloat(formData.firstSemGPA) || 0;
    const secondSem = parseFloat(formData.secondSemGPA) || 0;
    const cgpa = (firstSem + secondSem) / 2;
    if (cgpa < 8) {
      isEligible = false;
      reasons.push(`CGPA (${cgpa.toFixed(2)}) is below 8.0`);
    }

    // Check history of arrears
    if (formData.historyOfArrears === "yes") {
      const numArrears = parseInt(formData.numberOfArrears) || 0;
      if (numArrears > 0) {
        isEligible = false;
        reasons.push(`Student has ${numArrears} arrears. Students with arrears are not eligible.`);
      }
    }

    if (fetchedUser && !fetchedUser.isCurrentlyStudying) {
      isEligible = false;
      reasons.push(`Student is not currently studying (Graduation year: ${fetchedUser.graduationYear || 'Unknown'})`);
    }

    if (fetchedUser && !fetchedUser.isSecondYear) {
      isEligible = false;
      reasons.push(`Only 2nd year students are eligible. This student is in ${getAcademicYearLabel(fetchedUser.academicYear)}.`);
    }

    return {
      isEligible,
      reasons,
      details: {
        totalParentIncome: totalParentIncome,
        siblingIncome: siblingIncome,
        cgpa: cgpa,
        quota: formData.quota,
        hasArrears: formData.historyOfArrears === "yes",
        numberOfArrears: parseInt(formData.numberOfArrears) || 0
      }
    };
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (quotaError) {
      newErrors.quota = "Management quota students are not eligible";
      return newErrors;
    }
    
    if (eligibilityError) {
      newErrors.eligibility = "You are not eligible for this scholarship";
      return newErrors;
    }
    
    if (fetchedUser && !eligibilityCheck.isEligible) {
      newErrors.general = "This student is not eligible for the scholarship";
      return newErrors;
    }
    
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";
    
    // Mobile number validation - skip 10-digit check if auto-fetched
    if (!formData.mobileNumber) {
      newErrors.mobileNumber = "Mobile number is required";
    } else if (!autoFetched && formData.mobileNumber.length !== 10) {
      newErrors.mobileNumber = "Mobile number must be 10 digits";
    }
    
    if (!formData.aicteFeeWaiver) newErrors.aicteFeeWaiver = "Please select if you have AICTE Fee Waiver";
    if (!formData.govtScholarship) newErrors.govtScholarship = "Please select if you have 7.5% Government Scholarship";
    
    if (!formData.registerNo) newErrors.registerNo = "Register number is required";
    if (!formData.quota) newErrors.quota = "Please select quota type";
    if (!formData.collegeEmail) newErrors.collegeEmail = "College email is required";
    if (!formData.addressCommunication) newErrors.addressCommunication = "Address is required";
    if (!formData.native) newErrors.native = "Native place is required";
    if (!formData.year) newErrors.year = "Year is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.studentType) newErrors.studentType = "Please select student type";
    
    if (formData.studentType === "hosteller" && !formData.hostelFees) {
      newErrors.hostelFees = "Hostel fees is required";
    }
    if (formData.studentType === "dayscholar" && !formData.transportFees) {
      newErrors.transportFees = "Transport fees is required";
    }
    if (!formData.collegeFees) newErrors.collegeFees = "College fees is required";
    
    if (!formData.fatherName) newErrors.fatherName = "Father's name is required";
    if (!formData.fatherOccupation) newErrors.fatherOccupation = "Father's occupation is required";
    if (!formData.fatherIncome) newErrors.fatherIncome = "Father's income is required";
    if (!formData.fatherMobile) newErrors.fatherMobile = "Father's mobile is required";
    else if (formData.fatherMobile.length !== 10) newErrors.fatherMobile = "Mobile number must be 10 digits";
    
    if (!formData.motherName) newErrors.motherName = "Mother's name is required";
    if (!formData.motherOccupation) newErrors.motherOccupation = "Mother's occupation is required";
    if (!formData.motherIncome) newErrors.motherIncome = "Mother's income is required";
    if (!formData.motherMobile) newErrors.motherMobile = "Mother's mobile is required";
    else if (formData.motherMobile.length !== 10) newErrors.motherMobile = "Mobile number must be 10 digits";
    
    if (!formData.sslcPercentage) newErrors.sslcPercentage = "SSLC percentage is required";
    else {
      const sslcNum = parseFloat(formData.sslcPercentage);
      if (isNaN(sslcNum) || sslcNum < 0 || sslcNum > 100) {
        newErrors.sslcPercentage = "SSLC percentage must be between 0 and 100";
      }
    }
    
    if (!formData.hslcPercentage) newErrors.hslcPercentage = "HSLC percentage is required";
    else {
      const hslcNum = parseFloat(formData.hslcPercentage);
      if (isNaN(hslcNum) || hslcNum < 0 || hslcNum > 100) {
        newErrors.hslcPercentage = "HSLC percentage must be between 0 and 100";
      }
    }
    
    if (!formData.firstSemGPA) newErrors.firstSemGPA = "First sem GPA is required";
    else {
      const gpaNum = parseFloat(formData.firstSemGPA);
      if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 10) {
        newErrors.firstSemGPA = "GPA must be between 0 and 10";
      }
    }
    
    if (!formData.secondSemGPA) newErrors.secondSemGPA = "Second sem GPA is required";
    else {
      const gpaNum = parseFloat(formData.secondSemGPA);
      if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 10) {
        newErrors.secondSemGPA = "GPA must be between 0 and 10";
      }
    }
    
    if (!formData.firstGraduate) newErrors.firstGraduate = "Please select if you're first graduate";
    if (formData.firstGraduate === "yes" && !formData.firstGraduateAmount) {
      newErrors.firstGraduateAmount = "Please enter the amount";
    }
    
    // History of Arrears validation
    if (!formData.historyOfArrears) {
      newErrors.historyOfArrears = "Please select if you have history of arrears";
    }
    if (formData.historyOfArrears === "yes" && !formData.numberOfArrears) {
      newErrors.numberOfArrears = "Please enter the number of arrears";
    }
    if (formData.historyOfArrears === "yes" && formData.numberOfArrears) {
      const numArrears = parseInt(formData.numberOfArrears);
      if (isNaN(numArrears) || numArrears < 0) {
        newErrors.numberOfArrears = "Please enter a valid number";
      }
    }
    
    formData.scholarships.forEach((scholarship, index) => {
      if ((scholarship.name && !scholarship.amount) || (!scholarship.name && scholarship.amount)) {
        if (!scholarship.name) {
          newErrors[`scholarshipName_${index}`] = "Please select a scholarship";
        }
        if (!scholarship.amount) {
          newErrors[`scholarshipAmount_${index}`] = "Scholarship amount is required";
        }
      }
      if (scholarship.name === "anyother" && !scholarship.specificName) {
        newErrors[`scholarshipSpecificName_${index}`] = "Please specify the scholarship name";
      }
    });
    
    if (!formData.bankLoanAvailed) newErrors.bankLoanAvailed = "Please select if bank loan availed";
    if (formData.bankLoanAvailed === "yes") {
      if (!formData.bankName) newErrors.bankName = "Bank name is required";
      if (!formData.bankBranch) newErrors.bankBranch = "Bank branch is required";
      if (!formData.loanAmount) newErrors.loanAmount = "Loan amount is required";
    }
    
    if (!formData.areaOfInterest) newErrors.areaOfInterest = "Area of interest is required";
    if (!formData.dreamCompany) newErrors.dreamCompany = "Dream company is required";
    if (!formData.message) newErrors.message = "Please explain why you need scholarship";
    
    return newErrors;
  };

  const handleSubmit = async () => {
    if (quotaError) {
      alert("⚠️ Management quota students are not eligible for this scholarship. Please contact the alumni office for assistance.");
      return;
    }

    if (eligibilityError) {
      alert(`⚠️ ${eligibilityMessage}`);
      return;
    }

    if (fetchedUser && !eligibilityCheck.isEligible) {
      alert(`❌ ${fetchedUser.fullName} is not eligible for this scholarship.\n\nReasons:\n${eligibilityCheck.reasons.map((r, i) => `${i+1}. ${r}`).join('\n')}\n\nPlease contact the alumni office for assistance.`);
      return;
    }

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    
    try {
      // DO NOT generate ID on frontend - let the backend handle it
      // Remove the applicationId generation from here
      
      const scholarshipData = {
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        aicteFeeWaiver: formData.aicteFeeWaiver,
        govtScholarship: formData.govtScholarship,
        registerNo: formData.registerNo,
        quota: formData.quota,
        collegeEmail: formData.collegeEmail,
        addressCommunication: formData.addressCommunication,
        native: formData.native,
        year: formData.year,
        department: formData.department,
        dateOfBirth: formData.dateOfBirth,
        studentType: formData.studentType,
        hostelFees: formData.hostelFees,
        transportFees: formData.transportFees,
        collegeFees: formData.collegeFees,
        fatherName: formData.fatherName,
        fatherOccupation: formData.fatherOccupation,
        fatherIncome: formData.fatherIncome,
        fatherMobile: formData.fatherMobile,
        motherName: formData.motherName,
        motherOccupation: formData.motherOccupation,
        motherIncome: formData.motherIncome,
        motherMobile: formData.motherMobile,
        familyMembers: formData.familyMembers,
        sslcPercentage: formData.sslcPercentage,
        hslcPercentage: formData.hslcPercentage,
        firstSemGPA: formData.firstSemGPA,
        secondSemGPA: formData.secondSemGPA,
        firstGraduate: formData.firstGraduate,
        firstGraduateAmount: formData.firstGraduateAmount,
        historyOfArrears: formData.historyOfArrears,
        numberOfArrears: formData.numberOfArrears,
        scholarships: formData.scholarships,
        bankLoanAvailed: formData.bankLoanAvailed,
        bankName: formData.bankName,
        bankBranch: formData.bankBranch,
        loanAmount: formData.loanAmount,
        areaOfInterest: formData.areaOfInterest,
        dreamCompany: formData.dreamCompany,
        message: formData.message,
        fetchedUser: fetchedUser || {},
        eligibilityCheck: eligibilityCheck
        // DO NOT send applicationId - let the backend generate it
      };
      
      console.log('📤 Sending data to backend:', scholarshipData);
      
      const response = await fetch('http://localhost:5000/api/scholarship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scholarshipData)
      });
      
      const result = await response.json();
      console.log('📦 Response from backend:', result);
      
      if (result.success) {
        setSubmitted(true);
        setSubmitting(false);
        
        // Use the application ID returned from the backend
        const appId = result.applicationId || 'N/A';
        alert(`✅ Application submitted successfully!\n\nApplication ID: ${appId}\n\nPlease save this ID for future reference.`);
        
        setFormData({
          name: "",
          email: "",
          mobileNumber: "",
          aicteFeeWaiver: "",
          govtScholarship: "",
          registerNo: "",
          quota: "",
          collegeEmail: "",
          addressCommunication: "",
          native: "",
          year: "",
          department: "",
          dateOfBirth: "",
          studentType: "",
          hostelFees: "",
          transportFees: "",
          collegeFees: "",
          fatherName: "",
          fatherOccupation: "",
          fatherIncome: "",
          fatherMobile: "",
          motherName: "",
          motherOccupation: "",
          motherIncome: "",
          motherMobile: "",
          familyMembers: [{ name: "", relation: "", qualification: "", status: "", workingAmount: "" }],
          sslcPercentage: "",
          hslcPercentage: "",
          firstSemGPA: "",
          secondSemGPA: "",
          firstGraduate: "",
          firstGraduateAmount: "",
          historyOfArrears: "",
          numberOfArrears: "",
          scholarships: [{ name: "", amount: "", specificName: "" }],
          bankLoanAvailed: "",
          bankName: "",
          bankBranch: "",
          loanAmount: "",
          areaOfInterest: "",
          dreamCompany: "",
          message: "",
        });
        
        setFetchedUser(null);
        setAutoFetched(false);
        
        setTimeout(() => {
          window.location.reload();
        }, 10000);
        
      } else {
        throw new Error(result.message || 'Failed to submit application');
      }
      
    } catch (err) {
      console.error('❌ Submission error:', err);
      alert(`❌ Submission failed: ${err.message}`);
      setSubmitting(false);
    }
  };

  const isFieldDisabled = submitted;
  const isAutoFetchFieldDisabled = submitted || (autoFetched && fetchedUser);

  return (
    <div className="waiver-wrapper">
      <div className="waiver-container">
        <div className="waiver-header">
          <h1 className="form-main-title">NEC Scholarship Form</h1>
          <p className="waiver-instruction">Please fill all the details carefully</p>
        </div>

        {/* Back to Dashboard Button */}
        {currentEmail && (
          <div className="dashboard-nav-button">
            <button 
              className="btn-dashboard-nav" 
              onClick={goToDashboard}
              type="button"
            >
              ← Back to Dashboard
            </button>
          </div>
        )}

        {/* Success Banner */}
        {submitted && (
          <div className="success-banner" ref={successRef}>
            <div className="success-icon">✓</div>
            <div className="success-content">
              <h3>Application Submitted Successfully!</h3>
              <p>Your application has been submitted successfully.</p>
              <p className="reload-timer">Page will reload in 20 seconds...</p>
            </div>
          </div>
        )}

        {/* API Error Banner */}
        {apiError && (
          <div className="quota-error-banner">
            <div className="quota-error-icon">⚠️</div>
            <div className="quota-error-content">
              <h4>Connection Error</h4>
              <p>{apiError}</p>
              <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                Make sure backend is running: <code>node server.js</code>
              </p>
            </div>
          </div>
        )}

        {/* Quota Error Banner */}
        {quotaError && (
          <div className="quota-error-banner">
            <div className="quota-error-icon">⚠️</div>
            <div className="quota-error-content">
              <h4>Management Quota Not Eligible</h4>
              <p>Management quota students are not eligible for this scholarship. Please contact the alumni office for assistance.</p>
              <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#856404' }}>
                ℹ️ You can still fill the form, but you won't be able to submit.
              </p>
            </div>
          </div>
        )}

        {/* Eligibility Error Banner */}
        {eligibilityError && (
          <div className="quota-error-banner">
            <div className="quota-error-icon">⚠️</div>
            <div className="quota-error-content">
              <h4>Not Eligible for This Scholarship</h4>
              <p>{eligibilityMessage}</p>
              <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#856404' }}>
                ℹ️ You can still fill the form, but you won't be able to submit.
              </p>
            </div>
          </div>
        )}



        <form className="waiver-form" onSubmit={(e) => e.preventDefault()}>
          {/* SECTION 1: PERSONAL DETAILS (Auto-fetch fields) */}
          <div className="form-section">
            <h2 className="section-title">Personal Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={errors.name ? "error" : ""}
                  disabled={isAutoFetchFieldDisabled}
                />
                {isFetching && (
                  <span className="info-text loading-text">
                    <span className="spinner-small"></span> Fetching details...
                  </span>
                )}
                {!isFetching && autoFetched && fetchedUser && (
                  <span className="info-text success-text"> Auto-filled from database</span>
                )}
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className={errors.email ? "error" : ""}
                  disabled={isAutoFetchFieldDisabled}
                />
                {isFetching && (
                  <span className="info-text loading-text">
                    <span className="spinner-small"></span> Fetching details...
                  </span>
                )}
                {!isFetching && userNotFound && formData.email && formData.email.includes('@') && (
                  <span className="info-text not-found-text">
                     No user found with this email. Please fill manually.
                  </span>
                )}
                {!isFetching && !userNotFound && fetchedUser && (
                  <span className="info-text success-text">
                    Found: {fetchedUser.fullName} ({fetchedUser.branch || 'No branch'})
                  </span>
                )}
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Mobile Number <span className="required">*</span></label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder={autoFetched ? "Auto-filled mobile number" : "Enter 10-digit mobile number"}
                  className={errors.mobileNumber ? "error" : ""}
                  disabled={isFieldDisabled}
                  maxLength={autoFetched ? undefined : 10}
                />
                {!isFetching && fetchedUser && (
                  <span className="info-text" style={{ color: '#ff9800', fontSize: '0.8rem' }}>
                    ℹ️ Please verify your mobile number
                  </span>
                )}
                {errors.mobileNumber && <span className="error-text">{errors.mobileNumber}</span>}
              </div>
            </div>
          </div>

          {/* SECTION 2: ELIGIBILITY CHECK */}
          <div className="form-section eligibility-section">
            <h2 className="section-title">Eligibility Check</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>AICTE Fee Waiver <span className="required">*</span></label>
                <select
                  name="aicteFeeWaiver"
                  value={formData.aicteFeeWaiver}
                  onChange={handleChange}
                  className={errors.aicteFeeWaiver ? "error" : ""}
                  disabled={submitted}
                >
                  <option value="">Select</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
                {errors.aicteFeeWaiver && <span className="error-text">{errors.aicteFeeWaiver}</span>}
              </div>

              <div className="form-group">
                <label>7.5% Government Scholarship <span className="required">*</span></label>
                <select
                  name="govtScholarship"
                  value={formData.govtScholarship}
                  onChange={handleChange}
                  className={errors.govtScholarship ? "error" : ""}
                  disabled={submitted}
                >
                  <option value="">Select</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
                {errors.govtScholarship && <span className="error-text">{errors.govtScholarship}</span>}
              </div>
            </div>
          </div>

          {/* SECTION 3: PERSONAL DETAILS (Remaining) */}
          <div className="form-section">
            <h2 className="section-title">Additional Personal Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Register Number <span className="required">*</span></label>
                <input
                  type="text"
                  name="registerNo"
                  value={formData.registerNo}
                  onChange={handleChange}
                  placeholder="Enter register number"
                  className={errors.registerNo ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.registerNo && <span className="error-text">{errors.registerNo}</span>}
              </div>

              <div className="form-group">
                <label>Quota <span className="required">*</span></label>
                <select
                  name="quota"
                  value={formData.quota}
                  onChange={handleChange}
                  className={errors.quota ? "error" : ""}
                  disabled={isFieldDisabled}
                >
                  <option value="">Select Quota</option>
                  <option value="management">Management</option>
                  <option value="govt">Government</option>
                </select>
                {errors.quota && <span className="error-text">{errors.quota}</span>}
              </div>

              <div className="form-group">
                <label>College Email <span className="required">*</span></label>
                <input
                  type="email"
                  name="collegeEmail"
                  value={formData.collegeEmail}
                  onChange={handleChange}
                  placeholder="Enter college email"
                  className={errors.collegeEmail ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.collegeEmail && <span className="error-text">{errors.collegeEmail}</span>}
              </div>

              <div className="form-group full-width">
                <label>Address for Communication <span className="required">*</span></label>
                <textarea
                  name="addressCommunication"
                  value={formData.addressCommunication}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  className={errors.addressCommunication ? "error" : ""}
                  disabled={isFieldDisabled}
                  rows="2"
                />
                {errors.addressCommunication && <span className="error-text">{errors.addressCommunication}</span>}
              </div>

              <div className="form-group">
                <label>Native <span className="required">*</span></label>
                <input
                  type="text"
                  name="native"
                  value={formData.native}
                  onChange={handleChange}
                  placeholder="Enter your native place"
                  className={errors.native ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.native && <span className="error-text">{errors.native}</span>}
              </div>

              <div className="form-group">
                <label>Year <span className="required">*</span></label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className={errors.year ? "error" : ""}
                  disabled={isFieldDisabled}
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Final Year">Final Year</option>
                </select>
                {errors.year && <span className="error-text">{errors.year}</span>}
              </div>

              <div className="form-group">
                <label>Department <span className="required">*</span></label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={errors.department ? "error" : ""}
                  disabled={isFieldDisabled}
                >
                  <option value="">Select Department</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                  <option value="IT">IT</option>
                  <option value="AI & DS">AI & DS</option>
                  <option value="AI & ML">AI & ML</option>
                </select>
                {errors.department && <span className="error-text">{errors.department}</span>}
              </div>

              <div className="form-group">
                <label>Date of Birth <span className="required">*</span></label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={errors.dateOfBirth ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.dateOfBirth && <span className="error-text">{errors.dateOfBirth}</span>}
              </div>

              <div className="form-group">
                <label>Student Type <span className="required">*</span></label>
                <select
                  name="studentType"
                  value={formData.studentType}
                  onChange={handleChange}
                  className={errors.studentType ? "error" : ""}
                  disabled={isFieldDisabled}
                >
                  <option value="">Select Type</option>
                  <option value="hosteller">Hosteller</option>
                  <option value="dayscholar">Dayscholar</option>
                </select>
                {errors.studentType && <span className="error-text">{errors.studentType}</span>}
              </div>
            </div>
          </div>

          {/* SECTION 4: REMAINING DETAILS */}
          
          {/* Fee Details */}
          {formData.studentType && (
            <div className="form-section">
              <h2 className="section-title">Fee Details</h2>
              <div className="form-grid">
                {formData.studentType === "hosteller" && (
                  <div className="form-group">
                    <label>Hostel Fees <span className="required">*</span></label>
                    <input
                      type="text"
                      name="hostelFees"
                      value={formData.hostelFees}
                      onChange={handleChange}
                      placeholder="Enter hostel fees"
                      className={errors.hostelFees ? "error" : ""}
                      disabled={isFieldDisabled}
                    />
                    {errors.hostelFees && <span className="error-text">{errors.hostelFees}</span>}
                  </div>
                )}

                {formData.studentType === "dayscholar" && (
                  <div className="form-group">
                    <label>Transport Fees <span className="required">*</span></label>
                    <input
                      type="text"
                      name="transportFees"
                      value={formData.transportFees}
                      onChange={handleChange}
                      placeholder="Enter transport fees"
                      className={errors.transportFees ? "error" : ""}
                      disabled={isFieldDisabled}
                    />
                    {errors.transportFees && <span className="error-text">{errors.transportFees}</span>}
                  </div>
                )}

                <div className="form-group">
                  <label>College Fees <span className="required">*</span></label>
                  <input
                    type="text"
                    name="collegeFees"
                    value={formData.collegeFees}
                    onChange={handleChange}
                    placeholder="Enter college fees"
                    className={errors.collegeFees ? "error" : ""}
                    disabled={isFieldDisabled}
                  />
                  {errors.collegeFees && <span className="error-text">{errors.collegeFees}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Father Details */}
          <div className="form-section">
            <h2 className="section-title">Father's Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Father's Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="Enter father's name"
                  className={errors.fatherName ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.fatherName && <span className="error-text">{errors.fatherName}</span>}
              </div>

              <div className="form-group">
                <label>Father's Occupation <span className="required">*</span></label>
                <input
                  type="text"
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleChange}
                  placeholder="Enter occupation"
                  className={errors.fatherOccupation ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.fatherOccupation && <span className="error-text">{errors.fatherOccupation}</span>}
              </div>

              <div className="form-group">
                <label>Father's Annual Income (₹) <span className="required">*</span></label>
                <input
                  type="text"
                  name="fatherIncome"
                  value={formData.fatherIncome}
                  onChange={handleChange}
                  placeholder="Enter annual income"
                  className={errors.fatherIncome ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.fatherIncome && <span className="error-text">{errors.fatherIncome}</span>}
              </div>

              <div className="form-group">
                <label>Father's Mobile <span className="required">*</span></label>
                <input
                  type="tel"
                  name="fatherMobile"
                  value={formData.fatherMobile}
                  onChange={handleChange}
                  placeholder="Enter 10-digit mobile number"
                  className={errors.fatherMobile ? "error" : ""}
                  disabled={isFieldDisabled}
                  maxLength="10"
                />
                {errors.fatherMobile && <span className="error-text">{errors.fatherMobile}</span>}
              </div>
            </div>
          </div>

          {/* Mother Details */}
          <div className="form-section">
            <h2 className="section-title">Mother's Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Mother's Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleChange}
                  placeholder="Enter mother's name"
                  className={errors.motherName ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.motherName && <span className="error-text">{errors.motherName}</span>}
              </div>

              <div className="form-group">
                <label>Mother's Occupation <span className="required">*</span></label>
                <input
                  type="text"
                  name="motherOccupation"
                  value={formData.motherOccupation}
                  onChange={handleChange}
                  placeholder="Enter occupation"
                  className={errors.motherOccupation ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.motherOccupation && <span className="error-text">{errors.motherOccupation}</span>}
              </div>

              <div className="form-group">
                <label>Mother's Annual Income (₹) <span className="required">*</span></label>
                <input
                  type="text"
                  name="motherIncome"
                  value={formData.motherIncome}
                  onChange={handleChange}
                  placeholder="Enter annual income"
                  className={errors.motherIncome ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.motherIncome && <span className="error-text">{errors.motherIncome}</span>}
              </div>

              <div className="form-group">
                <label>Mother's Mobile <span className="required">*</span></label>
                <input
                  type="tel"
                  name="motherMobile"
                  value={formData.motherMobile}
                  onChange={handleChange}
                  placeholder="Enter 10-digit mobile number"
                  className={errors.motherMobile ? "error" : ""}
                  disabled={isFieldDisabled}
                  maxLength="10"
                />
                {errors.motherMobile && <span className="error-text">{errors.motherMobile}</span>}
              </div>
            </div>
          </div>

          {/* Family Members */}
          <div className="form-section">
            <h2 className="section-title">Family Members (Sisters/Brothers)</h2>
            {formData.familyMembers.map((member, index) => (
              <div key={index} className="family-member-card">
                <div className="family-member-header">
                  <h4>Family Member {index + 1}</h4>
                  {formData.familyMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFamilyMember(index)}
                      className="remove-btn"
                      disabled={isFieldDisabled}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Relation</label>
                    <select
                      value={member.relation}
                      onChange={(e) => handleFamilyMemberChange(index, "relation", e.target.value)}
                      disabled={isFieldDisabled}
                    >
                      <option value="">Select Relation</option>
                      <option value="brother">Brother</option>
                      <option value="sister">Sister</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => handleFamilyMemberChange(index, "name", e.target.value)}
                      placeholder="Enter name"
                      disabled={isFieldDisabled}
                    />
                  </div>
                  <div className="form-group">
                    <label>Qualification</label>
                    <input
                      type="text"
                      value={member.qualification}
                      onChange={(e) => handleFamilyMemberChange(index, "qualification", e.target.value)}
                      placeholder="e.g., B.E., M.Sc., 12th"
                      disabled={isFieldDisabled}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={member.status}
                      onChange={(e) => handleFamilyMemberChange(index, "status", e.target.value)}
                      disabled={isFieldDisabled}
                    >
                      <option value="">Select Status</option>
                      <option value="working">Working</option>
                      <option value="studying">Studying</option>
                    </select>
                  </div>
                  {member.status === "working" && (
                    <div className="form-group">
                      <label>Monthly Income (₹)</label>
                      <input
                        type="text"
                        value={member.workingAmount}
                        onChange={(e) => handleFamilyMemberChange(index, "workingAmount", e.target.value)}
                        placeholder="Enter income"
                        disabled={isFieldDisabled}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addFamilyMember}
              className="add-btn"
              disabled={isFieldDisabled}
            >
              + Add Family Member
            </button>
          </div>

          {/* Academic Details */}
          <div className="form-section">
            <h2 className="section-title">Academic Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>SSLC Percentage <span className="required">*</span></label>
                <input
                  type="text"
                  name="sslcPercentage"
                  value={formData.sslcPercentage}
                  onChange={handleChange}
                  placeholder="Enter SSLC percentage (0-100)"
                  className={errors.sslcPercentage ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.sslcPercentage && <span className="error-text">{errors.sslcPercentage}</span>}
              </div>

              <div className="form-group">
                <label>HSLC Percentage <span className="required">*</span></label>
                <input
                  type="text"
                  name="hslcPercentage"
                  value={formData.hslcPercentage}
                  onChange={handleChange}
                  placeholder="Enter HSLC percentage (0-100)"
                  className={errors.hslcPercentage ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.hslcPercentage && <span className="error-text">{errors.hslcPercentage}</span>}
              </div>

              <div className="form-group">
                <label>First Semester GPA <span className="required">*</span></label>
                <input
                  type="text"
                  name="firstSemGPA"
                  value={formData.firstSemGPA}
                  onChange={handleChange}
                  placeholder="Enter GPA (0-10)"
                  className={errors.firstSemGPA ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.firstSemGPA && <span className="error-text">{errors.firstSemGPA}</span>}
              </div>

              <div className="form-group">
                <label>Second Semester GPA <span className="required">*</span></label>
                <input
                  type="text"
                  name="secondSemGPA"
                  value={formData.secondSemGPA}
                  onChange={handleChange}
                  placeholder="Enter GPA (0-10)"
                  className={errors.secondSemGPA ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.secondSemGPA && <span className="error-text">{errors.secondSemGPA}</span>}
              </div>

              <div className="form-group">
                <label>First Graduate? <span className="required">*</span></label>
                <select
                  name="firstGraduate"
                  value={formData.firstGraduate}
                  onChange={handleChange}
                  className={errors.firstGraduate ? "error" : ""}
                  disabled={isFieldDisabled}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                {errors.firstGraduate && <span className="error-text">{errors.firstGraduate}</span>}
              </div>

              {formData.firstGraduate === "yes" && (
                <div className="form-group">
                  <label>First Graduate Amount (₹) <span className="required">*</span></label>
                  <input
                    type="text"
                    name="firstGraduateAmount"
                    value={formData.firstGraduateAmount}
                    onChange={handleChange}
                    placeholder="Enter amount"
                    className={errors.firstGraduateAmount ? "error" : ""}
                    disabled={isFieldDisabled}
                  />
                  {errors.firstGraduateAmount && <span className="error-text">{errors.firstGraduateAmount}</span>}
                </div>
              )}
            </div>
          </div>

          {/* History of Arrears Section */}
          <div className="form-section">
            <h2 className="section-title">History of Arrears</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Do you have any history of arrears? <span className="required">*</span></label>
                <select
                  name="historyOfArrears"
                  value={formData.historyOfArrears}
                  onChange={handleChange}
                  className={errors.historyOfArrears ? "error" : ""}
                  disabled={isFieldDisabled}
                >
                  <option value="">Select</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
                {errors.historyOfArrears && <span className="error-text">{errors.historyOfArrears}</span>}
              </div>

              {formData.historyOfArrears === "yes" && (
                <div className="form-group">
                  <label>Number of Arrears <span className="required">*</span></label>
                  <input
                    type="text"
                    name="numberOfArrears"
                    value={formData.numberOfArrears}
                    onChange={handleChange}
                    placeholder="Enter number of arrears"
                    className={errors.numberOfArrears ? "error" : ""}
                    disabled={isFieldDisabled}
                  />
                  {errors.numberOfArrears && <span className="error-text">{errors.numberOfArrears}</span>}
                  <small style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '4px' }}>
                    Students with arrears are not eligible for this scholarship.
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Scholarship Details */}
          <div className="form-section">
            <h2 className="section-title">Other Scholarship Details</h2>
            {formData.scholarships.map((scholarship, index) => (
              <div key={index} className="family-member-card">
                <div className="family-member-header">
                  <h4>Scholarship {index + 1}</h4>
                  {formData.scholarships.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeScholarship(index)}
                      className="remove-btn"
                      disabled={isFieldDisabled}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Scholarship Name</label>
                    <select
                      value={scholarship.name}
                      onChange={(e) => handleScholarshipChange(index, "name", e.target.value)}
                      className={errors[`scholarshipName_${index}`] ? "error" : ""}
                      disabled={isFieldDisabled}
                    >
                      <option value="">Select Scholarship</option>
                      <option value="AICTE">AICTE</option>
                      <option value="Pragathi">Pragathi</option>
                      <option value="Community">Community</option>
                      <option value="NGO">NGO</option>
                      <option value="anyother">Any Other</option>
                    </select>
                    {errors[`scholarshipName_${index}`] && (
                      <span className="error-text">{errors[`scholarshipName_${index}`]}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Scholarship Amount (₹)</label>
                    <input
                      type="text"
                      value={scholarship.amount}
                      onChange={(e) => handleScholarshipChange(index, "amount", e.target.value)}
                      placeholder="Enter amount"
                      className={errors[`scholarshipAmount_${index}`] ? "error" : ""}
                      disabled={isFieldDisabled}
                    />
                    {errors[`scholarshipAmount_${index}`] && (
                      <span className="error-text">{errors[`scholarshipAmount_${index}`]}</span>
                    )}
                  </div>
                  {scholarship.name === "anyother" && (
                    <div className="form-group full-width">
                      <label>Please specify the scholarship name</label>
                      <input
                        type="text"
                        placeholder="Enter the specific scholarship name"
                        value={scholarship.specificName || ""}
                        onChange={(e) => {
                          const updatedScholarships = [...formData.scholarships];
                          updatedScholarships[index].specificName = e.target.value;
                          setFormData((prev) => ({ ...prev, scholarships: updatedScholarships }));
                        }}
                        className={errors[`scholarshipSpecificName_${index}`] ? "error" : ""}
                        disabled={isFieldDisabled}
                      />
                      {errors[`scholarshipSpecificName_${index}`] && (
                        <span className="error-text">{errors[`scholarshipSpecificName_${index}`]}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addScholarship}
              className="add-btn"
              disabled={isFieldDisabled}
            >
              + Add Scholarship
            </button>
          </div>

          {/* Bank Loan Details */}
          <div className="form-section">
            <h2 className="section-title">Bank Loan Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Bank Loan Availed? <span className="required">*</span></label>
                <select
                  name="bankLoanAvailed"
                  value={formData.bankLoanAvailed}
                  onChange={handleChange}
                  className={errors.bankLoanAvailed ? "error" : ""}
                  disabled={isFieldDisabled}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                {errors.bankLoanAvailed && <span className="error-text">{errors.bankLoanAvailed}</span>}
              </div>

              {formData.bankLoanAvailed === "yes" && (
                <>
                  <div className="form-group">
                    <label>Bank Name <span className="required">*</span></label>
                    <input
                      type="text"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      placeholder="Enter bank name"
                      className={errors.bankName ? "error" : ""}
                      disabled={isFieldDisabled}
                    />
                    {errors.bankName && <span className="error-text">{errors.bankName}</span>}
                  </div>
                  <div className="form-group">
                    <label>Bank Branch <span className="required">*</span></label>
                    <input
                      type="text"
                      name="bankBranch"
                      value={formData.bankBranch}
                      onChange={handleChange}
                      placeholder="Enter branch"
                      className={errors.bankBranch ? "error" : ""}
                      disabled={isFieldDisabled}
                    />
                    {errors.bankBranch && <span className="error-text">{errors.bankBranch}</span>}
                  </div>
                  <div className="form-group">
                    <label>Loan Amount (₹) <span className="required">*</span></label>
                    <input
                      type="text"
                      name="loanAmount"
                      value={formData.loanAmount}
                      onChange={handleChange}
                      placeholder="Enter loan amount"
                      className={errors.loanAmount ? "error" : ""}
                      disabled={isFieldDisabled}
                    />
                    {errors.loanAmount && <span className="error-text">{errors.loanAmount}</span>}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="form-section">
            <h2 className="section-title">Additional Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Area of Interest <span className="required">*</span></label>
                <input
                  type="text"
                  name="areaOfInterest"
                  value={formData.areaOfInterest}
                  onChange={handleChange}
                  placeholder="e.g., Web Development, AI/ML"
                  className={errors.areaOfInterest ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.areaOfInterest && <span className="error-text">{errors.areaOfInterest}</span>}
              </div>

              <div className="form-group">
                <label>Dream Company <span className="required">*</span></label>
                <input
                  type="text"
                  name="dreamCompany"
                  value={formData.dreamCompany}
                  onChange={handleChange}
                  placeholder="e.g., Google, Microsoft"
                  className={errors.dreamCompany ? "error" : ""}
                  disabled={isFieldDisabled}
                />
                {errors.dreamCompany && <span className="error-text">{errors.dreamCompany}</span>}
              </div>

              <div className="form-group full-width">
                <label>Why do you need this scholarship? <span className="required">*</span></label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Please explain your financial situation and why you deserve this scholarship..."
                  className={errors.message ? "error" : ""}
                  disabled={isFieldDisabled}
                  rows="5"
                />
                {errors.message && <span className="error-text">{errors.message}</span>}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            className="submit-btn"
            disabled={submitting || submitted || quotaError || eligibilityError || (fetchedUser && !eligibilityCheck.isEligible)}
          >
            {submitting ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : submitted ? (
              "Submitted ✓"
            ) : (quotaError || eligibilityError) ? (
              "Not Eligible"
            ) : (fetchedUser && !eligibilityCheck.isEligible) ? (
              "Not Eligible"
            ) : (
              "Submit Application"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Main App Component with Routing
function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Main route - Student Dashboard */}
          <Route path="/" element={<StudentDashboard />} />
          {/* Form route */}
          <Route path="/form" element={<AICTEFeeWaiverForm />} />
          {/* Admin route */}
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Alumni portal SSO route: /scholarship-dashboard?email=<base64-email> */}
          <Route path="/scholarship-dashboard" element={<ScholarshipSsoEntry />} />
          {/* Student dashboard with email */}
          <Route path="/student/:email" element={<StudentDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
