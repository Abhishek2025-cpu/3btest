const Employee = require('../models/Employee');
const { uploadBufferToGCS } = require('../utils/gcloud');

function generateEid(dob) {
  const date = new Date(dob);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear() + 1;
  const yearSuffix = year.toString().slice(-2);
  return `${month}${yearSuffix}`;
}

function generatePassword(name, adhar) {
  const namePart = name.slice(0, 4).toLowerCase();
  const adharPart = adhar.slice(-4);
  return `${namePart}${adharPart}`;
}
exports.createEmployee = async (req, res) => {
  try {
    const { name, mobile, role, otherRole, dob, adharNumber } = req.body;

    if (!req.file) return res.status(400).json({ error: 'Adhar image is required' });

    if (role === 'Other' && !otherRole) {
      return res.status(400).json({ error: 'Other role must be specified when role is Other' });
    }

     const existingEmployee = await Employee.findOne({ mobile });
    if (existingEmployee) {
      return res.status(400).json({ error: 'Mobile number already exists' });
    }

    const dobDate = new Date(dob);
    const eid = `${(dobDate.getMonth() + 1).toString().padStart(2, '0')}${(dobDate.getFullYear() + 1) % 100}`;
    const password = name.slice(0, 4).toLowerCase() + adharNumber.slice(-4);

    const adharImageUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'adhar-images');

    const employee = await Employee.create({
      name,
      mobile,
      role,
      otherRole: role === 'Other' ? otherRole : '',
      dob: dobDate,
      eid,
      password,
      adharNumber,
      adharImageUrl
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error('Create Employee Error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const updateData = req.body;
    if (req.file) {
      const adharImageUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'adhar-images');
      updateData.adharImageUrl = adharImageUrl;
    }
    const employee = await Employee.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { name, mobile, role, otherRole, dob, adharNumber } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    let adharImageUrl = employee.adharImageUrl;
    if (req.file) {
      adharImageUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'adhar-images');
    }

    const eid = generateEid(dob);
    const password = generatePassword(name, adharNumber);

    employee.set({
      name,
      mobile,
      role,
      otherRole: role === 'Other' ? otherRole : undefined,
      dob,
      eid,
      password,
      adharNumber,
      adharImageUrl,
    });

    await employee.save();
    res.json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};
