const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const remindersRoute = require('./routes/reminders')
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.get('/ping', (req, res) => {
  res.send('pong');
});
app.use('/api/reminders',remindersRoute);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

console.log("📦 Booting up Express server...");
