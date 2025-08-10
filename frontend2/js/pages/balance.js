/**
 * Balance Page Script
 * Страница пополнения баланса с интеграцией TON и Telegram Stars
 */

class BalancePageManager {
    constructor() {
        this.selectedMethod = 'stars';
        this.amount = 0;
        this.conversionRates = {
            stars: { rate: 0.02, currency: 'USD' }, // 1 star = $0.02
            ton: { rate: 2.5, currency: 'USD' }     // 1 TON = $2.5
        };
        this.isProcessing = false;
        this.apiAvailable = false;
        this.depositHistory = [];
        
        this.init();
    }

    /**
     * Инициализация страницы баланса
     */
    async init() {
        console.log('💰 Инициализация страницы баланса...');
        
        try {
            // Проверяем доступность API
            this.apiAvailable = await window.apiClient.checkAvailability();
            
            // Настраиваем Back Button
            this.setupBackButton();
            
            // Загружаем данные
            await this.loadData();
            
            // Настраиваем UI
            this.setupUI();
            
            // Настраиваем обработчики событий
            this.setupEventListeners();
            
            console.log('✅ Страница баланса инициализирована');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации страницы баланса:', error);
            this.setupFallbackMode();
        }
    }

    /**
     * Настройка кнопки "Назад"
     */
    setupBackButton() {
        if (window.telegramApp?.isAvailableAPI()) {
            window.telegramApp.showBackButton(() => {
                window.Utils.URL.navigateTo('index.html');
            });
        }
    }

    /**
     * Загрузка данных
     */
    async loadData() {
        try {
            // Обновляем текущий баланс
            await this.updateCurrentBalance();
            
            // Загружаем историю депозитов
            await this.loadDepositHistory();
            
            // Обновляем курсы валют
            await this.updateConversionRates();
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.setupDemoData();
        }
    }

    /**
     * Обновление текущего баланса
     */
    async updateCurrentBalance() {
        if (!this.apiAvailable || !window.GameState?.currentUserId) {
            return;
        }
        
        try {
            const balanceData = await window.apiClient.getUserBalance(window.GameState.currentUserId);
            
            // Обновляем состояние игры
            if (window.GameState) {
                window.GameState.balance = balanceData.balance || 0;
            }
            
            // Обновляем отображение
            this.updateBalanceDisplay(balanceData.balance || 0);
            
        } catch (error) {
            console.error('Ошибка обновления баланса:', error);
        }
    }

    /**
     * Загрузка истории депозитов
     */
    async loadDepositHistory() {
        if (!this.apiAvailable || !window.GameState?.currentUserId) {
            this.depositHistory = this.getDemoHistory();
            return;
        }
        
        try {
            const historyData = await window.apiClient.getUserHistory(
                window.GameState.currentUserId, 
                { type: 'deposit', limit: 10 }
            );
            
            this.depositHistory = historyData.transactions || [];
            
        } catch (error) {
            console.error('Ошибка загрузки истории:', error);
            this.depositHistory = this.getDemoHistory();
        }
    }

    /**
     * Обновление курсов валют
     */
    async updateConversionRates() {
        // В реальном приложении здесь бы был запрос к API курсов валют
        // Пока используем фиксированные курсы
        console.log('💱 Курсы валют обновлены');
    }

    /**
     * Настройка UI
     */
    setupUI() {
        // Обновляем текущий баланс
        this.updateBalanceDisplay(window.GameState?.balance || 0);
        
        // Настраиваем методы оплаты
        this.setupPaymentMethods();
        
        // Настраиваем быстрые суммы
        this.setupQuickAmounts();
        
        // Настраиваем поле ввода суммы
        this.setupAmountInput();
        
        // Обновляем историю депозитов
        this.updateDepositHistory();
        
        // Показываем индикатор режима
        this.showModeIndicator();
    }

    /**
     * Обновление отображения баланса
     */
    updateBalanceDisplay(balance) {
        const balanceElement = document.querySelector('.current-balance-amount');
        if (balanceElement) {
            window.Utils.Animation.animateCounter(balanceElement, 
                parseInt(balanceElement.textContent) || 0, 
                balance, 
                800
            );
        }
        
        // Обновляем USD эквивалент
        const usdElement = document.querySelector('.balance-usd-equivalent');
        if (usdElement) {
            const usdValue = (balance * 0.01).toFixed(2); // Примерный курс
            usdElement.textContent = `≈ $${usdValue}`;
        }
    }

