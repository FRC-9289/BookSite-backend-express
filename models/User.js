const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    room: String,
    required: false,
  },
  files: [
    {
      filename: String,
      mimetype: String,
      buffer: Buffer
    }
  ]
});

module.exports = mongoose.model('User', userSchema);