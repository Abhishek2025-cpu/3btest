const SubAdmin = require("../models/SubAdmin");

const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      let user = req.user;

      if (!user) {
        const userId =
          req.headers["user-id"] ||
          req.body.userId ||
          req.body.subAdminId ||
          req.params.userId ||
          req.query.userId;

        if (!userId) {
          return res.status(401).json({
            message: "User not found in request",
          });
        }

        user = await SubAdmin.findById(userId);

        if (!user) {
          return res.status(404).json({
            message: "Invalid Admin/SubAdmin",
          });
        }

        req.user = user;
      }

      console.log("PERMISSIONS:", user.permissions);

      let hasPermission = false;

      // ✅ CASE 1: ARRAY permissions
      if (Array.isArray(user.permissions)) {
        hasPermission = user.permissions.includes(permissionKey);
      }

      // ✅ CASE 2: OBJECT permissions
      else if (typeof user.permissions === "object") {
        const permission = user.permissions?.[permissionKey];

        if (permission === true) {
          hasPermission = true;
        } else if (typeof permission === "object") {
          hasPermission = Object.values(permission).some(v => v === true);
        }
      }

      if (!hasPermission) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        message: "Server error",
      });
    }
  };
};

module.exports = { checkPermission };