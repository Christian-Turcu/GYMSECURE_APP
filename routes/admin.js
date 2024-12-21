const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('gym.db');
const bcrypt = require('bcrypt');
const logger = console; // Assuming console is used for logging

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/?error=' + encodeURIComponent('Access denied. Please login as admin.'));
    }
    next();
};

// Admin dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        // Get all members with their subscription status
        const members = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    users.*,
                    CASE 
                        WHEN s.status = 'active' AND s.end_date >= date('now') THEN 'Active'
                        WHEN s.status = 'active' AND s.end_date < date('now') THEN 'Expired'
                        ELSE 'No Subscription'
                    END as subscription_status,
                    s.end_date as subscription_end
                FROM users 
                LEFT JOIN (
                    SELECT user_id, status, end_date
                    FROM subscriptions
                    WHERE (user_id, start_date) IN (
                        SELECT user_id, MAX(start_date)
                        FROM subscriptions
                        GROUP BY user_id
                    )
                ) s ON users.id = s.user_id
                WHERE users.role = 'member'
            `, (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });

        // Get all trainers
        const trainers = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM users WHERE role = "trainer"', (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });

        res.render('admin/dashboard', { 
            user: req.session.user,
            members: members,
            trainers: trainers
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.redirect('/?error=' + encodeURIComponent('Error loading dashboard'));
    }
});

// Admin login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ? AND role = "admin"', [username], (err, user) => {
        if (err) {
            logger.error('Database error during admin login:', { error: err.message, username });
            return res.redirect('/?error=' + encodeURIComponent('Login failed'));
        }
        
        if (!user) {
            logger.warn('Failed admin login attempt:', { username, reason: 'User not found' });
            return res.redirect('/?error=' + encodeURIComponent('Invalid credentials'));
        }

        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                logger.error('Password comparison error:', { error: err.message, username });
                return res.redirect('/?error=' + encodeURIComponent('Login failed'));
            }

            if (!match) {
                logger.warn('Failed admin login attempt:', { username, reason: 'Invalid password' });
                return res.redirect('/?error=' + encodeURIComponent('Invalid credentials'));
            }

            req.session.user = { id: user.id, username: user.username, role: 'admin' };
            logger.info('Successful admin login:', { username });
            res.redirect('/admin/dashboard');
        });
    });
});

// Delete member
router.post('/delete-member', isAdmin, async (req, res) => {
    const { memberId } = req.body;
    console.log('Attempting to delete member with ID:', memberId);

    try {
        // Check if member exists
        const member = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ? AND role = ?', [memberId, 'member'], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!member) {
            console.log('Member not found');
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Member not found'));
        }

        console.log('Found member:', member);

        // Start transaction
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    console.error('Transaction start error:', err);
                    reject(err);
                }
                resolve();
            });
        });

        // Delete member's appointments
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM appointments WHERE user_id = ?', [memberId], (err) => {
                if (err) {
                    console.error('Delete appointments error:', err);
                    reject(err);
                }
                console.log('Deleted appointments for member:', memberId);
                resolve();
            });
        });

        // Delete member's subscriptions
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM subscriptions WHERE user_id = ?', [memberId], (err) => {
                if (err) {
                    console.error('Delete subscriptions error:', err);
                    reject(err);
                }
                console.log('Deleted subscriptions for member:', memberId);
                resolve();
            });
        });

        // Delete user account
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM users WHERE id = ? AND role = ?', [memberId, 'member'], (err) => {
                if (err) {
                    console.error('Delete user error:', err);
                    reject(err);
                }
                console.log('Deleted user account for member:', memberId);
                resolve();
            });
        });

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Transaction commit error:', err);
                    reject(err);
                }
                console.log('Transaction committed successfully');
                resolve();
            });
        });

        console.log('Member deletion completed successfully');
        res.redirect('/admin/dashboard?success=' + encodeURIComponent('Member deleted successfully'));
    } catch (error) {
        console.error('Error in member deletion:', error);
        
        // Rollback on error
        await new Promise((resolve) => {
            db.run('ROLLBACK', (err) => {
                if (err) console.error('Rollback error:', err);
                resolve();
            });
        });

        res.redirect('/admin/dashboard?error=' + encodeURIComponent('Error deleting member'));
    }
});

// Create trainer
router.post('/trainers/create', isAdmin, async (req, res) => {
    const { username, email, password, specialization } = req.body;

    try {
        // Check if username or email already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, email],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (existingUser) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Username or email already exists'));
        }

        // Start transaction
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        // Create user account
        const result = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [username, email, password, 'trainer'],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });

        // Add trainer specialization
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO trainers (id, name, specialization) VALUES (?, ?, ?)',
                [result, username, specialization],
                (err) => {
                    if (err) reject(err);
                    resolve();
                }
            );
        });

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        res.redirect('/admin/dashboard?success=' + encodeURIComponent('Trainer created successfully'));
    } catch (error) {
        // Rollback on error
        await new Promise((resolve) => {
            db.run('ROLLBACK', () => resolve());
        });
        console.error('Error creating trainer:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent('Error creating trainer'));
    }
});

// Delete trainer
router.post('/trainers/delete', isAdmin, async (req, res) => {
    const { trainerId } = req.body;

    try {
        // Start transaction
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        // Delete trainer's appointments
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM appointments WHERE trainer_id = ?', [trainerId], (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        // Delete from trainers table
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM trainers WHERE id = ?', [trainerId], (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        // Delete user account
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM users WHERE id = ? AND role = "trainer"', [trainerId], (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        res.redirect('/admin/dashboard');
    } catch (error) {
        // Rollback on error
        await new Promise((resolve) => {
            db.run('ROLLBACK', () => resolve());
        });
        console.error('Error deleting trainer:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent('Error deleting trainer'));
    }
});

module.exports = router;
