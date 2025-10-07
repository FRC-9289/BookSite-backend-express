const mongoose = require('mongoose');

const student = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  room: String
});

const room = new mongoose.Schema({
    students: [String]
});

module.exports = mongoose.model('User', userSchema);