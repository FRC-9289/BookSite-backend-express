import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Determine role based on email domain
    let role = 'other';
    if (email.endsWith('@s.thevillageschool.com')) {
      role = 'student';
    } else if (email.endsWith('@thevillageschool.com')) {
      role = 'admin';
    }

    // Sign a JWT
    const token = jwt.sign(
      { email, role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '7d' }
    );

    res.json({ email, name, role, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;