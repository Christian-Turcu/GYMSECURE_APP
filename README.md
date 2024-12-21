# Gym Management Application

A demonstration of secure vs insecure web application implementations for managing gym memberships, trainers, and appointments.

## Features

### Member 
- Registration and login
- View and update profile
- Book appointments with trainers
- View subscription status
- Access QR code for gym entry

### Admin 
- Member management (add/remove/view)
- Trainer management
- View active/inactive members
- Monitor subscription status
- Access dashboard statistics

### Trainer 
- View appointments
- Manage schedule
- Update profile
- View member details

## Secure vs Insecure Versions

### Secure Version
- SQL injection protection
- XSS prevention
- CSRF tokens
- Password hashing
- Proper access controls
- Security headers
- Input validation

### Insecure Version 

Demonstrates common vulnerabilities

- You can login as Name: admin Pass: admin123
- you can also login as Name: admin'-- Pass: anything


## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Initialize database:
   ```bash
   node db/init.js
   ```

3. Start secure server:
   ```bash
   node app.js
   ```

4. Start insecure server:
   ```bash
   node app.insecure.js
   ```

## Test Accounts

### Admin
- Username: admin
- Password: admin123

### Member
Username: john_doe
Email: johndoe@gmail.com
Password: John@2024

Username: emily_smith
Email: emilysmith@gmail.com
Password: Emily#123

Username: michael_jones
Email: michaeljones@gmail.com
Password: Mike$5678

Username: sarah_brown
Email: sarahbrown@gmail.com
Password: Sarah@8901

Username: david_clark
Email: davidclark@gmail.com
Password: David!2345

Username: olivia_davis
Email: oliviadavis@gmail.com
Password: Olivia@567

Username: daniel_martin
Email: danielmartin@gmail.com
Password: Daniel#789

Username: sophia_harris
Email: sophiaharris@gmail.com
Password: Sophia@1010

Username: james_white
Email: jameswhite@gmail.com
Password: James!2023

Username: ava_johnson
Email: avajohnson@gmail.com
Password: Ava$3030

### Trainer
- James Wilson (Boxing)
- Email: james.wilson@gym.com
- Password: Boxing2024!

- Sarah Johnson (Yoga & Meditation)
- Email: sarah.johnson@gym.com
- Password: Yoga2024!

- Michael Chen (Strength Training)
- Email: michael.chen@gym.com
- Password: Strength2024!

- Elena Rodriguez (CrossFit)
- Email: elena.rodriguez@gym.com
- Password: CrossFit2024!

- David Smith (Cardio & HIIT)
- Email: david.smith@gym.com
- Password: Cardio2024!

- Lisa Anderson (Nutrition & Wellness)
- Email: lisa.anderson@gym.com
- Password: Nutrition2024!

- Marcus Brown (Personal Training)
- Email: marcus.brown@gym.com
- Password: Personal2024!

## Technologies Used
- Node.js & Express
- SQLite3 Database
- EJS Templates
- Bootstrap 5
- Security Packages (bcrypt, helmet)

## Author
Created by Christian
