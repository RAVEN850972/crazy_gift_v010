// Balance Page State
let currentPaymentMethod = 'stars'; // 'stars' or 'ton'
let currentBalance = 1451;
let isProcessing = false;

// Exchange rates
const EXCHANGE_RATES = {
    starsToTon: 0.01, // 1 star = 0.01 TON
    tonToStars: 100   // 1 TON = 100 stars
};

// Initialize page
function initPage() {
    initTelegramApp();
    updateBalance();
    setupEventListeners();
    updateCurrencyDisplay();
    updateQuickButtons(); // Добавляем этот вызов
}

// Setup event listeners
function setupEventListeners() {
    const amountInput = document.getElementById('amountInput');
    
    // Auto-update deposit button state
    amountInput.addEventListener('input', updateDepositButton);
    
    // Handle enter key
    amountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isProcessing) {
            processDeposit();
        }
    });
    
    // Prevent non-numeric input
    amountInput.addEventListener('keydown', (e) => {
        // Allow: backspace, delete, tab, escape, enter, home, end, left, right, down, up
        if ([46, 8, 9, 27, 13, 110, 190, 35, 36, 37, 39, 40, 38].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true)) {
            return;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });
}

// Select payment method
function selectPaymentMethod(method) {
    if (isProcessing) return;
    
    currentPaymentMethod = method;
    
    // Update button states
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelector(`.payment-method-btn.${method}`).classList.add('active');
    
    // Update currency display
    updateCurrencyDisplay();
    
    // Show/hide appropriate quick buttons
    updateQuickButtons();
    
    // Clear amount input
    document.getElementById('amountInput').value = '';
    updateDepositButton();
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// Update currency display
function updateCurrencyDisplay() {
    const currencySymbol = document.getElementById('currencySymbol');
    const amountInput = document.getElementById('amountInput');
    
    if (currentPaymentMethod === 'stars') {
        currencySymbol.textContent = '⭐';
        amountInput.placeholder = '0';
        amountInput.max = '100000';
    } else {
        currencySymbol.textContent = 'TON';
        amountInput.placeholder = '0.0';
        amountInput.max = '1000';
        amountInput.step = '0.1';
    }
}

// Update quick buttons visibility
function updateQuickButtons() {
    const starsButtons = document.getElementById('starsButtons');
    const tonButtons = document.getElementById('tonButtons');
    
    if (currentPaymentMethod === 'stars') {
        starsButtons.style.display = 'contents';
        tonButtons.style.display = 'none';
    } else {
        starsButtons.style.display = 'none';
        tonButtons.style.display = 'contents';
    }
}

// Update deposit button state
function updateDepositButton() {
    const amountInput = document.getElementById('amountInput');
    const depositBtn = document.getElementById('depositBtn');
    const amount = parseFloat(amountInput.value);
    
    if (amount && amount > 0 && !isProcessing) {
        depositBtn.disabled = false;
        depositBtn.style.opacity = '1';
    } else {
        depositBtn.disabled = true;
        depositBtn.style.opacity = '0.5';
    }
}

// Quick top-up
function quickTopup(amount, method) {
    if (isProcessing) return;
    
    // Set the correct payment method if different
    if (method !== currentPaymentMethod) {
        selectPaymentMethod(method);
    }
    
    // Set amount in input
    document.getElementById('amountInput').value = amount;
    updateDepositButton();
    
    // Auto-process deposit after short delay
    setTimeout(() => {
        processDeposit();
    }, 300);
    
    // Visual feedback
    event.target.style.transform = 'scale(0.95)';
    setTimeout(() => {
        event.target.style.transform = 'scale(1)';
    }, 150);
}

// Process deposit
async function processDeposit() {
    if (isProcessing) return;
    
    const amountInput = document.getElementById('amountInput');
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    // Validate amount limits
    if (currentPaymentMethod === 'stars' && amount > 100000) {
        showNotification('Максимальная сумма: 100,000 звёзд', 'error');
        return;
    }
    
    if (currentPaymentMethod === 'ton' && amount > 1000) {
        showNotification('Максимальная сумма: 1,000 TON', 'error');
        return;
    }
    
    isProcessing = true;
    updateDepositButton();
    
    // Show loading modal
    showLoadingModal();
    
    try {
        // Simulate payment processing
        const success = await simulatePayment(amount, currentPaymentMethod);
        
        // Hide loading modal
        hideLoadingModal();
        
        if (success) {
            // Calculate stars to add based on payment method
            let starsToAdd;
            if (currentPaymentMethod === 'stars') {
                starsToAdd = amount;
            } else {
                starsToAdd = Math.floor(amount * EXCHANGE_RATES.tonToStars);
            }
            
            // Update balance
            currentBalance += starsToAdd;
            updateBalance();
            
            // Save to localStorage
            saveBalanceToStorage();
            
            // Show success modal
            showSuccessModal(starsToAdd, amount, currentPaymentMethod);
            
            // Clear input
            amountInput.value = '';
            
            // Add to transaction history
            addToTransactionHistory('deposit', amount, currentPaymentMethod, starsToAdd);
            
        } else {
            // Show error modal
            showErrorModal('Не удалось обработать платеж. Попробуйте позже.');
        }
        
    } catch (error) {
        console.error('Payment processing error:', error);
        hideLoadingModal();
        showErrorModal('Произошла ошибка при обработке платежа');
    } finally {
        isProcessing = false;
        updateDepositButton();
    }
}

// Simulate payment processing
async function simulatePayment(amount, method) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;
    
    if (method === 'ton') {
        // For TON payments, integrate with TON Connect
        return await processTonPayment(amount);
    } else {
        // For Telegram Stars, use Telegram WebApp payments
        return await processStarsPayment(amount);
    }
}

