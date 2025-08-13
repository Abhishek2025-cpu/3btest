// middleware/maintenanceMode.js
const maintenance = require("../config/maintenance");

module.exports = (req, res, next) => {
  const allowedPaths = [
    "/api/admin/login",   // Admin login route
    "/super-api"      // Your super API endpoint
  ];

  if (maintenance.getStatus() && !allowedPaths.includes(req.path)) {
    return res.status(503).json({
      message: "API temporarily disabled for maintenance."
    });
  }

  next();
};
