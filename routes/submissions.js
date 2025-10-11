import express from 'express';
import Submission from '../models/Submission.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// GET /submissions?search=&status=
router.get('/', async (req, res) => {
  const { search = '', status = 'all' } = req.query;
  const query = {};
  if (status !== 'all') query.status = status;

  if (search) {
    query.$or = [
      { studentId: { $regex: search, $options: 'i' } },
      { studentName: { $regex: search, $options: 'i' } },
      { studentEmail: { $regex: search, $options: 'i' } },
    ];
  }

  const submissions = await Submission.find(query).sort({ createdAt: -1 });
  res.json(submissions);
});

// POST /submissions
router.post('/', async (req, res) => {
  const { studentId, studentName, studentEmail } = req.body;
  const newSubmission = new Submission({ studentId, studentName, studentEmail, status: 'pending' });
  await newSubmission.save();
  res.json(newSubmission);
});

// PATCH /submissions/:id
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const updated = await Submission.findByIdAndUpdate(id, { status }, { new: true });
  if (!updated) return res.status(404).json({ error: 'Submission not found' });

  // Send approval email if approved
  if (status === 'approved') {
    await sendEmail({
      to: updated.studentEmail,
      subject: 'Village Robotics Signup Approved',
      text: `Hello ${updated.studentName},\n\nYour signup has been approved! Welcome aboard!`,
    });
  }

  res.json(updated);
});

export default router;