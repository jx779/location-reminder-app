const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  note: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reminder', ReminderSchema);
