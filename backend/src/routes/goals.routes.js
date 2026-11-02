import express from 'express';
import {
  listDailyGoals,
  createDailyGoal,
  updateDailyGoal,
  deleteDailyGoal,
  listMonthlyGoals,
  createMonthlyGoal,
  updateMonthlyGoal,
  deleteMonthlyGoal,
  listDreams,
  createDream,
  updateDream,
  deleteDream
} from '../controllers/goals.controller.js';

const router = express.Router();

router.get('/daily', listDailyGoals);
router.post('/daily', createDailyGoal);
router.put('/daily/:id', updateDailyGoal);
router.delete('/daily/:id', deleteDailyGoal);

router.get('/monthly', listMonthlyGoals);
router.post('/monthly', createMonthlyGoal);
router.put('/monthly/:id', updateMonthlyGoal);
router.delete('/monthly/:id', deleteMonthlyGoal);

router.get('/dreams', listDreams);
router.post('/dreams', createDream);
router.put('/dreams/:id', updateDream);
router.delete('/dreams/:id', deleteDream);

export default router;
