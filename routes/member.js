const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const db = new sqlite3.Database('gym.db');

// Middleware to check if user is member
const isMember = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/?error=' + encodeURIComponent('Please login first'));
    }
    if (req.session.user.role !== 'member') {
        return res.redirect('/?error=' + encodeURIComponent('Access denied'));
    }
    next();
};

// Member dashboard
router.get('/dashboard', isMember, async (req, res) => {
    try {
        // Get member's subscription
        const subscription = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM subscriptions WHERE user_id = ? AND status = ? ORDER BY start_date DESC LIMIT 1',
                [req.session.user.id, 'active'],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        // Get available trainers
        const trainers = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM trainers', (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });

        // Get member's appointments
        const appointments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT appointments.*, trainers.name as trainer_name 
                FROM appointments 
                JOIN trainers ON appointments.trainer_id = trainers.id 
                WHERE appointments.user_id = ? 
                ORDER BY appointment_date DESC`,
                [req.session.user.id],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });

        // Generate QR code if subscription exists
        let qrCode = null;
        if (subscription) {
            const qrData = {
                memberId: req.session.user.id,
                username: req.session.user.username,
                subscriptionId: subscription.id,
                validUntil: subscription.end_date
            };
            qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
        }

        res.render('member/dashboard', {
            user: req.session.user,
            subscription,
            trainers,
            appointments,
            qrCode
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Subscribe to a plan
router.post('/subscribe', isMember, (req, res) => {
    const { plan_type } = req.body;
    const start_date = new Date();
    const end_date = new Date();
    end_date.setMonth(end_date.getMonth() + (plan_type === 'monthly' ? 1 : 12));

    db.run(
        'INSERT INTO subscriptions (user_id, plan_type, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
        [req.session.user.id, plan_type, start_date.toISOString(), end_date.toISOString(), 'active'],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to create subscription' });
            }
            res.redirect('/member/dashboard');
        }
    );
});

// Book appointment
router.post('/book-appointment', isMember, async (req, res) => {
    const { trainer_id, appointment_date } = req.body;

    try {
        // Check for active subscription
        const subscription = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM subscriptions 
                WHERE user_id = ? 
                AND status = 'active' 
                AND end_date >= date('now')
                ORDER BY start_date DESC 
                LIMIT 1`,
                [req.session.user.id],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (!subscription) {
            return res.redirect('/member/dashboard?error=' + encodeURIComponent('You need an active subscription to book training sessions'));
        }

        // Book the appointment
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO appointments (user_id, trainer_id, appointment_date, status) VALUES (?, ?, ?, ?)',
                [req.session.user.id, trainer_id, appointment_date, 'scheduled'],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });

        res.redirect('/member/dashboard?success=' + encodeURIComponent('Training session booked successfully'));
    } catch (error) {
        console.error('Booking error:', error);
        res.redirect('/member/dashboard?error=' + encodeURIComponent('Failed to book training session'));
    }
});

// Cancel appointment
router.post('/cancel-appointment/:id', isMember, (req, res) => {
    const appointmentId = req.params.id;

    db.run(
        'UPDATE appointments SET status = ? WHERE id = ? AND user_id = ?',
        ['cancelled', appointmentId, req.session.user.id],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to cancel appointment' });
            }
            res.redirect('/member/dashboard');
        }
    );
});

module.exports = router;
