const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');

// CREATE - add a new user
router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = new User({ name, email, approved: false, revoked: false });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ - get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ - get a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE - approve a user and send email
router.patch('/:id/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.approved = true;
    user.revoked = false;
    await user.save();

    // send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your Account Has Been Approved',
      text: `Hi ${user.name},\n\nYour account has been approved! 🎉\n\n- The Team`,
    });

    res.json({ message: 'User approved and email sent', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error approving user' });
  }
});

// UPDATE - revoke a user
router.patch('/:id/revoke', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.approved = false;
    user.revoked = true;
    await user.save();

    res.json({ message: 'User revoked', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error revoking user' });
  }
});

// DELETE - delete a user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;