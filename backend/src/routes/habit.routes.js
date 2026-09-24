import express from 'express';
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getMonthData,
  toggleHabit,
  updateDailyMetric
} from '../controllers/habit.controller.js';

const router = express.Router();

router.get('/', getHabits);
router.post('/', createHabit);
router.put('/:id', updateHabit);
router.delete('/:id', deleteHabit);

router.get('/month', getMonthData);
router.post('/toggle', toggleHabit);
router.post('/metric', updateDailyMetric);

export default router;
