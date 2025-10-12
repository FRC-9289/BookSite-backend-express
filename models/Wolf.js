const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  room: String,
  files: [{
    type: String,
    match: /^[a-f\d]{24}$/i
  }]
});

const gradeSchema = new mongoose.Schema({
  grade: Number,
  students: [studentSchema],
  rooms: [String]
});

const Student = mongoose.model('Student', studentSchema);
const Grade = mongoose.model('Grade', gradeSchema, "data");

module.exports = { Student, Grade };
//Wolfram121