    /**
     * Настройка методов оплаты
     */
    setupPaymentMethods() {
        const methods = document.querySelectorAll('.payment-method');
        
        methods.forEach(method => {
            method.addEventListener('click', () => {
                // Убираем активный класс у всех методов
                methods.forEach(m => m.classList.remove('active'));
                
                // Добавляем активный класс к выбранному
                method.classList.add('active');
                
                // Сохраняем выбранный метод
                this.selectedMethod = method.dataset.method;
                
                // Haptic feedback
                window.haptic?.ui.selection();
                
                // Обновляем конверсию
                this.updateConversion();
                
                console.log(`💳 Выбран метод оплаты: ${this.selectedMethod}`);
            });
        });
        
        // Устанавливаем метод по умолчанию
        const defaultMethod = document.querySelector('.payment-method.stars');
        if (defaultMethod) {
            defaultMethod.click();
        }
    }

    /**
     * Настройка быстрых сумм
     */
    setupQuickAmounts() {
        const quickAmounts = document.querySelectorAll('.quick-amount-btn');
        
        quickAmounts.forEach(btn => {
            btn.addEventListener('click', () => {
                // Убираем активный класс у всех кнопок
                quickAmounts.forEach(b => b.classList.remove('active'));
                
                // Добавляем активный класс к выбранной
                btn.classList.add('active');
                
                // Устанавливаем сумму
                const amount = parseInt(btn.dataset.amount);
                this.setAmount(amount);
                
                // Haptic feedback
                window.haptic?.ui.buttonPress();
            });
        });
    }

    /**
     * Настройка поля ввода суммы
     */
    setupAmountInput() {
        const amountInput = document.querySelector('.amount-input');
        if (!amountInput) return;
        
        amountInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) || 0;
            this.setAmount(value);
            
            // Убираем активные классы у быстрых сумм
            document.querySelectorAll('.quick-amount-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        });
        
        amountInput.addEventListener('focus', () => {
            amountInput.style.borderColor = 'var(--accent-yellow)';
        });
        
        amountInput.addEventListener('blur', () => {
            amountInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        });
    }

    /**
     * Установка суммы
     */
    setAmount(amount) {
        this.amount = Math.max(0, amount);
        
        // Обновляем поле ввода
        const amountInput = document.querySelector('.amount-input');
        if (amountInput && parseInt(amountInput.value) !== this.amount) {
            amountInput.value = this.amount || '';
        }
        
        // Обновляем конверсию
        this.updateConversion();
        
        // Обновляем состояние кнопки
        this.updateDepositButton();
    }

    /**
     * Обновление конверсии
     */
    updateConversion() {
        const conversionInfo = document.querySelector('.conversion-info');
        if (!conversionInfo || this.amount <= 0) {
            if (conversionInfo) {
                conversionInfo.style.display = 'none';
            }
            return;
        }
        
        const rate = this.conversionRates[this.selectedMethod];
        if (!rate) return;
        
        let convertedAmount;
        let displayText;
        
        if (this.selectedMethod === 'stars') {
            convertedAmount = Math.ceil(this.amount / rate.rate); // Округляем вверх для звезд
            displayText = `${convertedAmount} ⭐ Telegram Stars`;
        } else if (this.selectedMethod === 'ton') {
            convertedAmount = (this.amount * rate.rate / 100).toFixed(4); // TON с точностью до 4 знаков
            displayText = `${convertedAmount} TON`;
        }
        
        conversionInfo.innerHTML = `
            <div class="conversion-rate">Курс: 1 💎 = ${rate.rate} ${rate.currency}</div>
            <div class="conversion-amount">${displayText}</div>
        `;
        
        conversionInfo.style.display = 'block';
    }

    /**
     * Обновление кнопки депозита
     */
    updateDepositButton() {
        const depositBtn = document.querySelector('.deposit-button');
        if (!depositBtn) return;
        
        const isEnabled = this.amount > 0 && !this.isProcessing;
        
        depositBtn.disabled = !isEnabled;
        depositBtn.style.opacity = isEnabled ? '1' : '0.5';
        depositBtn.style.cursor = isEnabled ? 'pointer' : 'not-allowed';
        
        if (this.isProcessing) {
            depositBtn.innerHTML = `
                <div class="loading-spinner"></div>
                Обработка...
            `;
        } else {
            depositBtn.innerHTML = `
                <span>Пополнить ${this.amount} 💎</span>
                <img src="assets/icons/arrow_right.svg" alt="" class="deposit-button-icon">
            `;
        }
    }

