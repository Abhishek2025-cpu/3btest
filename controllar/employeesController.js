const Employee = require('../models/Employee'); // Apne Employee model ka sahi path dein

const getAllRoles = async (req, res) => {
  try {
    // 1. Database se saare unique 'otherRoles' nikalna
    const customRoles = await Employee.distinct('otherRoles');

    // 2. Agar koi empty string ("") ya null aagayi ho toh usko filter out karna
    const cleanedCustomRoles = customRoles.filter(role => role && role.trim() !== '');

    // 3. Final structure tayyar karna jahan 'Other' ke andar array hoga
    const finalRoles = [
      'Helper', 
      'Mixture', 
      'Operator', 
      {
        Other: cleanedCustomRoles // DB wale saare roles is array me aayenge
      }
    ];

    // Response send karna
    res.status(200).json({
      success: true,
      message: "All roles fetched successfully",
      data: finalRoles
    });

  } catch (error) {
    console.error("Error in fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

module.exports = {
  getAllRoles
};