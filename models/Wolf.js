const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  room: String,
  files: [String]
});

const gradeSchema = new mongoose.Schema({
  students: [studentSchema],
  rooms: [String]
});

const Student = mongoose.model('Student', studentSchema);
const Grade = mongoose.model('Grade', gradeSchema);

module.exports = { Student, Grade };
//Wolfram121