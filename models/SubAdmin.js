const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const subAdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      unique: true,
    },
    dob: {
      type: Date,
      required: [true, 'Date of Birth is required.'],
    },
    address: {
      type: String,
      default: '',
    },
    verificationDocument: {
      url: { type: String, required: true },
      id: { type: String, required: true },
    },
    profilePicture: {
      url: { type: String, default: '' },
      id: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    permissions: {
      type: [String],
      default: ['can_view_dashboard'],
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose middleware to hash password before saving
subAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with the hashed password in the DB
subAdminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const SubAdmin = mongoose.model('SubAdmin', subAdminSchema);
module.exports = SubAdmin;