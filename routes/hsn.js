const express = require("express");
const router = express.Router();
const { addHSN, getAllHSN } = require("../controllar/hsnController");


router.post("/add", addHSN);


router.get("/get", getAllHSN);

module.exports = router;

