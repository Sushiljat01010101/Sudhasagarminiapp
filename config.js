/**
 * Configuration file for Sudha Sagar Dairy Management System
 * This file contains environment-based configuration settings
 */

// Configuration object with environment variables and fallbacks
const CONFIG = {
    // Telegram Bot API Configuration
    // In production, these should be set as environment variables
    // and retrieved securely from the server-side
    TELEGRAM: {
        BOT_TOKEN: '8414963882:AAHAxN6adnkt5HKV1yXhpGZVpwGv3rNd2yQ',
        ADMIN_CHAT_ID: '1691680798',
        API_URL: 'https://api.telegram.org/bot'
    },
    
    // Application Settings
    APP: {
        NAME: 'Sudha Sagar Dairy',
        VERSION: '1.0.0',
        ENVIRONMENT: 'development'
    },
    
    // Form Validation Rules
    VALIDATION: {
        MOBILE: {
            PATTERN: /^[6-9]\d{9}$/,
            MIN_LENGTH: 10,
            MAX_LENGTH: 10
        },
        NAME: {
            MIN_LENGTH: 2,
            MAX_LENGTH: 50,
            PATTERN: /^[a-zA-Z\s.]+$/
        },
        QUANTITY: {
            MIN: 0.5,
            MAX: 10,
            STEP: 0.5
        }
    },
    
    // UI Configuration
    UI: {
        TOAST_DURATION: 5000, // milliseconds
        ANIMATION_DURATION: 300, // milliseconds
        DEBOUNCE_DELAY: 500 // milliseconds
    },
    
    // API Configuration
    API: {
        TIMEOUT: 10000, // milliseconds
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000 // milliseconds
    }
};

// Security warning for development environment
if (CONFIG.APP.ENVIRONMENT === 'development') {
    console.warn(
        '⚠️  SECURITY WARNING: Bot token and chat ID should be configured via environment variables in production.\n' +
        'Current configuration is for development purposes only.'
    );
}

// Export configuration for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
