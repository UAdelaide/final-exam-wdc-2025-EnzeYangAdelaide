const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/dogs', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT dog_id, owner_id, name, size FROM Dogs'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

router.get('/mine', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const userId = req.session.user.user_id;

  try {
    const [rows] = await db.query(
      'SELECT dog_id, owner_id, name, size FROM Dogs WHERE owner_id = ?',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});


module.exports = router;
