const express = require('express');
const router = express.Router();
const db = require('../models/db');

// 获取当前登录用户的所有狗
router.get('/mine', async (req, res) => {
  // 检查是否登录
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
