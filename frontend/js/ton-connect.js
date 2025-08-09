// Рабочая интеграция TON Connect для тестирования
class SimpleTonConnect {
    constructor() {
        this.isConnected = false;
        this.walletAddress = null;
        this.balance = 0;
        this.init();
    }

    async init() {
        console.log('🔗 Инициализация TON Connect...');
        
        try {
            // Проверяем доступность TON Connect UI
            if (typeof window.TonConnectUI === 'undefined') {
                console.log('⚠️ TON Connect UI не загружен, используем демо режим');
                this.useDemoMode = true;
                return;
            }

            // Инициализируем TON Connect UI с базовой конфигурацией
            this.tonConnectUI = new window.TonConnectUI({
                manifestUrl: this.getManifestUrl(),
                buttonRootId: null, // Не используем автоматическую кнопку
                uiPreferences: {
                    theme: 'DARK',
                    borderRadius: 'm'
                }
            });

            // Слушаем изменения состояния
            this.tonConnectUI.onStatusChange(wallet => {
                this.handleWalletChange(wallet);
            });

            // Проверяем текущее состояние
            const currentWallet = this.tonConnectUI.wallet;
            if (currentWallet) {
                this.handleWalletChange(currentWallet);
            }

        } catch (error) {
            console.log('❌ Ошибка инициализации TON Connect:', error);
            this.useDemoMode = true;
        }
    }

    getManifestUrl() {
        // Возвращаем базовый манифест для тестирования
        const baseUrl = window.location.origin;
        return `${baseUrl}/tonconnect-manifest.json`;
    }

    async connectWallet() {
        console.log('🔌 Попытка подключения кошелька...');

        if (this.useDemoMode) {
            return this.connectDemoWallet();
        }

        try {
            if (!this.tonConnectUI) {
                throw new Error('TON Connect UI не инициализирован');
            }

            // Открываем модальное окно подключения
            await this.tonConnectUI.openModal();
            
        } catch (error) {
            console.log('❌ Ошибка подключения, переключаемся на демо режим:', error);
            return this.connectDemoWallet();
        }
    }

    async connectDemoWallet() {
        console.log('🎭 Подключение демо кошелька...');
        
        // Симулируем процесс подключения
        this.showConnectingAnimation();
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Генерируем демо данные
        const demoAddress = 'EQD' + Math.random().toString(36).substr(2, 45);
        const demoBalance = (Math.random() * 100).toFixed(2);
        
        this.handleWalletChange({
            account: {
                address: demoAddress,
                chain: '-239'
            },
            device: {
                appName: 'Demo Wallet',
                appVersion: '1.0.0'
            }
        });
        
        this.balance = parseFloat(demoBalance);
        this.updateWalletUI();
        
        this.showNotification('Демо кошелек подключен! (Для тестирования)', 'success');
        
        return true;
    }

