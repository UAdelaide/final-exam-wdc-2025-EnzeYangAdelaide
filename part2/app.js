const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;

// app.js



app.use(cors());
app.use(express.json());

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: '你的数据库用户名',
  password: '你的数据库密码',
  database: 'DogWalkService'
};

// 登录接口
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const conn = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await conn.execute(
      'SELECT * FROM Users WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      return res.status(400).json({ message: 'User not found.' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ message: 'Incorrect password.' });
    }
    // 不返回密码哈希
    res.json({
      user_id: user.user_id,
      username: user.username,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  } finally {
    await conn.end();
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});