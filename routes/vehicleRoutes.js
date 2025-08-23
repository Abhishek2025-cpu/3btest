import express from "express";
import { addVehicle, getVehicles, deleteVehicle } from "../controllar/vehicleController";

const router = express.Router();

router.post("/add", addVehicle);       // Add new vehicle
router.get("/get", getVehicles);       // Get all vehicles
router.delete("/delete/:id", deleteVehicle); // Delete vehicle by ID

export default router;
