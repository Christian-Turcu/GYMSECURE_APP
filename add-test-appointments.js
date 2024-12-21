const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('gym.db');

async function addTestAppointments() {
    try {
        // Get James Wilson's trainer ID
        const trainer = await new Promise((resolve, reject) => {
            db.get(
                'SELECT trainers.id FROM trainers JOIN users ON trainers.user_id = users.id WHERE users.email = ?',
                ['james.wilson@gym.com'],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        // Get a test member ID (create one if doesn't exist)
        let member = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM users WHERE email = ?',
                ['test.member@example.com'],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (!member) {
            // Create test member
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    ['Test Member', 'test.member@example.com', 'hashedpassword', 'member'],
                    function(err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });

            member = { id: this.lastID };
        }

        // Add some test appointments
        const appointments = [
            {
                date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
                status: 'scheduled'
            },
            {
                date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // day after tomorrow
                status: 'scheduled'
            },
            {
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
                status: 'completed'
            }
        ];

        for (const apt of appointments) {
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO appointments (user_id, trainer_id, appointment_date, status) VALUES (?, ?, ?, ?)',
                    [member.id, trainer.id, apt.date, apt.status],
                    function(err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });
            console.log(`Added appointment for ${apt.date}`);
        }

        console.log('Test appointments added successfully!');
    } catch (error) {
        console.error('Error adding test appointments:', error);
    } finally {
        db.close();
    }
}

addTestAppointments();
