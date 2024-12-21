const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('gym.db');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Set view engine
app.set('view engine', 'ejs');

// Security middleware
app.use(helmet());

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
    res.render('login', { error: req.query.error });
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if input is email or username
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, username],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (!user) {
            return res.redirect('/?error=' + encodeURIComponent('Invalid username or password'));
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.redirect('/?error=' + encodeURIComponent('Invalid username or password'));
        }

        // Set user session
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        // Redirect based on role
        switch (user.role) {
            case 'admin':
                res.redirect('/admin/dashboard');
                break;
            case 'trainer':
                res.redirect('/trainer/dashboard');
                break;
            default:
                res.redirect('/member/dashboard');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/?error=' + encodeURIComponent('An error occurred during login'));
    }
});

// Register route
app.post('/register', async (req, res) => {
    const { newUsername, email, newPassword } = req.body;

    try {
        // Check if username or email already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [newUsername, email],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (existingUser) {
            return res.redirect('/?error=' + encodeURIComponent('Username or email already exists'));
        }

        // Hash password and create user
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        
        // Insert new user with member role
        const result = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [newUsername, email, hashedPassword, 'member'],
                function(err) {
                    if (err) reject(err);
                    resolve(this);
                }
            );
        });

        // Get the newly created user
        const newUser = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE id = ?',
                [result.lastID],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        // Set session and redirect to member dashboard
        req.session.user = {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: 'member'
        };

        res.redirect('/member/dashboard');
    } catch (error) {
        console.error('Registration error:', error);
        res.redirect('/?error=' + encodeURIComponent('Registration failed'));
    }
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

// Mount routes
const adminRoutes = require('./routes/admin');
const memberRoutes = require('./routes/member');
const trainerRoutes = require('./routes/trainer');

app.use('/admin', adminRoutes);
app.use('/member', memberRoutes);
app.use('/trainer', trainerRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
