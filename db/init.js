const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create separate databases for secure and insecure versions
const dbPath = process.env.INSECURE ? 
    path.join(__dirname, 'gym.insecure.db') : 
    path.join(__dirname, 'gym.db');

const db = new sqlite3.Database(dbPath);

// Initialize database with tables and test data
db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT,
        role TEXT
    )`);

    // Create trainers table
    db.run(`CREATE TABLE IF NOT EXISTS trainers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        specialization TEXT,
        availability TEXT
    )`);

    // Create appointments table
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        trainer_id INTEGER,
        appointment_date TEXT,
        status TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(trainer_id) REFERENCES trainers(id)
    )`);

    // Create subscriptions table
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        plan_type TEXT,
        price REAL,
        start_date TEXT,
        end_date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Insert admin user if not exists
    const adminUser = {
        username: 'admin',
        email: 'admin@gym.com',
        password: 'admin123',
        role: 'admin'
    };

    db.run(`INSERT OR REPLACE INTO users (username, email, password, role) 
            VALUES (?, ?, ?, ?)`,
        [adminUser.username, adminUser.email, adminUser.password, adminUser.role]
    );

    // Insert test member if not exists
    const testMember = {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'member'
    };

    db.run(`INSERT OR REPLACE INTO users (username, email, password, role)
            VALUES (?, ?, ?, ?)`,
        [testMember.username, testMember.email, testMember.password, testMember.role]
    );

    // Insert test trainers
    const testTrainers = [
        { name: 'Mike Johnson', specialization: 'Weight Training', availability: 'Mon-Fri' },
        { name: 'Sarah Smith', specialization: 'Yoga', availability: 'Tue-Sat' },
        { name: 'Tom Wilson', specialization: 'Cardio', availability: 'Wed-Sun' }
    ];

    testTrainers.forEach(trainer => {
        db.run(`INSERT OR REPLACE INTO trainers (name, specialization, availability)
                VALUES (?, ?, ?)`,
            [trainer.name, trainer.specialization, trainer.availability]
        );
    });

    console.log('Database initialized with test data');
});

module.exports = db;
