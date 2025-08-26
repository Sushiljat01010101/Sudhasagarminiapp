/**
 * Sudha Sagar Dairy Management System
 * Main JavaScript file handling user interactions and Telegram Bot integration
 */

(function() {
    'use strict';

    // Application state
    const AppState = {
        currentModal: null,
        isSubmitting: false,
        formData: {},
        activeToast: null,
        requestHistory: []
    };

    // DOM elements cache
    const Elements = {
        // Buttons
        extraMilkBtn: null,
        noMilkBtn: null,
        closeModalBtn: null,
        cancelBtn: null,
        submitBtn: null,
        toastCloseBtn: null,

        // Modal and overlays
        modalOverlay: null,
        loadingOverlay: null,
        toast: null,

        // Form elements
        deliveryForm: null,
        modalTitle: null,
        customerName: null,
        mobileNumber: null,
        milkQuantity: null,
        quantityGroup: null,

        // Toast elements
        toastIcon: null,
        toastTitle: null,
        toastText: null,

        // History elements
        historyToggle: null,
        requestHistory: null,
        historyList: null,
        noHistory: null,
        clearHistory: null,
        historyCount: null
    };

    // Validation utilities
    const Validator = {
        /**
         * Validate customer name
         * @param {string} name - Customer name to validate
         * @returns {Object} Validation result
         */
        validateName(name) {
            if (!name || name.trim().length === 0) {
                return { isValid: false, message: 'Name is required' };
            }
            
            if (name.trim().length < CONFIG.VALIDATION.NAME.MIN_LENGTH) {
                return { isValid: false, message: `Name must be at least ${CONFIG.VALIDATION.NAME.MIN_LENGTH} characters` };
            }
            
            if (name.trim().length > CONFIG.VALIDATION.NAME.MAX_LENGTH) {
                return { isValid: false, message: `Name must not exceed ${CONFIG.VALIDATION.NAME.MAX_LENGTH} characters` };
            }
            
            if (!CONFIG.VALIDATION.NAME.PATTERN.test(name.trim())) {
                return { isValid: false, message: 'Name can only contain letters, spaces, and dots' };
            }
            
            return { isValid: true, message: '' };
        },

        /**
         * Validate mobile number
         * @param {string} mobile - Mobile number to validate
         * @returns {Object} Validation result
         */
        validateMobile(mobile) {
            if (!mobile || mobile.trim().length === 0) {
                return { isValid: false, message: 'Mobile number is required' };
            }
            
            const cleanMobile = mobile.replace(/\D/g, '');
            
            if (cleanMobile.length !== CONFIG.VALIDATION.MOBILE.MAX_LENGTH) {
                return { isValid: false, message: 'Mobile number must be exactly 10 digits' };
            }
            
            if (!CONFIG.VALIDATION.MOBILE.PATTERN.test(cleanMobile)) {
                return { isValid: false, message: 'Please enter a valid Indian mobile number (starting with 6-9)' };
            }
            
            return { isValid: true, message: '' };
        },

        /**
         * Validate milk quantity
         * @param {string} quantity - Quantity to validate
         * @returns {Object} Validation result
         */
        validateQuantity(quantity) {
            if (!quantity || quantity.toString().trim().length === 0) {
                return { isValid: false, message: 'Please specify the milk quantity' };
            }
            
            // Allow any text input - just check that something meaningful was entered
            const text = quantity.toString().trim();
            
            // Check for minimum length to ensure meaningful input
            if (text.length < 1) {
                return { isValid: false, message: 'Please specify the milk quantity' };
            }
            
            // Check for extremely long input (prevent spam)
            if (text.length > 100) {
                return { isValid: false, message: 'Please enter a shorter description of quantity' };
            }
            
            return { isValid: true, message: '' };
        }
    };

    // UI utilities
    const UI = {
        /**
         * Show validation error for a field
         * @param {HTMLElement} field - Form field element
         * @param {string} message - Error message
         */
        showFieldError(field, message) {
            const errorElement = document.getElementById(`${field.name}-error`);
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.setAttribute('aria-live', 'polite');
            }
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', `${field.name}-error`);
        },

        /**
         * Clear validation error for a field
         * @param {HTMLElement} field - Form field element
         */
        clearFieldError(field) {
            const errorElement = document.getElementById(`${field.name}-error`);
            if (errorElement) {
                errorElement.textContent = '';
            }
            field.setAttribute('aria-invalid', 'false');
        },

        /**
         * Show toast notification
         * @param {string} type - Toast type ('success' or 'error')
         * @param {string} title - Toast title
         * @param {string} message - Toast message
         */
        showToast(type, title, message) {
            if (AppState.activeToast) {
                clearTimeout(AppState.activeToast);
            }

            Elements.toast.className = `toast ${type}`;
            Elements.toastIcon.className = `toast-icon fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} ${type}`;
            Elements.toastTitle.textContent = title;
            Elements.toastText.textContent = message;

            // Show toast
            Elements.toast.classList.add('show');
            Elements.toast.setAttribute('aria-hidden', 'false');

            // Auto-hide toast
            AppState.activeToast = setTimeout(() => {
                this.hideToast();
            }, CONFIG.UI.TOAST_DURATION);
        },

        /**
         * Hide toast notification
         */
        hideToast() {
            Elements.toast.classList.remove('show');
            Elements.toast.setAttribute('aria-hidden', 'true');
            if (AppState.activeToast) {
                clearTimeout(AppState.activeToast);
                AppState.activeToast = null;
            }
        },

        /**
         * Show loading overlay
         */
        showLoading() {
            Elements.loadingOverlay.classList.add('active');
            Elements.loadingOverlay.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        },

        /**
         * Hide loading overlay
         */
        hideLoading() {
            Elements.loadingOverlay.classList.remove('active');
            Elements.loadingOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        },

        /**
         * Show modal
         * @param {string} type - Modal type ('extra' or 'no')
         */
        showModal(type) {
            AppState.currentModal = type;
            
            if (type === 'extra') {
                Elements.modalTitle.textContent = 'Request Extra Milk';
                Elements.quantityGroup.style.display = 'block';
                Elements.milkQuantity.setAttribute('required', 'required');
            } else {
                Elements.modalTitle.textContent = 'Skip Tomorrow\'s Delivery';
                Elements.quantityGroup.style.display = 'none';
                Elements.milkQuantity.removeAttribute('required');
            }

            Elements.modalOverlay.classList.add('active');
            Elements.modalOverlay.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // Focus first input
            setTimeout(() => {
                Elements.customerName.focus();
            }, CONFIG.UI.ANIMATION_DURATION);
        },

        /**
         * Hide modal
         */
        hideModal() {
            Elements.modalOverlay.classList.remove('active');
            Elements.modalOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            AppState.currentModal = null;
            this.resetForm();
        },

        /**
         * Reset form to initial state
         */
        resetForm() {
            Elements.deliveryForm.reset();
            
            // Clear all error messages
            const errorElements = Elements.deliveryForm.querySelectorAll('.error-message');
            errorElements.forEach(element => {
                element.textContent = '';
            });
            
            // Reset aria-invalid attributes
            const inputs = Elements.deliveryForm.querySelectorAll('input');
            inputs.forEach(input => {
                input.setAttribute('aria-invalid', 'false');
            });
            
            AppState.formData = {};
        },

        /**
         * Update submit button state
         * @param {boolean} isSubmitting - Whether form is being submitted
         */
        updateSubmitButton(isSubmitting) {
            const buttonContent = Elements.submitBtn.querySelector('.btn-content');
            
            if (isSubmitting) {
                Elements.submitBtn.disabled = true;
                buttonContent.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Sending...';
            } else {
                Elements.submitBtn.disabled = false;
                buttonContent.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i> Send Request';
            }
        },

        /**
         * Toggle request history visibility
         */
        toggleHistory() {
            const isVisible = !Elements.requestHistory.style.display || Elements.requestHistory.style.display === 'none';
            
            if (isVisible) {
                Elements.requestHistory.style.display = 'block';
                Elements.historyToggle.querySelector('span').textContent = 'Hide History';
                Elements.historyToggle.querySelector('i').className = 'fas fa-times';
                this.renderHistory();
            } else {
                Elements.requestHistory.style.display = 'none';
                Elements.historyToggle.querySelector('span').textContent = 'View History';
                Elements.historyToggle.querySelector('i').className = 'fas fa-history';
            }
        },

        /**
         * Render request history
         */
        renderHistory() {
            const history = LocalStorage.getRequestHistory();
            
            if (history.length === 0) {
                Elements.historyList.style.display = 'none';
                Elements.noHistory.style.display = 'block';
                return;
            }

            Elements.historyList.style.display = 'block';
            Elements.noHistory.style.display = 'none';
            
            Elements.historyList.innerHTML = history.map(request => `
                <div class="history-item ${request.type}-milk">
                    <div class="request-type ${request.type}-milk">
                        <i class="fas ${request.type === 'extra' ? 'fa-plus-circle' : 'fa-pause-circle'}"></i>
                        ${request.type === 'extra' ? 'Extra Milk Request' : 'Skip Delivery Request'}
                    </div>
                    <div class="request-details">
                        <div><strong>Name:</strong> ${request.name}</div>
                        <div><strong>Mobile:</strong> ${request.mobile}</div>
                        ${request.quantity ? `<div><strong>Quantity:</strong> ${request.quantity}L</div>` : ''}
                        <div><strong>Status:</strong> <span style="color: ${request.status === 'sent' ? 'green' : 'red'}">${request.status}</span></div>
                    </div>
                    <div class="request-timestamp">${request.timestamp}</div>
                </div>
            `).join('');
        },

        /**
         * Update history count badge
         */
        updateHistoryCount() {
            const history = LocalStorage.getRequestHistory();
            Elements.historyCount.textContent = history.length;
            
            if (history.length > 0) {
                Elements.historyCount.style.display = 'flex';
            } else {
                Elements.historyCount.style.display = 'none';
            }
        }
    };

    // Telegram Bot API integration
    const TelegramBot = {
        /**
         * Send message to Telegram bot
         * @param {Object} data - Form data to send
         * @returns {Promise} API call promise
         */
        async sendMessage(data) {
            const { BOT_TOKEN, ADMIN_CHAT_ID, API_URL } = CONFIG.TELEGRAM;
            
            if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE' || ADMIN_CHAT_ID === 'YOUR_ADMIN_CHAT_ID_HERE') {
                throw new Error('Telegram Bot configuration is not set up. Please configure BOT_TOKEN and ADMIN_CHAT_ID.');
            }

            const message = this.formatMessage(data);
            const url = `${API_URL}${BOT_TOKEN}/sendMessage`;
            
            const payload = {
                chat_id: ADMIN_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.description || 'Failed to send message to Telegram');
            }

            return await response.json();
        },

        /**
         * Format form data into readable message
         * @param {Object} data - Form data
         * @returns {string} Formatted message
         */
        formatMessage(data) {
            const timestamp = new Date().toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Create attractive header with border
            let message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            message += `🥛 *SUDHA SAGAR DAIRY* 🥛\n`;
            message += `🌟 *NEW DELIVERY REQUEST* 🌟\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            // Customer information section
            message += `👤 *CUSTOMER DETAILS*\n`;
            message += `┌─────────────────────────────────┐\n`;
            message += `│ 📛 Name: *${data.name}*\n`;
            message += `│ 📱 Mobile: \`${data.mobile}\`\n`;
            message += `└─────────────────────────────────┘\n\n`;
            
            // Request details section
            message += `📋 *REQUEST INFORMATION*\n`;
            message += `┌─────────────────────────────────┐\n`;
            message += `│ 📝 Type: *${data.type === 'extra' ? '🔥 EXTRA MILK TOMORROW' : '⏸️ SKIP DELIVERY TOMORROW'}*\n`;
            
            if (data.type === 'extra' && data.quantity) {
                message += `│ 🥛 Quantity: *${data.quantity}*\n`;
            }
            
            message += `│ 📅 Requested: ${timestamp}\n`;
            message += `│ 💻 Source: Web Application\n`;
            message += `└─────────────────────────────────┘\n\n`;
            
            // Action required section
            if (data.type === 'extra') {
                message += `⚡ *ACTION REQUIRED*\n`;
                message += `🚚 Please prepare *${data.quantity || 'requested quantity'}* extra milk for delivery\n`;
                message += `📍 Customer: *${data.name}* | *${data.mobile}*\n\n`;
            } else {
                message += `⚡ *ACTION REQUIRED*\n`;
                message += `🛑 Please *SKIP* tomorrow's delivery\n`;
                message += `📍 Customer: *${data.name}* | *${data.mobile}*\n\n`;
            }
            
            // Footer with decoration
            message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            message += `🏪 *Sudha Sagar Dairy Management*\n`;
            message += `✨ *Premium Quality • Fresh Daily* ✨\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            
            return message;
        }
    };

    // Form handling
    const FormHandler = {
        /**
         * Validate entire form
         * @returns {boolean} Whether form is valid
         */
        validateForm() {
            let isValid = true;
            const formData = AppState.formData;

            // Validate name
            const nameResult = Validator.validateName(formData.name);
            if (!nameResult.isValid) {
                UI.showFieldError(Elements.customerName, nameResult.message);
                isValid = false;
            } else {
                UI.clearFieldError(Elements.customerName);
            }

            // Validate mobile
            const mobileResult = Validator.validateMobile(formData.mobile);
            if (!mobileResult.isValid) {
                UI.showFieldError(Elements.mobileNumber, mobileResult.message);
                isValid = false;
            } else {
                UI.clearFieldError(Elements.mobileNumber);
            }

            // Validate quantity if required
            if (AppState.currentModal === 'extra') {
                const quantityResult = Validator.validateQuantity(formData.quantity);
                if (!quantityResult.isValid) {
                    UI.showFieldError(Elements.milkQuantity, quantityResult.message);
                    isValid = false;
                } else {
                    UI.clearFieldError(Elements.milkQuantity);
                }
            }

            return isValid;
        },

        /**
         * Handle form submission
         * @param {Event} event - Form submit event
         */
        async handleSubmit(event) {
            event.preventDefault();
            
            if (AppState.isSubmitting) {
                return;
            }

            // Collect form data
            AppState.formData = {
                name: Elements.customerName.value.trim(),
                mobile: Elements.mobileNumber.value.trim(),
                quantity: AppState.currentModal === 'extra' ? Elements.milkQuantity.value.trim() : null,
                type: AppState.currentModal
            };

            // Validate form
            if (!this.validateForm()) {
                // Focus first invalid field
                const firstError = Elements.deliveryForm.querySelector('[aria-invalid="true"]');
                if (firstError) {
                    firstError.focus();
                }
                return;
            }

            AppState.isSubmitting = true;
            UI.updateSubmitButton(true);
            UI.showLoading();

            try {
                await TelegramBot.sendMessage(AppState.formData);
                
                // Save request to local storage
                const requestData = {
                    ...AppState.formData,
                    timestamp: new Date().toLocaleString('en-IN', { 
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    status: 'sent',
                    id: Date.now()
                };
                
                LocalStorage.saveRequest(requestData);
                UI.updateHistoryCount();
                
                UI.showToast(
                    'success',
                    'Request Sent Successfully!',
                    'Your milk delivery request has been sent to Sudha Sagar Dairy. We will process it shortly.'
                );
                
                UI.hideModal();
                
            } catch (error) {
                console.error('Error sending message:', error);
                
                // Save failed request to local storage
                const requestData = {
                    ...AppState.formData,
                    timestamp: new Date().toLocaleString('en-IN', { 
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    status: 'failed',
                    id: Date.now(),
                    error: error.message
                };
                
                LocalStorage.saveRequest(requestData);
                UI.updateHistoryCount();
                
                UI.showToast(
                    'error',
                    'Failed to Send Request',
                    error.message || 'Please try again or contact us directly.'
                );
                
            } finally {
                AppState.isSubmitting = false;
                UI.updateSubmitButton(false);
                UI.hideLoading();
            }
        },

        /**
         * Handle input formatting and real-time validation
         * @param {HTMLElement} field - Input field
         */
        handleInputFormat(field) {
            // Allow free-form text input for milk quantity
            // No automatic formatting for better user experience
        },

        /**
         * Handle real-time field validation
         * @param {Event} event - Input event
         */
        handleFieldValidation(event) {
            const field = event.target;
            const value = field.value.trim();

            // Clear previous error
            UI.clearFieldError(field);

            // Skip validation if field is empty (will be caught on submit)
            if (!value) return;

            let validationResult;
            
            switch (field.name) {
                case 'customerName':
                    validationResult = Validator.validateName(value);
                    break;
                case 'mobileNumber':
                    validationResult = Validator.validateMobile(value);
                    break;
                case 'milkQuantity':
                    validationResult = Validator.validateQuantity(value);
                    break;
                default:
                    return;
            }

            if (!validationResult.isValid) {
                UI.showFieldError(field, validationResult.message);
            }
        }
    };

    // Local Storage utilities
    const LocalStorage = {
        STORAGE_KEY: 'sudha_sagar_requests',

        /**
         * Get request history from local storage
         * @returns {Array} Array of request objects
         */
        getRequestHistory() {
            try {
                const history = localStorage.getItem(this.STORAGE_KEY);
                return history ? JSON.parse(history) : [];
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                return [];
            }
        },

        /**
         * Save request to local storage
         * @param {Object} request - Request object to save
         */
        saveRequest(request) {
            try {
                const history = this.getRequestHistory();
                history.unshift(request); // Add to beginning of array
                
                // Keep only last 20 requests
                if (history.length > 20) {
                    history.splice(20);
                }
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
        },

        /**
         * Clear all request history
         */
        clearHistory() {
            try {
                localStorage.removeItem(this.STORAGE_KEY);
            } catch (error) {
                console.error('Error clearing localStorage:', error);
            }
        }
    };

    // Event handlers
    const EventHandlers = {
        /**
         * Initialize all event listeners
         */
        init() {
            // Button click handlers
            Elements.extraMilkBtn.addEventListener('click', () => UI.showModal('extra'));
            Elements.noMilkBtn.addEventListener('click', () => UI.showModal('no'));
            Elements.closeModalBtn.addEventListener('click', () => UI.hideModal());
            Elements.cancelBtn.addEventListener('click', () => UI.hideModal());
            Elements.toastCloseBtn.addEventListener('click', () => UI.hideToast());

            // History event listeners
            Elements.historyToggle.addEventListener('click', () => UI.toggleHistory());
            Elements.clearHistory.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all request history?')) {
                    LocalStorage.clearHistory();
                    UI.renderHistory();
                    UI.updateHistoryCount();
                    UI.showToast('success', 'History Cleared', 'All request history has been cleared.');
                }
            });

            // Form submission
            Elements.deliveryForm.addEventListener('submit', FormHandler.handleSubmit.bind(FormHandler));

            // Real-time validation
            Elements.customerName.addEventListener('input', this.debounce(FormHandler.handleFieldValidation.bind(FormHandler), CONFIG.UI.DEBOUNCE_DELAY));
            Elements.mobileNumber.addEventListener('input', this.debounce(FormHandler.handleFieldValidation.bind(FormHandler), CONFIG.UI.DEBOUNCE_DELAY));
            Elements.milkQuantity.addEventListener('input', this.debounce(FormHandler.handleFieldValidation.bind(FormHandler), CONFIG.UI.DEBOUNCE_DELAY));

            // Modal overlay click to close
            Elements.modalOverlay.addEventListener('click', (event) => {
                if (event.target === Elements.modalOverlay) {
                    UI.hideModal();
                }
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    if (Elements.modalOverlay.classList.contains('active')) {
                        UI.hideModal();
                    }
                    if (Elements.toast.classList.contains('show')) {
                        UI.hideToast();
                    }
                }
            });

            // Handle mobile number input formatting
            Elements.mobileNumber.addEventListener('input', (event) => {
                // Remove non-digit characters
                let value = event.target.value.replace(/\D/g, '');
                // Limit to 10 digits
                if (value.length > 10) {
                    value = value.slice(0, 10);
                }
                event.target.value = value;
            });

            // Allow free-form milk quantity input
            Elements.milkQuantity.addEventListener('input', (event) => {
                // No automatic formatting - let customers type naturally
                // Validation will happen on form submission
            });
        },

        /**
         * Debounce function to limit frequent function calls
         * @param {Function} func - Function to debounce
         * @param {number} delay - Delay in milliseconds
         * @returns {Function} Debounced function
         */
        debounce(func, delay) {
            let timeoutId;
            return function (...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        }
    };

    // Application initialization
    const App = {
        /**
         * Initialize the application
         */
        init() {
            try {
                this.cacheElements();
                this.setupAccessibility();
                EventHandlers.init();
                UI.updateHistoryCount();
                this.showReadyState();
            } catch (error) {
                console.error('Failed to initialize application:', error);
                this.showErrorState();
            }
        },

        /**
         * Cache DOM elements for better performance
         */
        cacheElements() {
            // Buttons
            Elements.extraMilkBtn = document.getElementById('extraMilkBtn');
            Elements.noMilkBtn = document.getElementById('noMilkBtn');
            Elements.closeModalBtn = document.getElementById('closeModal');
            Elements.cancelBtn = document.getElementById('cancelBtn');
            Elements.submitBtn = document.getElementById('submitBtn');
            Elements.toastCloseBtn = document.getElementById('toast-close');

            // Modal and overlays
            Elements.modalOverlay = document.getElementById('modalOverlay');
            Elements.loadingOverlay = document.getElementById('loading');
            Elements.toast = document.getElementById('toast');

            // Form elements
            Elements.deliveryForm = document.getElementById('deliveryForm');
            Elements.modalTitle = document.getElementById('modal-title');
            Elements.customerName = document.getElementById('customerName');
            Elements.mobileNumber = document.getElementById('mobileNumber');
            Elements.milkQuantity = document.getElementById('milkQuantity');
            Elements.quantityGroup = document.getElementById('quantityGroup');

            // Toast elements
            Elements.toastIcon = document.getElementById('toast-icon');
            Elements.toastTitle = document.getElementById('toast-title');
            Elements.toastText = document.getElementById('toast-text');

            // History elements
            Elements.historyToggle = document.getElementById('historyToggle');
            Elements.requestHistory = document.getElementById('requestHistory');
            Elements.historyList = document.getElementById('historyList');
            Elements.noHistory = document.getElementById('noHistory');
            Elements.clearHistory = document.getElementById('clearHistory');
            Elements.historyCount = document.getElementById('historyCount');

            // Validate that all required elements are present
            for (const [key, element] of Object.entries(Elements)) {
                if (!element) {
                    throw new Error(`Required element '${key}' not found in DOM`);
                }
            }
        },

        /**
         * Set up accessibility features
         */
        setupAccessibility() {
            // Add skip link for screen readers
            const skipLink = document.createElement('a');
            skipLink.href = '#main-content';
            skipLink.textContent = 'Skip to main content';
            skipLink.className = 'skip-link';
            document.body.insertBefore(skipLink, document.body.firstChild);

            // Ensure proper focus management
            Elements.modalOverlay.setAttribute('tabindex', '-1');
            
            // Add live region for announcements
            const liveRegion = document.createElement('div');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'visually-hidden';
            liveRegion.id = 'live-region';
            document.body.appendChild(liveRegion);
        },

        /**
         * Show application ready state
         */
        showReadyState() {
            console.log('✅ Sudha Sagar Dairy Management System initialized successfully');
            
            // Add a subtle animation to indicate the app is ready
            const header = document.querySelector('.header');
            if (header) {
                header.style.opacity = '0';
                header.style.transform = 'translateY(-20px)';
                
                setTimeout(() => {
                    header.style.transition = 'all 0.5s ease';
                    header.style.opacity = '1';
                    header.style.transform = 'translateY(0)';
                }, 100);
            }
        },

        /**
         * Show error state if initialization fails
         */
        showErrorState() {
            const container = document.querySelector('.container');
            if (container) {
                container.innerHTML = `
                    <div class="error-state" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
                        <h2>Application Error</h2>
                        <p>Sorry, there was an error loading the application. Please refresh the page and try again.</p>
                        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                            Refresh Page
                        </button>
                    </div>
                `;
            }
        }
    };

    // Initialize application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }

    // Export for testing purposes (if needed)
    if (typeof window !== 'undefined') {
        window.SudhaSegarApp = {
            AppState,
            Validator,
            UI,
            TelegramBot,
            FormHandler
        };
    }

})();
