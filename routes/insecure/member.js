const express = require('express');
const router = express.Router();
const db = require('../../db/init');
const qr = require('qrcode');

// VULNERABILITY: No session check middleware
// VULNERABILITY: SQL Injection in all queries
// VULNERABILITY: No input validation
// VULNERABILITY: No CSRF protection
// VULNERABILITY: IDOR vulnerabilities
// VULNERABILITY: Information disclosure

router.get('/dashboard', (req, res) => {
    // VULNERABILITY: No session check
    const userId = req.query.user_id || req.session.userId;

    // VULNERABILITY: SQL Injection
    const userQuery = `SELECT * FROM users WHERE id = ${userId}`;
    const subscriptionQuery = `SELECT * FROM subscriptions WHERE user_id = ${userId}`;
    const appointmentsQuery = `
        SELECT a.*, t.name as trainer_name 
        FROM appointments a 
        JOIN trainers t ON a.trainer_id = t.id 
        WHERE a.user_id = ${userId}
    `;
    const trainersQuery = 'SELECT * FROM trainers';

    // VULNERABILITY: No error handling
    db.get(userQuery, (err, user) => {
        if (user) {
            db.get(subscriptionQuery, (err, subscription) => {
                db.all(appointmentsQuery, (err, appointments) => {
                    db.all(trainersQuery, (err, trainers) => {
                        // VULNERABILITY: Generate QR with user data
                        const userData = JSON.stringify({
                            id: user.id,
                            username: user.username,
                            subscription: subscription
                        });
                        
                        qr.toDataURL(userData, (err, qrCode) => {
                            res.render('insecure/member/dashboard', {
                                user,
                                subscription,
                                appointments,
                                trainers,
                                qrCode,
                                error: req.query.error,
                                success: req.query.success
                            });
                        });
                    });
                });
            });
        } else {
            res.redirect('/login');
        }
    });
});

router.get('/subscribe', (req, res) => {
    // VULNERABILITY: No session check
    const userId = req.query.user_id || req.session.userId;
    const planType = req.query.plan_type;
    const price = req.query.price; // VULNERABILITY: Price can be manipulated

    // VULNERABILITY: SQL Injection
    const endDate = planType === 'yearly' ? 'datetime("now", "+1 year")' : 'datetime("now", "+1 month")';
    const query = `
        INSERT INTO subscriptions (user_id, plan_type, price, start_date, end_date)
        VALUES (${userId}, '${planType}', ${price}, datetime('now'), ${endDate})
    `;

    db.run(query, (err) => {
        if (err) {
            res.redirect('/member/dashboard?error=' + err.message);
        } else {
            res.redirect('/member/dashboard?success=Subscription successful!');
        }
    });
});

router.get('/book-appointment', (req, res) => {
    // VULNERABILITY: No session check
    const userId = req.query.user_id || req.session.userId;
    const trainerId = req.query.trainer_id;
    const appointmentDate = req.query.appointment_date;

    // VULNERABILITY: SQL Injection
    const query = `
        INSERT INTO appointments (user_id, trainer_id, appointment_date, status)
        VALUES (${userId}, ${trainerId}, '${appointmentDate}', 'scheduled')
    `;

    db.run(query, (err) => {
        if (err) {
            res.redirect('/member/dashboard?error=' + err.message);
        } else {
            res.redirect('/member/dashboard?success=Appointment booked successfully!');
        }
    });
});

router.get('/cancel-appointment', (req, res) => {
    // VULNERABILITY: IDOR - No ownership check
    const appointmentId = req.query.id;

    // VULNERABILITY: SQL Injection
    const query = `UPDATE appointments SET status = 'cancelled' WHERE id = ${appointmentId}`;

    db.run(query, (err) => {
        if (err) {
            res.redirect('/member/dashboard?error=' + err.message);
        } else {
            res.redirect('/member/dashboard?success=Appointment cancelled successfully!');
        }
    });
});

// VULNERABILITY: Information disclosure endpoint
router.get('/user-info', (req, res) => {
    const userId = req.query.id;
    const query = `SELECT * FROM users WHERE id = ${userId}`;
    
    db.get(query, (err, user) => {
        res.json(user); // Sends all user data including sensitive information
    });
});

module.exports = router;
