const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('gym.db');

// VULNERABILITY: No proper authentication check
router.use((req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
});

// VULNERABILITY: SQL Injection in dashboard
router.get('/dashboard', (req, res) => {
    const searchTerm = req.query.search || '';
    const query = `SELECT * FROM users WHERE username LIKE '%${searchTerm}%'`;
    
    db.all(query, [], (err, members) => {
        if (err) {
            console.error(err);
            members = [];
        }
        
        db.all('SELECT * FROM trainers', [], (err, trainers) => {
            if (err) {
                console.error(err);
                trainers = [];
            }
            
            // VULNERABILITY: XSS through unescaped message
            const message = req.query.message || '';
            res.render('admin/dashboard.insecure', { 
                members, 
                trainers,
                message,
                user: req.session.user 
            });
        });
    });
});

// VULNERABILITY: SQL Injection in delete
router.post('/delete-member/:id', (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM users WHERE id = ${id}`;
    db.run(query, (err) => {
        if (err) {
            res.redirect('/admin/dashboard?message=Error: ' + err.message);
        } else {
            res.redirect('/admin/dashboard?message=Member deleted');
        }
    });
});

// VULNERABILITY: SQL Injection in add trainer
router.post('/add-trainer', (req, res) => {
    const { name, specialization } = req.body;
    const query = `INSERT INTO trainers (name, specialization) VALUES ('${name}', '${specialization}')`;
    db.run(query, (err) => {
        if (err) {
            res.redirect('/admin/dashboard?message=Error: ' + err.message);
        } else {
            res.redirect('/admin/dashboard?message=Trainer added');
        }
    });
});

module.exports = router;
