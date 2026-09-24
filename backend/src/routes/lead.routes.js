import express from 'express';
import {
  getLeads,
  getAllLeads,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  getNicheStats
} from '../controllers/lead.controller.js';

const router = express.Router();

router.get('/stats', getLeadStats);
router.get('/niche-stats', getNicheStats);
router.get('/all', getAllLeads);
router.get('/', getLeads);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;
