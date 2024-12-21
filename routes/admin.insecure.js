const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('gym.db');

// INSECURE: No proper authentication check
const isAdmin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// INSECURE: Vulnerable to SQL Injection in search
router.get('/search', isAdmin, (req, res) => {
    const searchTerm = req.query.q;
    // VULNERABILITY: SQL Injection
    const query = `SELECT * FROM users WHERE username LIKE '%${searchTerm}%' OR email LIKE '%${searchTerm}%'`;
    
    db.all(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// INSECURE: Vulnerable to XSS in dashboard
router.get('/dashboard', isAdmin, (req, res) => {
    // VULNERABILITY: Stored XSS in announcements
    db.all('SELECT * FROM announcements ORDER BY created_at DESC', [], (err, announcements) => {
        if (err) {
            announcements = [];
        }

        db.get('SELECT COUNT(*) as memberCount FROM users WHERE role = ?', ['member'], (err, row) => {
            const stats = {
                memberCount: row ? row.memberCount : 0
            };
            
            db.get('SELECT COUNT(*) as trainerCount FROM trainers', (err, row) => {
                stats.trainerCount = row ? row.trainerCount : 0;
                
                db.get('SELECT COUNT(*) as activeSubscriptions FROM subscriptions WHERE status = ?', ['active'], (err, row) => {
                    stats.activeSubscriptions = row ? row.activeSubscriptions : 0;
                    
                    db.all('SELECT id, username, email FROM users WHERE role = ?', ['member'], (err, members) => {
                        db.all('SELECT * FROM trainers', (err, trainers) => {
                            // VULNERABILITY: Reflected XSS
                            const message = req.query.message || '';
                            
                            res.render('admin/dashboard.insecure', {
                                stats,
                                members,
                                trainers,
                                announcements,
                                message,
                                // VULNERABILITY: Sensitive Data Exposure
                                dbConfig: {
                                    host: 'localhost',
                                    user: 'admin',
                                    password: 'admin_password_123',
                                    database: 'gym_db'
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});

// VULNERABILITY: Stored XSS in announcements
router.post('/announcement', isAdmin, (req, res) => {
    const { title, content } = req.body;
    // VULNERABILITY: No input sanitization
    db.run(
        'INSERT INTO announcements (title, content, created_at) VALUES (?, ?, ?)',
        [title, content, new Date().toISOString()],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to create announcement' });
            }
            res.redirect('/admin/dashboard?message=Announcement+created');
        }
    );
});

// VULNERABILITY: SQL Injection in delete
router.post('/members/delete', isAdmin, (req, res) => {
    const memberId = req.body.id;
    // VULNERABILITY: SQL Injection
    const query = `DELETE FROM users WHERE id = ${memberId} AND role = 'member'`;
    
    db.run(query, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete member' });
        }
        res.redirect('/admin/dashboard');
    });
});

module.exports = router;
