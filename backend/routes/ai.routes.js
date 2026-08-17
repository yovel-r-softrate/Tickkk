const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { auth } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   - name: AI
 *     description: Gemini AI-powered task management features
 */

/**
 * @swagger
 * /api/ai/suggest-subtasks:
 *   post:
 *     tags:
 *       - AI
 *     summary: Suggest subtasks for a task
 *     description: Uses Gemini AI to suggest actionable subtasks based on task title and description
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subtasks suggested successfully
 *       400:
 *         description: Title is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/suggest-subtasks', auth, aiController.suggestSubtasks);

/**
 * @swagger
 * /api/ai/improve-description:
 *   post:
 *     tags:
 *       - AI
 *     summary: Improve task description
 *     description: Uses Gemini AI to generate a clearer, more actionable task description
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Description improved successfully
 *       400:
 *         description: Title is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/improve-description', auth, aiController.improveDescription);

/**
 * @swagger
 * /api/ai/summarize-tasks:
 *   post:
 *     tags:
 *       - AI
 *     summary: Summarize a list of tasks
 *     description: Uses Gemini AI to provide an executive summary of the given tasks
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tasks
 *             properties:
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     priority:
 *                       type: string
 *                     completed:
 *                       type: boolean
 *                     deadline:
 *                       type: string
 *     responses:
 *       200:
 *         description: Tasks summarized successfully
 *       400:
 *         description: Tasks array is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/summarize-tasks', auth, aiController.summarizeTasks);

/**
 * @swagger
 * /api/ai/suggest-priority:
 *   post:
 *     tags:
 *       - AI
 *     summary: Suggest task priority
 *     description: Uses Gemini AI to suggest an appropriate priority level for a task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               deadline:
 *                 type: string
 *     responses:
 *       200:
 *         description: Priority suggested successfully
 *       400:
 *         description: Title is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/suggest-priority', auth, aiController.suggestPriority);

/**
 * @swagger
 * /api/ai/ask:
 *   post:
 *     tags:
 *       - AI
 *     summary: Ask the AI assistant
 *     description: Ask a project management question and get an AI-powered response
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *               context:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response generated successfully
 *       400:
 *         description: Question is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/ask', auth, aiController.askAssistant);

module.exports = router;
