const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const helmet = require('helmet');
const winston = require('winston');
const rateLimit = require('express-rate-limit');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/security.log', level: 'warn' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

// Add console logging if not in production
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

const app = express();

// Rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.redirect('/login?error=' + encodeURIComponent('Too many login attempts, please try again later'));
    }
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Set view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware with test-friendly config
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "http:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
}));

// Additional security headers
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Error:', err);
    res.status(500).render('error', { 
        error: process.env.NODE_ENV === 'production' 
            ? 'An error occurred' 
            : err.message 
    });
});

// Database configuration
const dbPath = process.env.NODE_ENV === 'test' ? 'test.db' : 'gym.db';
const db = new sqlite3.Database(dbPath);

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
    
    // Insert sample trainers
    db.run(`INSERT OR IGNORE INTO trainers (name, specialization, availability) 
            VALUES (?, ?, ?)`, 
            ['John Doe', 'Personal Training', 'Monday to Friday, 9am to 5pm']);
    db.run(`INSERT OR IGNORE INTO trainers (name, specialization, availability) 
            VALUES (?, ?, ?)`, 
            ['Jane Smith', 'Yoga', 'Monday to Friday, 9am to 5pm']);
    db.run(`INSERT OR IGNORE INTO trainers (name, specialization, availability) 
            VALUES (?, ?, ?)`, 
            ['Mike Jones', 'Pilates', 'Monday to Friday, 9am to 5pm']);
    
    // Insert sample appointments after trainers are created
    setTimeout(() => {
        console.log('Creating sample appointments for all trainers...');
        
        // Get all trainers
        db.all('SELECT t.id as trainer_id, t.name, u.id as user_id, u.email FROM trainers t JOIN users u ON t.user_id = u.id', 
            [], 
            (err, trainers) => {
                if (err || !trainers) {
                    console.error('Error getting trainers for appointments:', err);
                    return;
                }

                // First, clear existing appointments
                db.run('DELETE FROM appointments', [], (err) => {
                    if (err) {
                        console.error('Error clearing appointments:', err);
                        return;
                    }

                    // Create test members if they don't exist
                    const testMembers = [
                        { username: 'john_doe', email: 'john@gym.com', name: 'John Doe' },
                        { username: 'jane_smith', email: 'jane@gym.com', name: 'Jane Smith' },
                        { username: 'mike_jones', email: 'mike@gym.com', name: 'Mike Jones' }
                    ];

                    // Create test members
                    testMembers.forEach(member => {
                        const memberPassword = bcrypt.hashSync('member123', 10);
                        db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
                                VALUES (?, ?, ?, ?)`,
                                [member.username, member.email, memberPassword, 'member']);
                    });

                    // Wait a bit for members to be created
                    setTimeout(() => {
                        // Get all test members
                        db.all('SELECT id, email FROM users WHERE role = "member"', [], (err, members) => {
                            if (err || !members) {
                                console.error('Error getting members for appointments:', err);
                                return;
                            }

                            // For each trainer, create just 2 appointments
                            trainers.forEach((trainer, trainerIndex) => {
                                // Create only 2 appointments per trainer
                                const appointments = [
                                    {
                                        days: trainerIndex + 1, // Spread appointments across different days
                                        hour: 10, // Morning appointment
                                        status: 'scheduled'
                                    },
                                    {
                                        days: trainerIndex + 1,
                                        hour: 14, // Afternoon appointment
                                        status: 'scheduled'
                                    }
                                ];

                                appointments.forEach((appointment, index) => {
                                    // Rotate through members for different appointments
                                    const member = members[index % members.length];
                                    const appointmentDate = new Date();
                                    appointmentDate.setDate(appointmentDate.getDate() + appointment.days);
                                    appointmentDate.setHours(appointment.hour, 0, 0);

                                    db.run(`INSERT INTO appointments (user_id, trainer_id, appointment_date, status) 
                                            VALUES (?, ?, ?, ?)`,
                                            [member.id, trainer.trainer_id, appointmentDate.toISOString(), appointment.status],
                                            function(err) {
                                                if (err) {
                                                    console.error('Error creating appointment:', err);
                                                } else {
                                                    console.log(`Created ${appointment.status} appointment for trainer ${trainer.name} with member ${member.email} at ${appointmentDate}`);
                                                }
                                            });
                                });
                            });
                        });
                    }, 500);
                });
            });
    }, 1000); // Wait 1 second for trainers to be created first
});

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login', { 
        error: req.query.error,
        success: req.query.success
    });
});

// Login route
app.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        // Input validation
        if (!username || !password) {
            return res.redirect('/login?error=' + encodeURIComponent('Username and password are required'));
        }

        // Sanitize input
        const sanitizedUsername = username.replace(/[^a-zA-Z0-9@._-]/g, '');

        // Check if input is email or username
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [sanitizedUsername, sanitizedUsername],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (!user) {
            return res.redirect('/login?error=' + encodeURIComponent('Invalid username or password'));
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.redirect('/login?error=' + encodeURIComponent('Invalid username or password'));
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
        logger.error('Login error:', error);
        res.redirect('/login?error=' + encodeURIComponent('An error occurred during login'));
    }
});

// Registration route
app.post('/register', async (req, res) => {
    const { newUsername, email, newPassword } = req.body;

    try {
        // Input validation
        if (!newUsername || !email || !newPassword) {
            return res.redirect('/login?error=' + encodeURIComponent('All fields are required'));
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.redirect('/login?error=' + encodeURIComponent('Invalid email format'));
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.redirect('/login?error=' + encodeURIComponent('Password must be at least 8 characters long and contain uppercase, lowercase, number and special character'));
        }

        // Sanitize input
        const sanitizedUsername = newUsername.replace(/[^a-zA-Z0-9_-]/g, '');
        const sanitizedEmail = email.toLowerCase().trim();

        // Check if username or email already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [sanitizedUsername, sanitizedEmail],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (existingUser) {
            if (existingUser.email === sanitizedEmail) {
                return res.redirect('/login?error=' + encodeURIComponent('Email already exists'));
            }
            return res.redirect('/login?error=' + encodeURIComponent('Username already exists'));
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Insert new user
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [sanitizedUsername, sanitizedEmail, hashedPassword, 'member'],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });

        // Redirect with success message
        res.redirect('/login?success=' + encodeURIComponent('Registration successful! Please login.'));
    } catch (error) {
        logger.error('Registration error:', error);
        res.redirect('/login?error=' + encodeURIComponent('Registration failed'));
    }
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
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
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
