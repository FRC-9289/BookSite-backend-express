import express from 'express';
import Bus from '../models/Bus.js';

const router = express.Router();

// Get all buses
router.get('/', async (req, res) => {
  const buses = await Bus.find();
  res.json(buses);
});

// Add new bus (admin)
router.post('/', async (req, res) => {
  const { name } = req.body;
  const bus = new Bus({ name, students: [] });
  await bus.save();
  res.json(bus);
});

// Join a bus (student)
router.post('/join', async (req, res) => {
  const { busId, email } = req.body;
  const bus = await Bus.findById(busId);
  if (!bus) return res.status(404).json({ error: 'Bus not found' });
  if (!bus.students.includes(email)) bus.students.push(email);
  await bus.save();
  res.json(bus);
});

// Delete a bus
router.delete('/:id', async (req, res) => {
  await Bus.findByIdAndDelete(req.params.id);
  res.json({ message: 'Bus removed' });
});

export default router;