// Process TON payment
async function processTonPayment(amount) {
    try {
        // TODO: Integrate with TON Connect
        console.log(`Processing TON payment: ${amount} TON`);
        
        // Simulate TON payment
        if (window.Telegram?.WebApp) {
            // In real implementation, use TON Connect here
            return true;
        }
        
        return Math.random() > 0.1; // 90% success rate for demo
        
    } catch (error) {
        console.error('TON payment error:', error);
        return false;
    }
}

// Process Telegram Stars payment
async function processStarsPayment(amount) {
    try {
        console.log(`Processing Stars payment: ${amount} stars`);
        
        if (window.Telegram?.WebApp) {
            // Use Telegram WebApp payments API
            const invoice = {
                title: 'Пополнение баланса',
                description: `Пополнение на ${amount} звёзд`,
                payload: `stars_${amount}_${Date.now()}`,
                provider_token: '', // Stars payments don't need provider token
                currency: 'XTR', // Telegram Stars currency code
                prices: [{
                    label: `${amount} звёзд`,
                    amount: amount // Amount in stars
                }]
            };
            
            // Open invoice (in real implementation)
            // window.Telegram.WebApp.openInvoice(invoice.payload);
            
            return true;
        }
        
        return Math.random() > 0.1; // 90% success rate for demo
        
    } catch (error) {
        console.error('Stars payment error:', error);
        return false;
    }
}

// Show loading modal
function showLoadingModal() {
    const modal = document.getElementById('loadingModal');
    modal.classList.add('show');
}

// Hide loading modal
function hideLoadingModal() {
    const modal = document.getElementById('loadingModal');
    modal.classList.remove('show');
}

