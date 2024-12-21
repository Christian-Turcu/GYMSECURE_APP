const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('gym.db');

async function addTestAppointments() {
    try {
        // First, clear existing appointments
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM appointments', (err) => {
                if (err) reject(err);
                resolve();
            });
        });
        console.log('Cleared existing appointments');

        // Get all trainers
        const trainers = await new Promise((resolve, reject) => {
            db.all('SELECT id, name FROM trainers', (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });

        // Get or create test members
        const members = [];
        const testMembers = [
            { username: 'John Smith', email: 'john.smith@example.com' },
            { username: 'Emma Davis', email: 'emma.davis@example.com' },
            { username: 'Alex Johnson', email: 'alex.johnson@example.com' }
        ];

        for (const member of testMembers) {
            let existingMember = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT id FROM users WHERE email = ?',
                    [member.email],
                    (err, row) => {
                        if (err) reject(err);
                        resolve(row);
                    }
                );
            });

            if (!existingMember) {
                const result = await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                        [member.username, member.email, 'hashedpassword', 'member'],
                        function(err) {
                            if (err) reject(err);
                            resolve(this.lastID);
                        }
                    );
                });
                members.push({ id: result, ...member });
                console.log(`Created member: ${member.username}`);
            } else {
                members.push({ id: existingMember.id, ...member });
            }
        }

        // Create appointments for each trainer
        const now = new Date();
        for (const trainer of trainers) {
            // Create 3 upcoming appointments
            for (let i = 1; i <= 3; i++) {
                const date = new Date(now.getTime() + (i * 24 * 60 * 60 * 1000));
                const member = members[Math.floor(Math.random() * members.length)];
                
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO appointments (user_id, trainer_id, appointment_date, status) VALUES (?, ?, ?, ?)',
                        [member.id, trainer.id, date.toISOString(), 'scheduled'],
                        (err) => {
                            if (err) reject(err);
                            resolve();
                        }
                    );
                });
                console.log(`Added upcoming appointment for ${trainer.name} with ${member.username} on ${date.toISOString()}`);
            }

            // Create 2 past appointments
            for (let i = 1; i <= 2; i++) {
                const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
                const member = members[Math.floor(Math.random() * members.length)];
                const status = Math.random() > 0.2 ? 'completed' : 'cancelled';
                
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO appointments (user_id, trainer_id, appointment_date, status) VALUES (?, ?, ?, ?)',
                        [member.id, trainer.id, date.toISOString(), status],
                        (err) => {
                            if (err) reject(err);
                            resolve();
                        }
                    );
                });
                console.log(`Added past appointment for ${trainer.name} with ${member.username} on ${date.toISOString()}`);
            }
        }

        console.log('All test appointments added successfully!');
    } catch (error) {
        console.error('Error adding test appointments:', error);
    } finally {
        db.close();
    }
}

addTestAppointments();
