const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('gym.db');

const trainers = [
    {
        name: 'James Wilson',
        email: 'james.wilson@gym.com',
        password: 'Boxing2024!',
        specialization: 'Boxing'
    },
    {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@gym.com',
        password: 'Yoga2024!',
        specialization: 'Yoga & Meditation'
    },
    {
        name: 'Michael Chen',
        email: 'michael.chen@gym.com',
        password: 'Strength2024!',
        specialization: 'Strength Training'
    },
    {
        name: 'Elena Rodriguez',
        email: 'elena.rodriguez@gym.com',
        password: 'CrossFit2024!',
        specialization: 'CrossFit'
    },
    {
        name: 'David Smith',
        email: 'david.smith@gym.com',
        password: 'Cardio2024!',
        specialization: 'Cardio & HIIT'
    },
    {
        name: 'Lisa Anderson',
        email: 'lisa.anderson@gym.com',
        password: 'Nutrition2024!',
        specialization: 'Nutrition & Wellness'
    },
    {
        name: 'Marcus Brown',
        email: 'marcus.brown@gym.com',
        password: 'Personal2024!',
        specialization: 'Personal Training'
    }
];

async function setupTrainers() {
    try {
        // First, clear existing trainers
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM trainers', (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        console.log('Cleared existing trainers');

        // Clear trainer user accounts
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM users WHERE role = 'trainer'", (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        console.log('Cleared existing trainer accounts');

        // Create new trainer accounts
        for (const trainer of trainers) {
            // Hash password
            const hashedPassword = await bcrypt.hash(trainer.password, 10);
            console.log(`Hashed password for ${trainer.name}`);
            
            // Create user account
            const user = await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    [trainer.name, trainer.email, hashedPassword, 'trainer'],
                    function(err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });

            console.log(`Created user account for ${trainer.name}`);

            // Create trainer profile
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO trainers (name, specialization, user_id) VALUES (?, ?, ?)',
                    [trainer.name, trainer.specialization, user],
                    function(err) {
                        if (err) reject(err);
                        resolve(this.lastID);
                    }
                );
            });

            console.log(`Created trainer profile for ${trainer.name}`);
        }
        console.log('All trainer accounts created successfully!');
    } catch (error) {
        console.error('Error creating trainer accounts:', error);
    } finally {
        db.close();
    }
}

setupTrainers();
