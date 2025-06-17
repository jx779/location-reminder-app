const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');

// POST /api/reminders
router.post('/', async (req, res) => {
  try {
    const newReminder = new Reminder(req.body);
    const saved = await newReminder.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reminders
router.get('/', async (req, res) => {
  try {
    const reminders = await Reminder.find();
    res.status(200).json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; // ✅ this is critical
