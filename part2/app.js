const express = require('express');
const path = require('path');
const session = require('express-session');

require('dotenv').config();

const app = express();



app.use(session({//session created
  secret: 'mysecret',
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
const dogsRouter = require('./routes/dogRoutes');//add dogroutes

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dogs', dogsRouter);//follow above


// Export the app instead of listening here
module.exports = app;