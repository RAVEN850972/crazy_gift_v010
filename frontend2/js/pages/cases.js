/**
 * Cases Page Script
 * Страница открытия кейсов с анимациями и интеграцией API
 */

class CasesPageManager {
    constructor() {
        this.currentCase = null;
        this.isOpening = false;
        this.apiAvailable = false;
        this.openingAnimation = null;
        
        this.init();
    }

    async init() {
        console.log('📦 Инициализация страницы кейсов...');
        
        try {
            this.apiAvailable = await window.apiClient.checkAvailability();
            this.setupBackButton();
            await this.loadCaseData();
            this.setupUI();
            this.setupEventListeners();
            
            console.log('✅ Страница кейсов инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации страницы кейсов:', error);
            this.setupFallbackMode();
        }
    }

    setupBackButton() {
        if (window.telegramApp?.isAvailableAPI()) {
            window.telegramApp.showBackButton(() => {
                window.Utils.URL.navigateTo('index.html');
            });
        }
    }

    async loadCaseData() {
        const caseId = sessionStorage.getItem('selectedCaseId');
        if (!caseId) {
            window.Utils.URL.navigateTo('index.html');
            return;
        }

        try {
            if (this.apiAvailable) {
                this.currentCase = await window.apiClient.getCaseDetails(caseId);
            } else {
                this.currentCase = this.getDemoCaseData(caseId);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных кейса:', error);
            this.currentCase = this.getDemoCaseData(caseId);
        }
    }

    getDemoCaseData(caseId) {
        const demoCases = {
            'demo_mystery_box': {
                id: 'demo_mystery_box',
                name: 'Mystery Box',
                description: 'Таинственная коробка с удивительными призами',
                price: 100,
                image: 'assets/images/cases/mystery_box.png',
                items: [
                    { name: 'Gold Coin', rarity: 'common', value: 50, chance: 45, image: 'assets/images/items/gold_coin.png' },
                    { name: 'Silver Coin', rarity: 'rare', value: 100, chance: 30, image: 'assets/images/items/silver_coin.png' },
                    { name: 'Diamond', rarity: 'epic', value: 300, chance: 20, image: 'assets/images/items/diamond.png' },
                    { name: 'Golden Crown', rarity: 'legendary', value: 1000, chance: 5, image: 'assets/images/items/crown.png' }
                ]
            }
        };
        return demoCases[caseId] || demoCases['demo_mystery_box'];
    }

    setupUI() {
        if (!this.currentCase) return;

        this.updateCaseHeader();
        this.updateCaseContents();
        this.updateOpenButton();
    }

    updateCaseHeader() {
        const headerImg = document.querySelector('.case-detail-image');
        const headerName = document.querySelector('.case-detail-name');
        const headerDesc = document.querySelector('.case-detail-description');
        const headerPrice = document.querySelector('.case-detail-price');

        if (headerImg) headerImg.src = this.currentCase.image;
        if (headerName) headerName.textContent = this.currentCase.name;
        if (headerDesc) headerDesc.textContent = this.currentCase.description;
        if (headerPrice) headerPrice.textContent = `${this.currentCase.price} 💎`;
    }

    updateCaseContents() {
        const contentsGrid = document.querySelector('.case-contents-grid');
        if (!contentsGrid || !this.currentCase.items) return;

        contentsGrid.innerHTML = '';

        this.currentCase.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'case-item';
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="case-item-image" onerror="this.src='assets/images/placeholder-item.png'">
                <div class="case-item-name">${item.name}</div>
                <div class="case-item-rarity ${item.rarity}">${item.rarity}</div>
            `;
            contentsGrid.appendChild(itemElement);
        });
    }

    updateOpenButton() {
        const openBtn = document.querySelector('.open-case-btn');
        if (!openBtn) return;

        const canAfford = this.canAffordCase();
        const balance = window.GameState?.balance || 0;

        openBtn.disabled = !canAfford || this.isOpening;
        openBtn.style.opacity = (canAfford && !this.isOpening) ? '1' : '0.5';

        if (this.isOpening) {
            openBtn.innerHTML = `
                <div class="loading-spinner"></div>
                Открываем...
            `;
            openBtn.classList.add('opening');
        } else if (!canAfford) {
            openBtn.innerHTML = `
                Недостаточно средств (${balance}/${this.currentCase.price} 💎)
            `;
        } else {
            openBtn.innerHTML = `
                <img src="assets/icons/box.svg" alt="" class="open-case-icon">
                Открыть за ${this.currentCase.price} 💎
            `;
            openBtn.classList.remove('opening');
        }
    }

    setupEventListeners() {
        const openBtn = document.querySelector('.open-case-btn');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.openCase());
        }
    }

    async openCase() {
        if (this.isOpening || !this.canAffordCase()) return;

        this.isOpening = true;
        this.updateOpenButton();

        window.haptic?.game.caseOpen();

        try {
            let result;
            if (this.apiAvailable) {
                result = await this.openRealCase();
            } else {
                result = await this.openDemoCase();
            }

            await this.showPrizeAnimation(result);
            this.updateBalance();
            
        } catch (error) {
            console.error('Ошибка открытия кейса:', error);
            window.notifications?.error('Ошибка открытия кейса');
        } finally {
            this.isOpening = false;
            this.updateOpenButton();
        }
    }

    async openRealCase() {
        return await window.apiClient.openCase(
            this.currentCase.id,
            window.GameState.currentUserId
        );
    }

    async openDemoCase() {
        // Имитируем задержку сервера
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Выбираем случайный приз по весам
        const prize = window.Utils.Game.weightedRandom(
            this.currentCase.items.map(item => ({
                ...item,
                weight: item.chance
            }))
        );

        // Обновляем баланс в демо режиме
        if (window.GameState) {
            window.GameState.balance -= this.currentCase.price;
            window.gameStorage?.saveGameState(window.GameState);
        }

        return {
            item: prize,
            won: true
        };
    }

    async showPrizeAnimation(result) {
        if (!result.item) return;

        const prize = result.item;
        
        // Создаем модальное окно с призом
        const prizeModal = this.createPrizeModal(prize);
        document.body.appendChild(prizeModal);

        // Показываем с анимацией
        setTimeout(() => {
            prizeModal.classList.add('show');
        }, 100);

        // Haptic feedback в зависимости от редкости
        if (prize.rarity === 'legendary' || prize.rarity === 'mythic') {
            window.haptic?.game.rareDrop();
        } else {
            window.haptic?.game.achievement();
        }

        return new Promise(resolve => {
            const closeBtn = prizeModal.querySelector('.prize-btn-primary');
            closeBtn.onclick = () => {
                prizeModal.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(prizeModal);
                    resolve();
                }, 300);
            };
        });
    }

    createPrizeModal(prize) {
        const modal = document.createElement('div');
        modal.className = 'prize-modal';
        
        const rarityColor = window.Utils.Game.getRarityColor(prize.rarity);
        
        modal.innerHTML = `
            <div class="prize-modal-overlay"></div>
            <div class="prize-content">
                <div class="prize-header">
                    <h2 class="case-name">${this.currentCase.name}</h2>
                    <p class="congrats-text">Поздравляем! Вы выиграли:</p>
                </div>
                
                <div class="prize-main">
                    <div class="prize-image-container" style="background: linear-gradient(135deg, ${rarityColor}20, ${rarityColor}40);">
                        <img src="${prize.image}" alt="${prize.name}" class="prize-image" onerror="this.src='assets/images/placeholder-item.png'">
                        <div class="prize-values-overlay">
                            <div class="prize-value-stars">
                                <img src="assets/icons/star.svg" alt="" class="value-icon-small">
                                ${prize.value || 0}
                            </div>
                            <div class="prize-value-ton">
                                <img src="assets/icons/ton.svg" alt="" class="value-icon-small">
                                ${(prize.value * 0.01).toFixed(3)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="prize-info">
                        <h1 class="prize-name">${prize.name}</h1>
                        <span class="prize-rarity ${prize.rarity}">${prize.rarity.toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="prize-actions">
                    <button class="prize-btn prize-btn-primary">
                        Забрать приз
                    </button>
                    
                    <div class="prize-actions-secondary">
                        <button class="prize-btn prize-btn-secondary">
                            Продать
                        </button>
                        <button class="prize-btn prize-btn-secondary">
                            Обменять
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    canAffordCase() {
        const balance = window.GameState?.balance || 0;
        return balance >= this.currentCase.price;
    }

    updateBalance() {
        const balance = window.GameState?.balance || 0;
        
        // Обновляем баланс в header если есть
        const balanceElements = document.querySelectorAll('.balance-amount');
        balanceElements.forEach(element => {
            if (element) {
                window.Utils.Animation.animateCounter(element, 
                    parseInt(element.textContent) || 0, 
                    balance, 
                    500
                );
            }
        });
    }

    setupFallbackMode() {
        console.log('⚠️ Настройка fallback режима для страницы кейсов');
        
        const caseId = sessionStorage.getItem('selectedCaseId') || 'demo_mystery_box';
        this.currentCase = this.getDemoCaseData(caseId);
        
        this.setupUI();
        this.setupEventListeners();
        
        window.notifications?.warning('Работаем в автономном режиме', {
            duration: 4000
        });
    }
}

// Создаем глобальный экземпляр
window.casesPage = new CasesPageManager();