// Show success modal
function showSuccessModal(starsAdded, originalAmount, paymentMethod) {
    const modal = document.getElementById('successModal');
    const message = document.getElementById('successMessage');
    
    if (paymentMethod === 'stars') {
        message.textContent = `Ваш баланс пополнен на ${starsAdded.toLocaleString()} звёзд`;
    } else {
        message.textContent = `Платеж ${originalAmount} TON успешно обработан. Получено ${starsAdded.toLocaleString()} звёзд`;
    }
    
    modal.classList.add('show');
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Show error modal
function showErrorModal(errorMessage) {
    const modal = document.getElementById('errorModal');
    const message = document.getElementById('errorMessage');
    
    message.textContent = errorMessage;
    modal.classList.add('show');
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
}

// Close result modal
function closeResultModal() {
    document.getElementById('successModal').classList.remove('show');
    document.getElementById('errorModal').classList.remove('show');
}

// Add to transaction history
function addToTransactionHistory(type, amount, method, starsAmount) {
    try {
        let history = JSON.parse(localStorage.getItem('transactionHistory') || '[]');
        
        const transaction = {
            id: Date.now(),
            type: type,
            amount: amount,
            method: method,
            starsAmount: starsAmount,
            timestamp: new Date().toISOString(),
            status: 'completed'
        };
        
        history.unshift(transaction);
        
        // Keep only last 100 transactions
        if (history.length > 100) {
            history = history.slice(0, 100);
        }
        
        localStorage.setItem('transactionHistory', JSON.stringify(history));
    } catch (error) {
        console.error('Error saving transaction history:', error);
    }
}

// Save balance to storage
function saveBalanceToStorage() {
    try {
        localStorage.setItem('gameBalance', currentBalance.toString());
    } catch (error) {
        console.error('Error saving balance:', error);
    }
}

// Load balance from storage
function loadBalanceFromStorage() {
    try {
        const savedBalance = localStorage.getItem('gameBalance');
        if (savedBalance) {
            currentBalance = parseInt(savedBalance);
        }
    } catch (error) {
        console.error('Error loading balance:', error);
    }
}

// Update balance display
function updateBalance() {
    const balanceElement = document.getElementById('balance');
    if (balanceElement) {
        balanceElement.textContent = currentBalance.toLocaleString();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1001;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        max-width: 300px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background: linear-gradient(135deg, #00ff87, #00cc6a);' : ''}
        ${type === 'info' ? 'background: linear-gradient(135deg, #3b82f6, #1d4ed8);' : ''}
        ${type === 'error' ? 'background: linear-gradient(135deg, #ef4444, #dc2626);' : ''}
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide notification
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Back navigation
function goBack() {
    if (isProcessing) {
        showNotification('Дождитесь завершения обработки платежа', 'info');
        return;
    }
    
    document.body.style.opacity = '0.8';
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 200);
}

// Initialize Telegram WebApp
function initTelegramApp() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Set theme colors
        if (tg.themeParams.bg_color) {
            document.documentElement.style.setProperty('--bg-primary', tg.themeParams.bg_color);
        }
        
        // Handle back button
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            if (!isProcessing) {
                goBack();
            }
        });
        
        // Handle payment callbacks
        tg.onEvent('invoiceClosed', (eventData) => {
            if (eventData.status === 'paid') {
                console.log('Payment successful');
                // Handle successful payment
            } else if (eventData.status === 'cancelled') {
                console.log('Payment cancelled');
                isProcessing = false;
                updateDepositButton();
                hideLoadingModal();
            } else if (eventData.status === 'failed') {
                console.log('Payment failed');
                isProcessing = false;
                updateDepositButton();
                hideLoadingModal();
                showErrorModal('Платеж не удался');
            }
        });
    }
}

// Handle modal backdrop clicks
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('result-modal-overlay')) {
        closeResultModal();
    }
});

// Handle escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!isProcessing) {
            closeResultModal();
        }
    }
});

// Prevent form submission
document.addEventListener('submit', (e) => {
    e.preventDefault();
});

// Add entrance animations
function addEntranceAnimations() {
    setTimeout(() => {
        document.querySelectorAll('.payment-methods-section, .amount-input-section, .quick-topup-section').forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = 'all 0.6s ease';
            
            setTimeout(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, index * 150);
        });
    }, 100);
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadBalanceFromStorage();
    initPage();
    addEntranceAnimations();
});