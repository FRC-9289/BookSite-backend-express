// lib/authMiddleware.js
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables from .env

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

  if (!token || token !== process.env.BACKEND_TOKEN) {
    console.log(process.env.BACKEND_TOKEN);
    return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' } );
  }

  next();
}

module.exports = authMiddleware;
