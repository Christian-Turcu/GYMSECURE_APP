const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('gym.db');

// Middleware to check if user is trainer
const isTrainer = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'trainer') {
        return res.redirect('/?error=' + encodeURIComponent('Access denied. Please login as a trainer.'));
    }
    next();
};

// Trainer dashboard
router.get('/dashboard', isTrainer, async (req, res) => {
    try {
        console.log('Trainer ID:', req.session.user.id);

        // Get trainer profile with ID
        const trainer = await new Promise((resolve, reject) => {
            db.get(
                `SELECT trainers.*, users.email 
                FROM trainers 
                JOIN users ON trainers.user_id = users.id 
                WHERE users.id = ?`,
                [req.session.user.id],
                (err, row) => {
                    if (err) {
                        console.error('Error fetching trainer:', err);
                        reject(err);
                    }
                    console.log('Found trainer:', row);
                    if (!row) reject(new Error('Trainer not found'));
                    resolve(row);
                }
            );
        });

        // Get upcoming appointments
        const appointments = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    appointments.*,
                    users.username as member_name,
                    users.email as member_email
                FROM appointments 
                JOIN users ON appointments.user_id = users.id
                WHERE appointments.trainer_id = ? 
                AND appointments.appointment_date >= datetime('now')
                AND appointments.status = 'scheduled'
                ORDER BY appointments.appointment_date ASC`;
            
            console.log('Fetching appointments for trainer ID:', trainer.id);
            console.log('Query:', query);

            db.all(query, [trainer.id], (err, rows) => {
                if (err) {
                    console.error('Error fetching appointments:', err);
                    reject(err);
                }
                console.log('Found appointments:', rows);
                resolve(rows || []);
            });
        });

        // Get past appointments
        const pastAppointments = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    appointments.*,
                    users.username as member_name,
                    users.email as member_email
                FROM appointments 
                JOIN users ON appointments.user_id = users.id
                WHERE appointments.trainer_id = ? 
                AND (appointments.appointment_date < datetime('now') 
                     OR appointments.status = 'cancelled')
                ORDER BY appointments.appointment_date DESC
                LIMIT 10`;

            console.log('Fetching past appointments for trainer ID:', trainer.id);
            
            db.all(query, [trainer.id], (err, rows) => {
                if (err) {
                    console.error('Error fetching past appointments:', err);
                    reject(err);
                }
                console.log('Found past appointments:', rows);
                resolve(rows || []);
            });
        });

        res.render('trainer/dashboard', {
            user: req.session.user,
            trainer,
            appointments,
            pastAppointments
        });
    } catch (error) {
        console.error('Trainer dashboard error:', error);
        res.status(500).send('Error loading trainer dashboard');
    }
});

module.exports = router;
