const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mysql = require('mysql2/promise');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    // 1. 创建数据库连接（用于初始化）
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // 改成你的MySQL root密码
      multipleStatements: true
    });

    // 2. default database
    await connection.query(`
      DROP DATABASE IF EXISTS DogWalkService;
      CREATE DATABASE DogWalkService;
      USE DogWalkService;

      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'walker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Dogs (
        dog_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        size ENUM('small', 'medium', 'large') NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      );

      CREATE TABLE IF NOT EXISTS WalkRequests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INT NOT NULL,
        requested_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      );

      CREATE TABLE IF NOT EXISTS WalkApplications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        CONSTRAINT unique_application UNIQUE (request_id, walker_id)
      );

      CREATE TABLE IF NOT EXISTS WalkRatings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        owner_id INT NOT NULL,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        comments TEXT,
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        FOREIGN KEY (owner_id) REFERENCES Users(user_id),
        CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
      );
    `);

    await connection.end();

    // 3. connect new database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // empty
      database: 'DogWalkService',
      multipleStatements: true
    });

    // 4. 插入测试数据（仅当Users表为空时）
    const [users] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (users[0].count === 0) {
      // insert users
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('david27', 'david27@example.com', 'hashed321', 'owner'),
        ('enzey', 'enzey@example.com', 'hashed654', 'walker')
      `);

      // insert dogs
      await db.execute(`
        INSERT INTO Dogs (name, size, owner_id) VALUES
        ('Max', 'medium', (SELECT user_id FROM Users WHERE username='alice123')),
        ('Bella', 'small', (SELECT user_id FROM Users WHERE username='carol123')),
        ('Charlie', 'large', (SELECT user_id FROM Users WHERE username='david27')),
        ('Lucy', 'medium', (SELECT user_id FROM Users WHERE username='carol123')),
        ('Rocky', 'small', (SELECT user_id FROM Users WHERE username='alice123'))
      `);

      // insert walk request
      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
        ((SELECT dog_id FROM Dogs WHERE name='Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name='Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        ((SELECT dog_id FROM Dogs WHERE name='Charlie'), '2025-06-11 10:00:00', 60, 'Morialta Park', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name='Lucy'), '2025-06-12 14:00:00', 30, 'Botanic Garden', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name='Rocky'), '2025-06-13 16:30:00', 20, 'Mawson Lakes', 'open')
      `);

      // insert WalkRatings，pretend walks request id 2,3，walker is bobwalker
      await db.execute(`
        INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments)
        VALUES
        (2, (SELECT user_id FROM Users WHERE username='bobwalker'), (SELECT owner_id FROM Dogs WHERE dog_id=(SELECT dog_id FROM Dogs WHERE name='Bella')), 5, 'Great walk!'),
        (3, (SELECT user_id FROM Users WHERE username='bobwalker'), (SELECT owner_id FROM Dogs WHERE dog_id=(SELECT dog_id FROM Dogs WHERE name='Charlie')), 4, 'Good job!')
      `);
    }

    console.log('Database and initial data ready!');
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

// 1. /api/dogs
app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// 2. /api/walkrequests/open
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

// 3. /api/walkers/summary
app.get('/api/walkers/summary', async (req, res) => {
  try {
    // 所有walker
    const [walkers] = await db.execute(`
      SELECT user_id, username
      FROM Users
      WHERE role = 'walker'
    `);

    const results = [];
    for (let walker of walkers) {
      // completed_walks
      const [completed] = await db.execute(`
        SELECT COUNT(*) AS completed_walks
        FROM WalkRequests wr
        JOIN WalkApplications wa ON wr.request_id = wa.request_id
        WHERE wa.walker_id = ? AND wr.status = 'completed' AND wa.status = 'accepted'
      `, [walker.user_id]);

      // ratings
      const [ratings] = await db.execute(`
        SELECT COUNT(*) AS total_ratings, AVG(rating) AS average_rating
        FROM WalkRatings
        WHERE walker_id = ?
      `, [walker.user_id]);

      results.push({
        walker_username: walker.username,
        total_ratings: ratings[0].total_ratings,
        average_rating: ratings[0].average_rating ? Number(ratings[0].average_rating) : null,
        completed_walks: completed[0].completed_walks
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
