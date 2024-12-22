const express = require('express');
const session = require('express-session');
const path = require('path');

// Set environment variable for insecure database
process.env.INSECURE = 'true';
const db = require('./db/init');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// VULNERABILITY: Weak session configuration
app.use(session({
    secret: 'insecure-secret',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'views'),
    path.join(__dirname, 'views/insecure')
]);

// Routes
const memberRoutes = require('./routes/insecure/member');
const adminRoutes = require('./routes/insecure/admin');

// VULNERABILITY: No input validation or sanitization
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // VULNERABILITY: SQL Injection
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    
    db.get(query, (err, user) => {
        if (err) {
            return res.render('insecure/login', { error: err.message });
        }
        if (user) {
            req.session.userId = user.id;
            req.session.user = user;
            if (user.role === 'admin') {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/member/dashboard');
            }
        } else {
            res.render('insecure/login', { error: 'Invalid credentials' });
        }
    });
});

// VULNERABILITY: No password hashing, SQL Injection in registration
app.post('/register', (req, res) => {
    const { newUsername, email, newPassword } = req.body;
    
    // VULNERABILITY: SQL Injection
    const query = `
        INSERT INTO users (username, email, password, role)
        VALUES ('${newUsername}', '${email}', '${newPassword}', 'member')
    `;
    
    db.run(query, (err) => {
        if (err) {
            return res.render('insecure/login', { error: err.message });
        }
        // VULNERABILITY: Auto-login after registration without verification
        const loginQuery = `SELECT * FROM users WHERE username = '${newUsername}'`;
        db.get(loginQuery, (err, user) => {
            if (user) {
                req.session.userId = user.id;
                req.session.user = user;
                res.redirect('/member/dashboard');
            } else {
                res.render('insecure/login', { error: 'Registration successful but login failed' });
            }
        });
    });
});

app.get('/login', (req, res) => {
    res.render('insecure/login', { error: req.query.error });
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

// VULNERABILITY: No CSRF protection for logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.use('/member', memberRoutes);
app.use('/admin', adminRoutes);

// VULNERABILITY: Detailed error messages
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Error: ' + err.stack);
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Insecure server running on port ${PORT}`);
});
