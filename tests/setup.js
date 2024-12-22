const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const http = require('http');

// Use test database
const TEST_DB_PATH = path.join(__dirname, '..', 'test.db');

// Keep track of database connection
let db = null;

// Function to check if port is in use
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = http.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

async function setup() {
    try {
        // Check if port 3001 is in use
        const portInUse = await isPortInUse(3001);
        if (portInUse) {
            console.warn('Warning: Port 3001 is already in use. Make sure no other instance of the app is running.');
        }

        // Create or reuse database connection
        if (!db) {
            db = new sqlite3.Database(TEST_DB_PATH);
        }

        // Reset database by dropping and recreating tables
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                // Drop existing tables if they exist
                db.run('DROP TABLE IF EXISTS appointments');
                db.run('DROP TABLE IF EXISTS users');
                db.run('DROP TABLE IF EXISTS trainers');

                // Users table
                db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE,
                    email TEXT UNIQUE,
                    password TEXT,
                    role TEXT
                )`);

                // Trainers table
                db.run(`CREATE TABLE IF NOT EXISTS trainers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    specialization TEXT,
                    availability TEXT
                )`);

                // Appointments table
                db.run(`CREATE TABLE IF NOT EXISTS appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    trainer_id INTEGER,
                    appointment_date TEXT,
                    status TEXT,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(trainer_id) REFERENCES trainers(id)
                )`);

                // Create test user
                const hashedPassword = bcrypt.hashSync('Password123!', 10);
                db.run(
                    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    ['testuser', 'test@example.com', hashedPassword, 'member'],
                    function(err) {
                        if (err) {
                            console.error('Error creating test user:', err);
                            reject(err);
                        } else {
                            console.log('Test user created successfully');
                            resolve();
                        }
                    }
                );
            });
        });
    } catch (error) {
        console.error('Setup error:', error);
        throw error;
    }
}

async function cleanup() {
    try {
        if (db) {
            // Just clear the tables instead of closing the connection
            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run('DROP TABLE IF EXISTS appointments');
                    db.run('DROP TABLE IF EXISTS users');
                    db.run('DROP TABLE IF EXISTS trainers', function(err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
        }
    } catch (error) {
        console.error('Cleanup error:', error);
        throw error;
    }
}

// Ensure cleanup on process exit
process.on('exit', () => {
    if (db) {
        try {
            db.close();
        } catch (error) {
            console.warn('Error closing database on exit:', error.message);
        }
    }
});

module.exports = { setup, cleanup };
