import Vehicle from "../models/Vehicle.js";

// Add new vehicle
exports.addVehicle = async (req, res) => {
  try {
    const { name, vehicleNumber } = req.body;

    if (!name || !vehicleNumber) {
      return res.status(400).json({ message: "Name and vehicle number are required" });
    }

    const vehicle = new Vehicle({ name, vehicleNumber });
    await vehicle.save();

    res.status(201).json({ message: "Vehicle added successfully", vehicle });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Vehicle number already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all vehicles
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete vehicle by ID
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findByIdAndDelete(id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
