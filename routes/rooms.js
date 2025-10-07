import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getAllFilledRooms, getStudentByRoom } from '../controllers/submissions/rooms/rooms.js';

const router = Router();

router.get('/getrooms', authMiddleware, getAllFilledRooms);
router.get('/getroom', authMiddleware, getStudentByRoom);

export default router;