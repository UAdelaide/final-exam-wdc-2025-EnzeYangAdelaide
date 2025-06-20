const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const session = require('express-session');

app.use(session({
  secret: '',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
const dogsRouter = require('./routes/dogRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dogs', dogsRouter);


// Export the app instead of listening here
module.exports = app;