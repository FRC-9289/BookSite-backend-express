const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  room: { type: String, required: true, unique: true },
  students: { type: [String], default: [] }
});

module.exports = mongoose.model('Room', roomSchema);