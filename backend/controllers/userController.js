const User = require('../models/User');

exports.getUserByEmail = async (req, res) => {
  try {
    const { email, registerNo } = req.query;

    // Build query
    let query = {};
    if (email) {
      query["basic.email_id"] = email;
    } else if (registerNo) {
      query["basic.register_no"] = registerNo;
    }

    if (!email && !registerNo) {
      return res.status(400).json({
        success: false,
        message: "Email or Register Number is required"
      });
    }

    console.log("🔍 Searching members collection for:", email || registerNo);

    const user = await User.findOne(query);

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
    const emailId = user.basic?.email_id || "";
    const mobile = user.contact_details?.mobile || "Not Provided";
    const registerNoValue = user.basic?.register_no || "";
    const dateOfBirth = user.basic?.dateofbirth || "";

    let batch = "Unknown";
    let branch = "Unknown";
    let graduationYear = null;
    let isCurrentlyStudying = false;
    let currentYear = new Date().getFullYear();

    if (label) {
      const parts = label.split(",");
      if (parts.length >= 2) {
        // Extract year (e.g., "BE 2028" -> "2028")
        const yearPart = parts[0].trim();
        const yearMatch = yearPart.match(/\d{4}/);
        if (yearMatch) {
          graduationYear = parseInt(yearMatch[0]);
          batch = yearMatch[0];
          isCurrentlyStudying = graduationYear >= currentYear;
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