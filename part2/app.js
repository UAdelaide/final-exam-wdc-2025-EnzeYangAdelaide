const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
const dogsRouter = require('./routes/dogRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dogRou', dogsRouter);


// Export the app instead of listening here
module.exports = app;