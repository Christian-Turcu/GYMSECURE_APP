const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3001; // Different port for insecure version

// Import routes
const adminRoutes = require('./routes/admin.insecure');
const memberRoutes = require('./routes/member');

// Database setup
const db = new sqlite3.Database('gym.db');

// VULNERABILITY: Weak session configuration
app.use(session({
    secret: '123456',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// VULNERABILITY: No input sanitization
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // VULNERABILITY: SQL Injection
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    
    db.get(query, (err, user) => {
        if (err) {
            return res.redirect('/?error=' + err.message);
        }
        
        if (user) {
            // VULNERABILITY: Sensitive data exposure in session
            req.session.user = user;
            
            if (user.role === 'admin') {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/member/dashboard');
            }
        } else {
            res.redirect('/?error=Invalid credentials');
        }
    });
});

// VULNERABILITY: Reflected XSS
app.get('/', (req, res) => {
    // VULNERABILITY: Unescaped error message
    const error = req.query.error;
    res.render('login.insecure', { error });
});

// Database initialization
db.serialize(() => {
    // Create announcements table for Stored XSS
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        created_at DATETIME
    )`);

    // VULNERABILITY: Plaintext password storage
    const defaultAdmin = {
        username: 'admin',
        password: 'admin123', // Plaintext password
        email: 'admin@gym.com',
        role: 'admin'
    };

    // VULNERABILITY: SQL Injection
    const adminQuery = `INSERT OR IGNORE INTO users (username, email, password, role) 
                       VALUES ('${defaultAdmin.username}', '${defaultAdmin.email}', 
                               '${defaultAdmin.password}', '${defaultAdmin.role}')`;
    
    db.run(adminQuery);
});

// Use routes
app.use('/admin', adminRoutes);
app.use('/member', memberRoutes);

app.listen(port, () => {
    console.log(`Insecure server running at http://localhost:${port}`);
});
