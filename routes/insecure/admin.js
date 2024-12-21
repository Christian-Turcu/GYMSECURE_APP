const express = require('express');
const router = express.Router();
const db = require('../../db/init');

// VULNERABILITY: No authentication middleware

// Admin Dashboard
router.get('/dashboard', (req, res) => {
    // VULNERABILITY: No role check
    const userId = req.session.userId;
    if (!userId) {
        return res.redirect('/login');
    }

    // VULNERABILITY: SQL Injection
    const userQuery = `SELECT * FROM users WHERE id = ${userId}`;
    const allUsersQuery = `
        SELECT u.*, 
            CASE WHEN s.id IS NOT NULL AND datetime(s.end_date) > datetime('now') 
            THEN 'active' ELSE 'inactive' END as subscription_status
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
    `;
    const trainersQuery = 'SELECT * FROM trainers';

    db.get(userQuery, (err, user) => {
        if (err || !user) {
            return res.redirect('/login');
        }

        // VULNERABILITY: No role verification
        db.all(allUsersQuery, (err, users) => {
            if (err) {
                return res.render('insecure/admin/dashboard', {
                    user,
                    users: [],
                    trainers: [],
                    error: err.message
                });
            }

            db.all(trainersQuery, (err, trainers) => {
                res.render('insecure/admin/dashboard', {
                    user,
                    users,
                    trainers: trainers || [],
                    error: err ? err.message : null
                });
            });
        });
    });
});

// Add User
router.get('/add-user', (req, res) => {
    // VULNERABILITY: No role check, SQL Injection
    const { username, email, password, role } = req.query;
    const query = `
        INSERT INTO users (username, email, password, role)
        VALUES ('${username}', '${email}', '${password}', '${role}')
    `;

    db.run(query, (err) => {
        if (err) {
            return res.redirect('/admin/dashboard?error=' + err.message);
        }
        res.redirect('/admin/dashboard?success=User added successfully');
    });
});

// Delete User
router.get('/delete-user', (req, res) => {
    // VULNERABILITY: IDOR, SQL Injection
    const userId = req.query.id;
    const query = `DELETE FROM users WHERE id = ${userId}`;

    db.run(query, (err) => {
        if (err) {
            return res.redirect('/admin/dashboard?error=' + err.message);
        }
        res.redirect('/admin/dashboard?success=User deleted successfully');
    });
});

// Add Trainer
router.get('/add-trainer', (req, res) => {
    // VULNERABILITY: No role check, SQL Injection
    const { username, email, password, specialization } = req.query;
    const query = `
        INSERT INTO trainers (name, email, specialization)
        VALUES ('${username}', '${email}', '${specialization}')
    `;

    db.run(query, (err) => {
        if (err) {
            return res.redirect('/admin/dashboard?error=' + err.message);
        }
        res.redirect('/admin/dashboard?success=Trainer added successfully');
    });
});

// Delete Trainer
router.get('/delete-trainer', (req, res) => {
    // VULNERABILITY: IDOR, SQL Injection
    const trainerId = req.query.id;
    const query = `DELETE FROM trainers WHERE id = ${trainerId}`;

    db.run(query, (err) => {
        if (err) {
            return res.redirect('/admin/dashboard?error=' + err.message);
        }
        res.redirect('/admin/dashboard?success=Trainer deleted successfully');
    });
});

module.exports = router;
