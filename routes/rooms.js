import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getAllUnfilledRooms, getStudentByRoom } from '../controllers/submissions/rooms/rooms.js';

const router = Router();

router.get('/getopenrooms', authMiddleware, getAllUnfilledRooms);
router.get('/getroom', authMiddleware, getStudentByRoom);

export default router;