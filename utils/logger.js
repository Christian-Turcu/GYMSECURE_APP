const winston = require('winston');
const path = require('path');

// Custom format for detailed logging
const customFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.metadata({ fillWith: ['timestamp', 'level', 'message'] }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
        });
    })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
require('fs').mkdirSync(logsDir, { recursive: true });

// Create logger instance
const logger = winston.createLogger({
    level: 'info',
    format: customFormat,
    transports: [
        // Error logs
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Security logs
        new winston.transports.File({
            filename: path.join(logsDir, 'security.log'),
            level: 'warn',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        // Combined logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
        }),
        // Console output for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ],
    // Handle exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            maxsize: 5242880,
            maxFiles: 5,
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            maxsize: 5242880,
            maxFiles: 5,
        })
    ]
});

// Security event logging functions
const securityLogger = {
    logLogin: (username, success, ip) => {
        logger.warn({
            event: 'login_attempt',
            username,
            success,
            ip,
            timestamp: new Date().toISOString()
        });
    },
    logAccessAttempt: (username, resource, allowed, ip) => {
        logger.warn({
            event: 'access_attempt',
            username,
            resource,
            allowed,
            ip,
            timestamp: new Date().toISOString()
        });
    },
    logDataAccess: (username, data_type, action, ip) => {
        logger.warn({
            event: 'data_access',
            username,
            data_type,
            action,
            ip,
            timestamp: new Date().toISOString()
        });
    },
    logSecurityEvent: (event_type, details, ip) => {
        logger.warn({
            event: 'security_event',
            event_type,
            details,
            ip,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = { logger, securityLogger };
