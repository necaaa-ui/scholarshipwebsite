const User = require('../models/User');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAcademicYear = (graduationYear) => {
  if (!graduationYear) return null;

  const yearsUntilGraduation = graduationYear - new Date().getFullYear();
  const academicYearByRemainingYears = { 4: 1, 3: 2, 2: 3, 1: 4 };

  return academicYearByRemainingYears[yearsUntilGraduation] || null;
};

exports.getUserByEmail = async (req, res) => {
  try {
    const { email, registerNo } = req.query;

    if (!email && !registerNo) {
      return res.status(400).json({
        success: false,
        message: "Email or Register Number is required"
      });
    }

    console.log("🔍 Searching members collection for:", email || registerNo);

    const searchValue = (email || registerNo).trim();
    const searchField = email ? 'basic.email_id' : 'basic.register_no';
    const user = await User.collection.findOne({
      [searchField]: { $regex: new RegExp(`^${escapeRegex(searchValue)}$`, 'i') }
    });

    if (!user) {
      console.log("❌ User NOT found for:", email || registerNo);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("✅ FOUND USER:", user.basic?.name);

    // Extract details
    const fullName = user.basic?.name || "Unknown";
    const label = user.basic?.label || "";
    const isAdmin = label.trim().toLowerCase() === 'admin';
    const emailId = user.basic?.email_id || "";
    const mobile = user.contact_details?.mobile || "Not Provided";
    const registerNoValue = user.basic?.register_no || "";
    const dateOfBirth = user.basic?.dateofbirth || "";

    let batch = "Unknown";
    let branch = "Unknown";
    let graduationYear = null;
    let isCurrentlyStudying = false;
    let academicYear = null;

    if (label) {
      const parts = label.split(",");
      if (parts.length >= 2) {
        // Extract year (e.g., "BE 2028" -> "2028")
        const yearPart = parts[0].trim();
        const yearMatch = yearPart.match(/\d{4}/);
        if (yearMatch) {
          graduationYear = parseInt(yearMatch[0]);
          batch = yearMatch[0];
          academicYear = getAcademicYear(graduationYear);
          isCurrentlyStudying = academicYear !== null;
        }
        // Extract branch (e.g., "CIVIL")
        branch = parts[1].trim();
      }
    }

    return res.json({
      success: true,
      user: {
        fullName,
        branch,
        batch,
        graduationYear,
        academicYear,
        isAdmin,
        isSecondYear: academicYear === 2,
        isCurrentlyStudying,
        email: emailId,
        mobile,
        registerNo: registerNoValue,
        dateOfBirth,
        label
      }
    });

  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching user data"
    });
  }
};
