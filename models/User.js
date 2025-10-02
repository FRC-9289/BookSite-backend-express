const mongoose = require('mongoose');

// Define the schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: { 
    type: String,
    required: true,
    unique: true 
  },
  approved: {
    type: Boolean,
    default: false // all users by default start as not approved
  }
});

module.exports = mongoose.model('User', userSchema);