    showConnectingAnimation() {
        const walletBtn = document.getElementById('walletButton');
        if (walletBtn) {
            const originalHTML = walletBtn.innerHTML;
            
            walletBtn.innerHTML = `
                <div class="connecting-animation">
                    <div class="spinner"></div>
                    <span>Подключение...</span>
                </div>
            `;
            
            // Добавляем стили для анимации
            const style = document.createElement('style');
            style.textContent = `
                .connecting-animation {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            
            if (!document.querySelector('#connecting-styles')) {
                style.id = 'connecting-styles';
                document.head.appendChild(style);
            }
        }
    }

    async handleWalletChange(wallet) {
        if (wallet) {
            console.log('✅ Кошелек подключен:', wallet);
            this.isConnected = true;
            this.walletAddress = wallet.account.address;
            
            // Получаем баланс если это не демо режим
            if (!this.useDemoMode) {
                await this.updateBalance();
            }
            
            this.updateWalletUI();
            
            if (!this.useDemoMode) {
                this.showNotification('TON кошелек успешно подключен!', 'success');
            }
        } else {
            console.log('❌ Кошелек отключен');
            this.isConnected = false;
            this.walletAddress = null;
            this.balance = 0;
            this.updateWalletUI();
            this.showNotification('Кошелек отключен', 'info');
        }
    }

    async updateBalance() {
        if (!this.walletAddress) return;

        try {
            // Используем публичный API TON
            const response = await fetch(
                `https://toncenter.com/api/v2/getAddressBalance?address=${this.walletAddress}`,
                {
                    headers: {
                        'X-API-Key': 'YOUR_API_KEY' // В продакшене нужен API ключ
                    }
                }
            );
            
            const data = await response.json();
            
            if (data.ok) {
                // Конвертируем из nanotons в TON
                this.balance = parseFloat(data.result) / 1000000000;
            } else {
                console.log('⚠️ Не удалось получить баланс, используем 0');
                this.balance = 0;
            }
        } catch (error) {
            console.log('⚠️ Ошибка получения баланса:', error);
            this.balance = 0;
        }
    }

    updateWalletUI() {
        const walletBtn = document.getElementById('walletButton');
        
        if (!walletBtn) return;
        
        if (this.isConnected && this.walletAddress) {
            // Показываем информацию о подключенном кошельке
            const shortAddress = this.formatAddress(this.walletAddress);
            const demoLabel = this.useDemoMode ? ' (Demo)' : '';
            
            walletBtn.innerHTML = `
                <img src="assets/icons/ton_icon.png" alt="TON" class="wallet-icon">
                <div class="wallet-info">
                    <div class="wallet-address">${shortAddress}${demoLabel}</div>
                    <div class="wallet-balance">${this.balance.toFixed(2)} TON</div>
                </div>
            `;
            
            walletBtn.onclick = () => this.showWalletModal();
            
            // Добавляем стили для информации о кошельке
            this.addWalletStyles();
            
        } else {
            // Показываем кнопку подключения
            walletBtn.innerHTML = `
                <img src="assets/icons/ton_icon.png" alt="TON" class="wallet-icon">
                <span>Подключить кошелек</span>
            `;
            
            walletBtn.onclick = () => this.connectWallet();
        }
    }

    addWalletStyles() {
        if (document.querySelector('#wallet-info-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'wallet-info-styles';
        style.textContent = `
            .wallet-info {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 2px;
            }
            .wallet-address {
                font-size: 12px;
                opacity: 0.8;
            }
            .wallet-balance {
                font-size: 14px;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }

    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }

    async disconnectWallet() {
        try {
            if (this.tonConnectUI && !this.useDemoMode) {
                await this.tonConnectUI.disconnect();
            } else {
                // Для демо режима просто сбрасываем состояние
                this.handleWalletChange(null);
            }
        } catch (error) {
            console.log('❌ Ошибка отключения кошелька:', error);
            // Принудительно сбрасываем состояние
            this.handleWalletChange(null);
        }
    }

    showWalletModal() {
        const modal = document.createElement('div');
        modal.className = 'ton-wallet-modal';
        
        const demoInfo = this.useDemoMode ? `
            <div class="demo-notice">
                <strong>🎭 Демо режим</strong><br>
                Это тестовый кошелек для демонстрации. В продакшене будет подключен реальный TON кошелек.
            </div>
        ` : '';
        
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>TON Кошелек</h3>
                    <button onclick="this.closest('.ton-wallet-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${demoInfo}
                    <div class="wallet-details">
                        <div class="detail-item">
                            <label>Адрес:</label>
                            <div class="address-container">
                                <span class="address">${this.walletAddress}</span>
                                <button onclick="navigator.clipboard.writeText('${this.walletAddress}'); this.textContent='Скопировано!'">
                                    Копировать
                                </button>
                            </div>
                        </div>
                        <div class="detail-item">
                            <label>Баланс:</label>
                            <span class="balance">${this.balance.toFixed(4)} TON</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="disconnect-btn" onclick="simpleTonConnect.disconnectWallet(); this.closest('.ton-wallet-modal').remove();">
                        Отключить кошелек
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем стили для модального окна
        this.addModalStyles();
        
        document.body.appendChild(modal);
    }

    addModalStyles() {
        if (document.querySelector('#ton-modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ton-modal-styles';
        style.textContent = `
            .ton-wallet-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .ton-wallet-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
            }
            .ton-wallet-modal .modal-content {
                position: relative;
                background: #1a1a1a;
                border-radius: 16px;
                max-width: 400px;
                width: 100%;
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: white;
            }
            .ton-wallet-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .ton-wallet-modal .modal-header h3 {
                margin: 0;
                font-size: 18px;
            }
            .ton-wallet-modal .modal-header button {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            }
            .ton-wallet-modal .modal-body {
                padding: 20px;
            }
            .demo-notice {
                background: rgba(255, 215, 0, 0.1);
                border: 1px solid rgba(255, 215, 0, 0.3);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 20px;
                font-size: 14px;
                line-height: 1.4;
            }
            .wallet-details {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .detail-item {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .detail-item label {
                font-size: 14px;
                color: #cccccc;
                font-weight: 500;
            }
            .address-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .address {
                flex: 1;
                background: rgba(255, 255, 255, 0.05);
                padding: 8px 12px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                word-break: break-all;
            }
            .address-container button {
                background: rgba(255, 215, 0, 0.2);
                border: 1px solid rgba(255, 215, 0, 0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                white-space: nowrap;
            }
            .balance {
                font-size: 16px;
                font-weight: 600;
                color: #00ff87;
            }
            .ton-wallet-modal .modal-footer {
                padding: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .disconnect-btn {
                width: 100%;
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.5);
                color: #ef4444;
                padding: 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            }
            .disconnect-btn:hover {
                background: rgba(239, 68, 68, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    showNotification(message, type = 'info') {
        // Используем существующую систему уведомлений
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`📢 ${message}`);
        }
    }
}

// Инициализируем TON Connect
const simpleTonConnect = new SimpleTonConnect();

// Экспортируем для глобального использования
window.simpleTonConnect = simpleTonConnect;
window.tonWallet = simpleTonConnect; // Для совместимости с существующим кодом

console.log('🔗 TON Connect модуль загружен');