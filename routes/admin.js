const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('gym.db');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/login');
    }
};

// Admin dashboard
router.get('/dashboard', isAdmin, (req, res) => {
    const stats = {};
    
    // Get total members count
    db.get('SELECT COUNT(*) as memberCount FROM users WHERE role = ?', ['member'], (err, row) => {
        stats.memberCount = row ? row.memberCount : 0;
        
        // Get total trainers count
        db.get('SELECT COUNT(*) as trainerCount FROM trainers', (err, row) => {
            stats.trainerCount = row ? row.trainerCount : 0;
            
            // Get active subscriptions count
            db.get('SELECT COUNT(*) as activeSubscriptions FROM subscriptions WHERE status = ?', ['active'], (err, row) => {
                stats.activeSubscriptions = row ? row.activeSubscriptions : 0;
                
                // Get all members
                db.all('SELECT id, username, email FROM users WHERE role = ?', ['member'], (err, members) => {
                    // Get all trainers
                    db.all('SELECT * FROM trainers', (err, trainers) => {
                        res.render('admin/dashboard', {
                            stats,
                            members,
                            trainers,
                            csrfToken: req.csrfToken()
                        });
                    });
                });
            });
        });
    });
});

// Add new trainer
router.post('/trainers/add', isAdmin, (req, res) => {
    const { name, specialization, availability } = req.body;
    db.run('INSERT INTO trainers (name, specialization, availability) VALUES (?, ?, ?)',
        [name, specialization, availability],
        (err) => {
            if (err) {
                res.status(500).json({ error: 'Failed to add trainer' });
            } else {
                res.redirect('/admin/dashboard');
            }
        }
    );
});

// Delete member
router.post('/members/delete/:id', isAdmin, (req, res) => {
    const memberId = req.params.id;
    db.run('DELETE FROM users WHERE id = ? AND role = ?', [memberId, 'member'], (err) => {
        if (err) {
            res.status(500).json({ error: 'Failed to delete member' });
        } else {
            res.redirect('/admin/dashboard');
        }
    });
});

// Delete trainer
router.post('/trainers/delete/:id', isAdmin, (req, res) => {
    const trainerId = req.params.id;
    db.run('DELETE FROM trainers WHERE id = ?', [trainerId], (err) => {
        if (err) {
            res.status(500).json({ error: 'Failed to delete trainer' });
        } else {
            res.redirect('/admin/dashboard');
        }
    });
});

module.exports = router;
