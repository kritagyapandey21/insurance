/**
 * PocketShield Insurance - Mini App Main Logic
 * Handles screen navigation, form validation, and API integration
 */

class InsuranceApp {
    constructor() {
        this.currentScreen = 'loading';
        this.userData = {
            fullName: '',
            traderId: '',
            initialAmount: 0,
            insuranceFee: 0,
            telegramId: null,
            uniquePaymentId: null
        };
        this.backendURL = this.getBackendURL();
        this.selectedNetwork = 'ethereum';
        this.walletAddress = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1';
        this.paymentOptions = {};
        this.notificationTimeout = null;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupTheme();
        this.setupTelegram();
        this.setupEventListeners();
        this.showScreen('terms');
    }

    /**
     * Setup theme toggle functionality
     */
    setupTheme() {
        // Restore saved theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.updateThemeButtonIcon(true);
        }

        // Add theme toggle listener
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                this.updateThemeButtonIcon(isDark);
            });
        }
    }

    /**
     * Update theme button icon based on current theme
     */
    updateThemeButtonIcon(isDark) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = isDark ? '☀️' : '🌙';
        }
    }

    /**
     * Setup Telegram WebApp SDK
     */
    setupTelegram() {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            
            // Set theme
            tg.setHeaderColor('#0a0e27');
            tg.setBackgroundColor('#0a0e27');
            
            // Get user info
            if (tg.initDataUnsafe?.user) {
                this.userData.telegramId = tg.initDataUnsafe.user.id;
                console.log('Telegram User ID:', this.userData.telegramId);
            }
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Screen 1: Terms
        document.getElementById('agreeCheckbox').addEventListener('change', (e) => {
            const btn = document.getElementById('continueBtn');
            if (e.target.checked) {
                btn.classList.remove('disabled');
                btn.disabled = false;
            } else {
                btn.classList.add('disabled');
                btn.disabled = true;
            }
        });

        document.getElementById('continueBtn').addEventListener('click', () => {
            this.showScreen('userDetails');
        });

        // Screen 2: User Details Form
        document.getElementById('userDetailsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted, validating...');
            if (this.validateUserDetails()) {
                console.log('Validation passed, showing payment screen');
                this.showScreen('payment');
                this.initializePaymentScreen();
            } else {
                console.log('Validation failed, staying on form');
            }
        });

        // Real-time fee calculation
        document.getElementById('initialAmount').addEventListener('input', (e) => {
            this.calculateFee(parseFloat(e.target.value) || 0);
        });

        // Consent checkbox
        document.getElementById('consentCheckbox').addEventListener('change', (e) => {
            const proceedBtn = document.getElementById('proceedBtn');
            if (e.target.checked) {
                proceedBtn.classList.remove('disabled');
                proceedBtn.disabled = false;
            } else {
                proceedBtn.classList.add('disabled');
                proceedBtn.disabled = true;
            }
        });

        // Screen 3: Payment
        document.getElementById('copyWalletBtn').addEventListener('click', (e) => {
            this.copyToClipboard(this.walletAddress, e.target);
        });

        document.getElementById('paidBtn').addEventListener('click', () => {
            this.verifyPayment();
        });

        // Network selector
        const networkSelect = document.getElementById('networkSelect');
        if (networkSelect) {
            networkSelect.addEventListener('change', (e) => {
                console.log('Network changed to:', e.target.value);
                this.selectedNetwork = e.target.value;
                this.updatePaymentScreenForNetwork();
            });
        } else {
            console.warn('Network selector element not found');
        }
    }

    /**
     * Show specific screen
     */
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const screenMap = {
            'loading': 'loadingScreen',
            'terms': 'termsScreen',
            'userDetails': 'userDetailsScreen',
            'payment': 'paymentScreen',
            'verification': 'verificationScreen',
            'error': 'errorScreen',
            'success': 'successScreen'
        };

        const screenId = screenMap[screenName];
        if (screenId) {
            document.getElementById(screenId).classList.add('active');
            this.currentScreen = screenName;
            console.log(`Switched to screen: ${screenName}`);
            
            // Initialize terms background animation
            if (screenName === 'terms') {
                setTimeout(() => this.initializeTermsAnimation(), 100);
            }
        }
    }

    /**
     * Validate user details form
     */
    validateUserDetails() {
        const fullName = document.getElementById('fullName').value.trim();
        const traderId = document.getElementById('traderId').value.trim();
        const initialAmount = parseFloat(document.getElementById('initialAmount').value);
        const consentChecked = document.getElementById('consentCheckbox').checked;

        console.log('Form Validation:', {
            fullName,
            traderId,
            initialAmount,
            consentChecked
        });

        let isValid = true;

        // Name validation
        if (!fullName || fullName.length < 2) {
            this.showError('fullName', 'Please enter a valid name');
            isValid = false;
        } else {
            this.clearError('fullName');
        }

        // Trader ID validation
        if (!traderId || traderId.length < 3) {
            this.showError('traderId', 'Trader ID must be at least 3 characters');
            isValid = false;
        } else {
            this.clearError('traderId');
        }

        // Amount validation
        if (isNaN(initialAmount) || initialAmount < 100) {
            this.showError('initialAmount', 'The minimum initial amount to get insured is 100 USDT');
            isValid = false;
        } else if (initialAmount > 1000000) {
            this.showError('initialAmount', 'Maximum deposit is 1,000,000 USDT');
            isValid = false;
        } else {
            this.clearError('initialAmount');
        }

        if (isValid) {
            this.userData.fullName = fullName;
            this.userData.traderId = traderId;
            this.userData.initialAmount = initialAmount;
            this.userData.insuranceFee = initialAmount * 0.1;
            this.userData.uniquePaymentId = this.generateUniquePaymentId();
            console.log('Validation passed, moving to payment screen');
        } else {
            console.log('Validation failed');
        }

        return isValid;
    }

    /**
     * Calculate insurance fee
     */
    calculateFee(amount) {
        const fee = amount * 0.1;

        document.getElementById('feeDisplay').textContent = fee.toFixed(2) + ' USDT';
    }

    /**
     * Show error message
     */
    showError(fieldName, message) {
        const input = document.getElementById(fieldName);
        const errorElement = input.parentElement.nextElementSibling;
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            input.classList.add('error');
        }
    }

    /**
     * Clear error message
     */
    clearError(fieldName) {
        const input = document.getElementById(fieldName);
        const errorElement = input.parentElement.nextElementSibling;
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            input.classList.remove('error');
        }
    }



    /**
     * Convert USDT amount to Wei (for Ethereum)
     * USDT uses 6 decimals
     */
    toWei(amount) {
        return (amount * 1e6).toString();
    }

    /**
     * Copy text to clipboard
     */
    copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            // Store original icon
            const originalIcon = button.textContent;
            
            // Change to checkmark
            button.textContent = '✓';
            button.style.backgroundColor = '#10b981';
            button.disabled = true;
            
            // Revert after 4 seconds
            setTimeout(() => {
                button.textContent = originalIcon;
                button.style.backgroundColor = '';
                button.disabled = false;
            }, 4000);
        }).catch(() => {
            this.showNotification('Failed to copy', 'error');
        });
    }

    /**
     * Generate unique payment ID
     */
    generateUniquePaymentId() {
        return `PAY_${this.userData.telegramId}_${Date.now()}`;
    }



    /**
     * Show error screen with countdown
     */
    showErrorScreen(errorMessage) {
        this.showScreen('error');

        // Update error message
        const errorMessageElement = document.getElementById('errorMessage');
        if (errorMessageElement) {
            errorMessageElement.textContent = errorMessage;
        }

        // Countdown and redirect
        let countdown = 5;
        const countdownElement = document.getElementById('errorCountdown');

        const interval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;

            if (countdown <= 0) {
                clearInterval(interval);
                this.showScreen('payment');
            }
        }, 1000);
    }

    /**
     * Show success screen with animations
     */
    showSuccessScreen() {
        this.showScreen('success');

        // Trigger confetti
        const confetti = new Confetti('confetti');
        confetti.create(100);

        // Countdown and close
        let countdown = 3;
        const countdownElement = document.getElementById('closeCountdown');

        const interval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;

            if (countdown <= 0) {
                clearInterval(interval);
                confetti.stop();
                this.closeApp();
            }
        }, 1000);
    }

    /**
     * Close the Mini App
     */
    closeApp() {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.close();
        } else {
            // Fallback for testing
            alert('Insurance purchased successfully! Mini App will close.');
            window.close();
        }
    }

    /**
     * Get backend URL based on environment
     */
    getBackendURL() {
        // Auto-detect localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000';
        }
        
        // Check for dev parameter
        const params = new URLSearchParams(window.location.search);
        if (params.get('dev') === 'true') {
            return 'http://localhost:5000';
        }
        
        // Production - point to your VPS backend
        return 'http://88.222.212.178:5000';
    }

    /**
     * Utility: Delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Initialize animated network background for terms screen
     */
    initializeTermsAnimation() {
        const canvas = document.getElementById('termsBackground');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const particles = [];
        const particleCount = 50;
        let animationId;

        // Set canvas size
        function resizeCanvas() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Particle class
        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 1;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off walls
                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

                // Keep in bounds
                this.x = Math.max(0, Math.min(canvas.width, this.x));
                this.y = Math.max(0, Math.min(canvas.height, this.y));
            }

            draw() {
                ctx.fillStyle = document.body.classList.contains('dark-mode') 
                    ? 'rgba(102, 179, 255, 0.8)' 
                    : 'rgba(0, 102, 204, 0.6)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Initialize particles
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        // Animation loop
        function animate() {
            // Clear canvas with background
            const isDark = document.body.classList.contains('dark-mode');
            const bgColor = isDark ? 'rgba(15, 20, 25, 0.1)' : 'rgba(248, 249, 250, 0.05)';
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            particles.forEach(particle => {
                particle.update();
                particle.draw();
            });

            // Draw connecting lines
            const lineColor = isDark 
                ? 'rgba(102, 179, 255, 0.15)' 
                : 'rgba(0, 102, 204, 0.1)';
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1;

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            animationId = requestAnimationFrame(animate);
        }

        animate();

        // Cleanup function (store reference for later cleanup if needed)
        canvas.stopAnimation = () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }

    /**
     * Fetch payment options from backend
     */
    async fetchPaymentOptions() {
        try {
            const response = await fetch(`${this.backendURL}/api/payment-options`);
            const result = await response.json();
            if (result.success) {
                this.paymentOptions = result.data;
                console.log('Payment options loaded:', this.paymentOptions);
            }
        } catch (error) {
            console.error('Error fetching payment options:', error);
            // Use fallback if API call fails
            this.paymentOptions = {
                'BEP20 (BSC)': {
                    network: 'bep20',
                    walletAddress: '0x9BBC6909Db28aC63516d4B60Eea3352ee0e3Ed5A',
                    chainId: 56,
                    blockExplorer: 'https://bscscan.com'
                },
                'TRC20 (Tron)': {
                    network: 'trc20',
                    walletAddress: 'TWhjbs9JMTuhMTJTqGBcdydMPeef5f6ytd',
                    chainId: 'Tron Mainnet',
                    blockExplorer: 'https://tronscan.org'
                }
            };
        }
    }

    /**
     * Update payment screen when network selection changes
     */
    updatePaymentScreenForNetwork() {
        console.log('updatePaymentScreenForNetwork called with selectedNetwork:', this.selectedNetwork);
        
        const networkMap = {
            'bep20': {
                name: 'BSC (Binance Smart Chain)',
                wallet: '0x9BBC6909Db28aC63516d4B60Eea3352ee0e3Ed5A',
                instruction: 'Use Binance Smart Chain (BSC) with USDT'
            },
            'trc20': {
                name: 'Tron Network',
                wallet: 'TWhjbs9JMTuhMTJTqGBcdydMPeef5f6ytd',
                instruction: 'Use Tron Network with USDT (TRC20)'
            }
        };

        const networkConfig = networkMap[this.selectedNetwork];
        console.log('Network config:', networkConfig);
        if (!networkConfig) {
            console.error('Network config not found for:', this.selectedNetwork);
            return;
        }

        // Update wallet address
        this.walletAddress = networkConfig.wallet;
        const walletElement = document.getElementById('walletAddress');
        console.log('Wallet element found:', !!walletElement, 'Setting to:', networkConfig.wallet);
        if (walletElement) {
            walletElement.textContent = this.walletAddress;
        }

        // Update network display
        const networkDisplay = document.getElementById('networkDisplay');
        console.log('Network display element found:', !!networkDisplay, 'Setting to:', networkConfig.name);
        if (networkDisplay) {
            networkDisplay.textContent = networkConfig.name;
        }

        // Update instruction
        const instructionElement = document.getElementById('instructionNetwork');
        console.log('Instruction element found:', !!instructionElement, 'Setting to:', networkConfig.instruction);
        if (instructionElement) {
            instructionElement.textContent = networkConfig.instruction;
        }

        // Regenerate QR code
        this.generateQRCode();
    }

    /**
     * Initialize payment screen with network fetch
     */
    async initializePaymentScreen() {
        // Fetch payment options first
        await this.fetchPaymentOptions();

        const fee = this.userData.insuranceFee;

        // Update displays
        document.getElementById('paymentAmount').textContent = fee.toFixed(2) + ' USDT';
        document.getElementById('paymentCodeAmount').textContent = fee.toFixed(2) + ' USDT';
        document.getElementById('instructionAmount').textContent = fee.toFixed(2) + ' USDT';

        // Set default network to BEP20
        this.selectedNetwork = 'bep20';
        console.log('Payment screen initialized, calling updatePaymentScreenForNetwork with bep20');
        
        // Use a small delay to ensure DOM is ready
        setTimeout(() => {
            this.updatePaymentScreenForNetwork();
        }, 100);
    }

    /**
     * Generate QR code for payment based on selected network
     */
    generateQRCode() {
        const qrContainer = document.getElementById('qrCode');
        qrContainer.innerHTML = ''; // Clear previous QR

        let qrData = '';

        // Generate network-specific QR data
        switch (this.selectedNetwork) {
            case 'bep20':
                // BSC / BEP20 format
                qrData = `bep20:${this.walletAddress}?amount=${this.userData.insuranceFee}`;
                break;
            case 'trc20':
                // Tron format
                qrData = `tron:${this.walletAddress}?amount=${this.userData.insuranceFee}`;
                break;
            default:
                // Default to BEP20
                qrData = `bep20:${this.walletAddress}?amount=${this.userData.insuranceFee}`;
        }

        // Use QRCode.js library
        if (window.QRCode) {
            new QRCode(qrContainer, {
                text: qrData,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'success') {
        // Create notification container if it doesn't exist
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            document.body.insertBefore(notificationContainer, document.body.firstChild);
            notificationContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10000;
                padding: 16px;
                pointer-events: none;
            `;
        }

        // Create notification element
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b';
        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';
        
        notification.style.cssText = `
            background-color: ${bgColor};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            margin-bottom: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideDown 0.3s ease-out;
            pointer-events: auto;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
            max-width: 90%;
            margin-left: auto;
            margin-right: auto;
        `;
        
        notification.innerHTML = `<span style="font-size: 18px;">${icon}</span><span>${message}</span>`;
        
        notificationContainer.appendChild(notification);
        
        // Auto-remove after 4 seconds
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        this.notificationTimeout = setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    /**
     * Verify payment with network type
     */
    async verifyPayment() {
        // Get transaction hash from input
        const txHashInput = document.getElementById('txHash');
        const txHash = txHashInput ? txHashInput.value.trim() : '';

        // Validate transaction hash
        if (!txHash) {
            this.showNotification('Please enter your transaction hash', 'warning');
            return;
        }

        if (txHash.length < 10) {
            this.showNotification('Transaction hash seems too short. Please check and try again.', 'warning');
            return;
        }

        this.showScreen('verification');

        try {
            console.log('Verifying payment with txHash:', txHash, 'Network:', this.selectedNetwork);

            const response = await fetch(`${this.backendURL}/api/check-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    traderId: this.userData.traderId,
                    amount: this.userData.insuranceFee,
                    fullName: this.userData.fullName,
                    telegramId: this.userData.telegramId,
                    uniquePaymentId: this.userData.uniquePaymentId,
                    walletAddress: this.walletAddress,
                    network: this.selectedNetwork,
                    txHash: txHash
                })
            });

            console.log('Backend response status:', response.status);
            const result = await response.json();
            console.log('Backend response:', result);

            // Simulate delay for better UX
            await this.delay(2000);

            if (result.success) {
                console.log('Payment verified successfully');
                this.showSuccessScreen();
            } else {
                // Extract error message
                const errorMessage = result.message || result.error || 'Unknown error';
                const detailedError = result.details?.error || '';
                const fullMessage = detailedError ? `${errorMessage}: ${detailedError}` : errorMessage;
                
                console.error('Payment verification failed:', fullMessage);
                this.showErrorScreen(fullMessage);
                // Clear the tx hash input on error
                if (txHashInput) txHashInput.value = '';
            }
        } catch (error) {
            console.error('Payment verification error:', error);
            this.showErrorScreen('An error occurred: ' + error.message);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.insuranceApp = new InsuranceApp();
});
