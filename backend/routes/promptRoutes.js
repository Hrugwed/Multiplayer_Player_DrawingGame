const express = require('express');
const promptController = require('../controllers/promptController');

const router = express.Router();

// Get random prompt
router.get('/random', promptController.getRandomPrompt);

// Get all prompts (paginated)
router.get('/', promptController.getAllPrompts);

// Create new prompt (admin)
router.post('/', promptController.createPrompt);

// Update prompt (admin)
router.put('/:id', promptController.updatePrompt);

// Delete prompt (admin)
router.delete('/:id', promptController.deletePrompt);

// Get prompt statistics
router.get('/stats', promptController.getPromptStats);

// Seed initial prompts (development only)
router.post('/seed', promptController.seedPrompts);

module.exports = router;