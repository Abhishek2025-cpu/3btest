const Employee = require('../models/Employee'); 

const getAllRoles = async (req, res) => {
  try {
   
    const customRoles = await Employee.distinct('otherRoles');

  
    const cleanedCustomRoles = customRoles.filter(role => role && role.trim() !== '');

   
    const finalRoles = [
      'Helper', 
      'Mixture', 
      'Operator', 
      {
        Other: cleanedCustomRoles 
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