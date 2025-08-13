// middleware/maintenanceMode.js
const maintenance = require("../config/maintenance");

module.exports = (req, res, next) => {
  try {
    const allowedPaths = [
      "/api/admin/login",
      "/super-api"
    ];

    // Ensure req.path is always a string
    const currentPath = req.path || "";

    if (maintenance.getStatus() && !allowedPaths.includes(currentPath)) {
      return res.status(503).json({
        message: "API temporarily disabled for maintenance."
      });
    }

    next();
  } catch (err) {
    console.error("Maintenance middleware error:", err);
    res.status(500).json({ message: "Internal Server Error in maintenance middleware" });
  }
};
