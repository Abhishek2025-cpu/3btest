const User = require('../models/User');

// POST /signup
// controllers/userController.js

exports.signup = async (req, res) => {
  const { name, number, email } = req.body;

  if (!name || !number || !email) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingEmail = await User.findOne({ email });
    const existingNumber = await User.findOne({ number });

    if (existingEmail || existingNumber) {
      return res.status(400).json({ message: 'User already exists with this email or number' });
    }

    let profileImage = null;
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      profileImage = `data:${mimeType};base64,${base64}`;
    }

    const newUser = new User({
      name,
      number,
      email,
      role: 'client',
      profileImage
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
};




exports.updateUser = async (req, res) => {
  const { userId } = req.params;
  const { name, number, email } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Apply updates if present
    if (name) user.name = name;
    if (number) user.number = number;
    if (email) user.email = email;


    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      user.profileImage = `data:${mimeType};base64,${base64}`;
    }

    await user.save();

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};




// POST /login
exports.login = async (req, res) => {
  const { email, number } = req.body;

  if (!email && !number) {
    return res.status(400).json({ message: 'Please provide either email or phone number to login' });
  }

  try {
    const user = await User.findOne(email ? { email } : { number });

    if (!user) {
      return res.status(404).json({ message: 'User not found with provided email or number' });
    }

    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};


exports.getUserProfiles = async (req, res) => {
  try {
    const users = await User.find().select('-__v -createdAt -updatedAt'); // optional: exclude metadata fields
    res.status(200).json({ message: 'User profiles fetched successfully', users });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user profiles', error: error.message });
  }
};

exports.getUserProfileById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-__v -createdAt -updatedAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User profile fetched successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user profile', error: error.message });
  }
};