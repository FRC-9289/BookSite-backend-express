const mongoose = require('mongoose');

const student = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  room: String,
  files: [String]
});

module.exports = mongoose.model('Student', student);
//Wolfram121