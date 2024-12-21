# Secure Gym Management Application

A secure web application for managing gym memberships, trainers, and appointments.

## Core Requirements Met

### Authentication & Authorization
- Secure login and registration system
- Role-based access (Admin, Trainer, Member)
- Session management
- Password hashing with bcrypt

### Member Management
- Add/Delete members
- Track active/inactive status
- QR code generation for access
- Subscription tracking

### Trainer Management
- Add/Delete trainers
- View trainer schedules
- Track trainer specializations
- Appointment management

### Security Implementation
- SQL injection protection
- Input validation
- Secure session handling
- Error handling
- Security headers (Helmet)

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   node app.js
   ```

3. Access at: http://localhost:3000

## Test Accounts

### Admin
- Username: admin
- Password: admin123

### Member
- Username: john_doe
- Password: password123

### Trainer
- Username: trainer1
- Password: trainer123

## Technologies Used
- Node.js & Express
- SQLite3 Database
- EJS Templates
- Bootstrap 5
- Security Packages (bcrypt, helmet)

## Author
Created by Christian
