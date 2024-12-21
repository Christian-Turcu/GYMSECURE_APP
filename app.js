const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const csrf = require('csurf');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const winston = require('winston');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Import routes
const adminRoutes = require('./routes/admin');
const memberRoutes = require('./routes/member');

// Database setup
const db = new sqlite3.Database('gym.db');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Security headers
app.use(helmet());

// CSRF protection
app.use(csrf());

// Database initialization
db.serialize(() => {
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

    // Subscriptions table
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        plan_type TEXT,
        start_date DATE,
        end_date DATE,
        status TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Appointments table
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        trainer_id INTEGER,
        appointment_date DATETIME,
        status TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(trainer_id) REFERENCES trainers(id)
    )`);

    // Create default admin user if not exists
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
            VALUES (?, ?, ?, ?)`, 
            ['admin', 'admin@gym.com', adminPassword, 'admin']);
});

// Routes
app.get('/', (req, res) => {
    res.render('login', { csrfToken: req.csrfToken() });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            logger.error('Database error during login:', err);
            return res.redirect('/');
        }
        
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role
            };
            
            if (user.role === 'admin') {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/member/dashboard');
            }
        } else {
            res.redirect('/');
        }
    });
});

// Register route
app.post('/register', (req, res) => {
    const { newUsername, email, newPassword } = req.body;
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [newUsername, email, hashedPassword, 'member'],
        (err) => {
            if (err) {
                logger.error('Registration error:', err);
                return res.redirect('/');
            }
            res.redirect('/');
        }
    );
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Use admin routes
app.use('/admin', adminRoutes);

// Use member routes
app.use('/member', memberRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    logger.info(`Server started on port ${port}`);
});
