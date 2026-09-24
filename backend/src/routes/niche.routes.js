import express from 'express';
import {
  getAllNiches,
  createNiche,
  updateNiche,
  deleteNiche,
  reorderNiches
} from '../controllers/niche.controller.js';

const router = express.Router();

router.get('/', getAllNiches);
router.post('/', createNiche);
router.put('/reorder', reorderNiches);
router.put('/:id', updateNiche);
router.delete('/:id', deleteNiche);

export default router;