    /**
     * Обновление истории депозитов
     */
    updateDepositHistory() {
        const historyList = document.querySelector('.deposit-history-list');
        const emptyState = document.querySelector('.deposit-history-empty');
        
        if (!historyList) return;
        
        if (this.depositHistory.length === 0) {
            historyList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        historyList.style.display = 'flex';
        historyList.innerHTML = '';
        
        this.depositHistory.slice(0, 5).forEach(deposit => {
            const item = document.createElement('div');
            item.className = 'deposit-history-item';
            
            item.innerHTML = `
                <div class="deposit-info">
                    <div class="deposit-method">${deposit.method === 'stars' ? '⭐ Telegram Stars' : '💎 TON'}</div>
                    <div class="deposit-date">${window.Utils.Date.timeAgo(deposit.created_at)}</div>
                </div>
                <div class="deposit-amount">
                    +${deposit.amount} 💎
                    <div class="deposit-status ${deposit.status}">${deposit.status}</div>
                </div>
            `;
            
            historyList.appendChild(item);
        });
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Кнопка депозита
        const depositBtn = document.querySelector('.deposit-button');
        if (depositBtn) {
            depositBtn.addEventListener('click', () => this.processDeposit());
        }
        
        // Просмотр всей истории
        const viewAllBtn = document.querySelector('.view-all-btn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => this.showFullHistory());
        }
        
        // Обновление при фокусе
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateCurrentBalance();
            }
        });
    }

    /**
     * Обработка депозита
     */
    async processDeposit() {
        if (this.isProcessing || this.amount <= 0) return;
        
        this.isProcessing = true;
        this.updateDepositButton();
        
        window.haptic?.ui.buttonPress();
        
        try {
            if (this.apiAvailable) {
                await this.processRealDeposit();
            } else {
                await this.processDemoDeposit();
            }
            
        } catch (error) {
            console.error('Ошибка обработки депозита:', error);
            window.notifications?.error('Ошибка обработки платежа');
            
        } finally {
            this.isProcessing = false;
            this.updateDepositButton();
        }
    }

    /**
     * Обработка реального депозита
     */
    async processRealDeposit() {
        const loadingModal = window.modal?.loading('Создание платежа...', 'Пожалуйста, подождите');
        
        try {
            let paymentData;
            
            if (this.selectedMethod === 'stars') {
                // Создаем инвойс для Telegram Stars
                const starsAmount = Math.ceil(this.amount / this.conversionRates.stars.rate);
                paymentData = await window.apiClient.createStarsInvoice(
                    window.GameState.currentUserId,
                    starsAmount
                );
                
                // Открываем инвойс в Telegram
                window.telegramApp?.openInvoice(paymentData.invoice_url, (result) => {
                    this.handlePaymentResult(result, paymentData.transaction_id);
                });
                
            } else if (this.selectedMethod === 'ton') {
                // Создаем депозит TON
                paymentData = await window.apiClient.createTonDeposit(
                    window.GameState.currentUserId,
                    this.amount
                );
                
                // Открываем TON кошелек
                this.openTonPayment(paymentData);
            }
            
            window.modal?.hide(loadingModal);
            
        } catch (error) {
            window.modal?.hide(loadingModal);
            throw error;
        }
    }

    /**
     * Обработка демо депозита
     */
    async processDemoDeposit() {
        // Показываем модальное окно подтверждения
        const confirmed = await new Promise(resolve => {
            window.modal?.confirm(
                'Демо пополнение',
                `Пополнить баланс на ${this.amount} 💎 через ${this.selectedMethod === 'stars' ? 'Telegram Stars' : 'TON'}?`,
                () => resolve(true)
            );
        });
        
        if (!confirmed) return;
        
        // Имитируем задержку обработки
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Обновляем баланс в демо режиме
        if (window.GameState) {
            window.GameState.balance += this.amount;
            window.gameStorage?.saveGameState(window.GameState);
        }
        
        // Добавляем запись в историю
        this.depositHistory.unshift({
            id: Date.now(),
            method: this.selectedMethod,
            amount: this.amount,
            status: 'completed',
            created_at: new Date().toISOString()
        });
        
        // Обновляем UI
        this.updateBalanceDisplay(window.GameState.balance);
        this.updateDepositHistory();
        
        // Показываем успешное уведомление
        window.notifications?.success('Баланс успешно пополнен!');
        window.haptic?.game.purchase();
        
        // Сбрасываем форму
        this.setAmount(0);
    }

    /**
     * Показ полной истории
     */
    showFullHistory() {
        // В реальном приложении здесь бы была отдельная страница или модальное окно
        window.notifications?.info('Полная история пока не реализована');
        window.haptic?.ui.buttonPress();
    }

    /**
     * Обработка результата платежа
     */
    handlePaymentResult(result, transactionId) {
        if (result.status === 'paid') {
            // Платеж успешен - обновляем данные
            this.updateCurrentBalance();
            this.loadDepositHistory();
            
            window.notifications?.success('Платеж успешно обработан!');
            window.haptic?.game.purchase();
            
            // Сбрасываем форму
            this.setAmount(0);
            
        } else if (result.status === 'cancelled') {
            window.notifications?.warning('Платеж отменен');
            
        } else {
            window.notifications?.error('Ошибка обработки платежа');
        }
    }

    /**
     * Открытие TON платежа
     */
    openTonPayment(paymentData) {
        if (window.tonConnect?.isConnected()) {
            // Отправляем транзакцию через TON Connect
            window.tonConnect.sendTransaction({
                to: paymentData.to_address,
                value: paymentData.amount,
                comment: paymentData.comment
            }).then(result => {
                this.handlePaymentResult({ status: 'paid' }, paymentData.transaction_id);
            }).catch(error => {
                console.error('TON payment error:', error);
                window.notifications?.error('Ошибка TON платежа');
            });
        } else {
            // Показываем QR код для оплаты
            this.showTonQRCode(paymentData);
        }
    }

    /**
     * Показ QR кода для TON оплаты
     */
    showTonQRCode(paymentData) {
        const qrContent = `
            <div style="text-align: center;">
                <div style="background: white; padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 20px;">
                    <div id="qr-code"></div>
                </div>
                <p style="margin: 0; color: var(--text-muted); font-size: 14px;">
                    Отсканируйте QR код в TON кошельке
                </p>
                <p style="margin: 10px 0 0; color: var(--text-muted); font-size: 12px;">
                    Сумма: ${paymentData.amount} TON
                </p>
            </div>
        `;
        
        window.modal?.create('ton-qr-modal', {
            title: 'Оплата TON',
            content: qrContent,
            size: 'medium',
            buttons: [{
                text: 'Отмена',
                type: 'secondary',
                action: () => true
            }]
        });
        
        window.modal?.show('ton-qr-modal');
        
        // Генерируем QR код (в реальном приложении использовать библиотеку QR кодов)
        setTimeout(() => {
            const qrElement = document.getElementById('qr-code');
            if (qrElement) {
                qrElement.innerHTML = '📱 QR Code';
                qrElement.style.cssText = 'font-size: 48px; padding: 20px;';
            }
        }, 100);
    }

    /**
     * Получение демо истории
     */
    getDemoHistory() {
        return [
            {
                id: 1,
                method: 'stars',
                amount: 100,
                status: 'completed',
                created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: 2,
                method: 'ton',
                amount: 500,
                status: 'completed', 
                created_at: new Date(Date.now() - 172800000).toISOString()
            }
        ];
    }

    /**
     * Показ индикатора режима
     */
    showModeIndicator() {
        if (!this.apiAvailable) {
            const indicator = document.createElement('div');
            indicator.className = 'demo-mode-indicator show';
            indicator.textContent = '🎭 Демо режим - платежи имитируются';
            
            const existing = document.querySelector('.demo-mode-indicator');
            if (existing) existing.remove();
            
            document.body.appendChild(indicator);
            
            setTimeout(() => {
                indicator.classList.remove('show');
                setTimeout(() => indicator.remove(), 300);
            }, 5000);
        }
    }

    /**
     * Настройка fallback режима
     */
    setupFallbackMode() {
        console.log('⚠️ Настройка fallback режима для страницы баланса');
        this.setupDemoData();
        this.setupUI();
        this.setupEventListeners();
        
        window.notifications?.warning('Работаем в автономном режиме', {
            duration: 4000
        });
    }

    /**
     * Настройка демо данных
     */
    setupDemoData() {
        this.depositHistory = this.getDemoHistory();
    }
}

// Создаем глобальный экземпляр
window.balancePage = new BalancePageManager();

// Инициализируем когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.balancePage.init();
    });
} else {
    window.balancePage.init();
}

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BalancePageManager;
}