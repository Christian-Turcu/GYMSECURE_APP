# Secure Gym Management Application

A comprehensive gym management system demonstrating secure and insecure implementations of web application security concepts.

## Project Overview

This project implements a gym management system with two versions:
1. Secure implementation with proper security measures
2. Insecure implementation demonstrating common vulnerabilities

### Features

- User Authentication (Members & Admins)
- Member Management
- Trainer Management
- Subscription Management
- Appointment Scheduling
- QR Code Generation for Gym Access
- Admin Dashboard with Analytics

## Security Features

### Secure Implementation
- CSRF Protection
- SQL Injection Prevention
- XSS Prevention (Reflected, DOM-based, Stored)
- Secure Session Management
- Security Headers
- Password Hashing
- Comprehensive Logging

### Insecure Implementation
Intentional vulnerabilities for educational purposes:
- SQL Injection vulnerabilities
- Cross-Site Scripting (XSS)
- Sensitive Data Exposure
- Weak Session Management
- No CSRF Protection

## Project Structure

```
SecureGYMAPP/
├── app.js                 # Secure application entry point
├── app.insecure.js       # Insecure application entry point
├── routes/
│   ├── admin.js          # Secure admin routes
│   ├── admin.insecure.js # Insecure admin routes
│   └── member.js         # Member routes
├── views/
│   ├── admin/
│   │   ├── dashboard.ejs
│   │   └── dashboard.insecure.ejs
│   ├── member/
│   │   └── dashboard.ejs
│   ├── login.ejs
│   └── login.insecure.ejs
├── utils/
│   └── logger.js         # Logging configuration
├── logs/                 # Application logs
├── public/              # Static files
└── gym.db               # SQLite database
```

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd SecureGYMAPP
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the secure version:
   ```bash
   node app.js
   ```

4. Run the insecure version:
   ```bash
   node app.insecure.js
   ```

### Default Credentials

Secure Version:
- Admin:
  - Username: admin
  - Password: admin123
  - URL: http://localhost:3000

Insecure Version:
- Admin:
  - Username: admin
  - Password: admin123
  - URL: http://localhost:3001

## Testing Security Features

See [SECURITY.md](SECURITY.md) for detailed security testing instructions.

## Git Branches

- `main` - Current stable version
- `secure` - Implementation with security features
- `insecure` - Implementation with intentional vulnerabilities

## Development Guidelines

1. Code Organization
   - Separate routes for different functionalities
   - Modular component structure
   - Clear separation of concerns

2. Security Practices
   - Input validation
   - Output encoding
   - Parameterized queries
   - Proper error handling
   - Comprehensive logging

3. Testing
   - Security vulnerability testing
   - Functionality testing
   - Error handling testing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
