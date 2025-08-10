/**
 * Main Page (Index) Script
 * Главная страница с кейсами и основным функционалом
 */

class MainPageManager {
    constructor() {
        this.cases = [];
        this.featuredCase = null;
        this.isLoading = false;
        this.apiAvailable = false;
        
        this.init();
    }

    /**
     * Инициализация главной страницы
     */
    async init() {
        console.log('🏠 Инициализация главной страницы...');
        
        try {
            // Проверяем доступность API
            this.apiAvailable = await window.apiClient.checkAvailability();
            
            // Загружаем данные
            await this.loadData();
            
            // Настраиваем UI
            this.setupUI();
            
            // Настраиваем обработчики событий
            this.setupEventListeners();
            
            console.log('✅ Главная страница инициализирована');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации главной страницы:', error);
            this.setupFallbackMode();
        }
    }

    /**
     * Загрузка данных
     */
    async loadData() {
        this.isLoading = true;
        
        try {
            if (this.apiAvailable) {
                // Загружаем кейсы из API
                await this.loadCasesFromAPI();
                
                // Обновляем баланс пользователя
                await this.updateUserBalance();
                
            } else {
                // Загружаем демо данные
                this.loadDemoCases();
            }
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.loadDemoCases();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Загрузка кейсов из API
     */
    async loadCasesFromAPI() {
        try {
            const response = await window.apiClient.getCases({ limit: 20 });
            this.cases = response.cases || [];
            this.featuredCase = this.cases.find(c => c.featured) || this.cases[0];
            
            console.log(`📦 Загружено ${this.cases.length} кейсов из API`);
            
        } catch (error) {
            console.error('Ошибка загрузки кейсов из API:', error);
            throw error;
        }
    }

    /**
     * Загрузка демо кейсов
     */
    loadDemoCases() {
        console.log('🎭 Загрузка демо кейсов...');
        
        this.cases = [
            {
                id: 'demo_mystery_box',
                name: 'Mystery Box',
                description: 'Коробка с загадочными призами',
                price: 100,
                image: 'assets/images/cases/mystery_box.png',
                rarity: 'common',
                featured: true,
                items: [
                    { name: 'Gold Coin', rarity: 'common', chance: 45 },
                    { name: 'Silver Coin', rarity: 'rare', chance: 30 },
                    { name: 'Diamond', rarity: 'epic', chance: 20 },
                    { name: 'Golden Crown', rarity: 'legendary', chance: 5 }
                ]
            },
            {
                id: 'demo_treasure_chest',
                name: 'Treasure Chest',
                description: 'Сундук с сокровищами',
                price: 250,
                image: 'assets/images/cases/treasure_chest.png',
                rarity: 'rare'
            },
            {
                id: 'demo_royal_case',
                name: 'Royal Case',
                description: 'Королевский кейс с редкими призами',
                price: 500,
                image: 'assets/images/cases/royal_case.png',
                rarity: 'epic'
            },
            {
                id: 'demo_legendary_vault',
                name: 'Legendary Vault',
                description: 'Легендарное хранилище',
                price: 1000,
                image: 'assets/images/cases/legendary_vault.png',
                rarity: 'legendary'
            }
        ];
        
        this.featuredCase = this.cases[0];
    }

    /**
     * Обновление баланса пользователя
     */
    async updateUserBalance() {
        if (!this.apiAvailable || !window.GameState?.currentUserId) {
            return;
        }
        
        try {
            const balanceData = await window.apiClient.getUserBalance(window.GameState.currentUserId);
            
            // Обновляем состояние игры
            if (window.GameState) {
                window.GameState.balance = balanceData.balance || 0;
            }
            
            // Обновляем UI
            this.updateBalanceDisplay(balanceData.balance || 0);
            
        } catch (error) {
            console.error('Ошибка обновления баланса:', error);
        }
    }

    /**
     * Настройка UI
     */
    setupUI() {
        // Обновляем featured кейс
        this.updateFeaturedCase();
        
        // Обновляем сетку кейсов
        this.updateCasesGrid();
        
        // Обновляем баланс
        this.updateBalanceDisplay(window.GameState?.balance || 0);
        
        // Показываем индикатор режима если нужно
        this.showModeIndicator();
    }

    /**
     * Обновление featured кейса
     */
    updateFeaturedCase() {
        const featuredSection = document.querySelector('.featured-case-section');
        if (!featuredSection || !this.featuredCase) return;

        featuredSection.innerHTML = `
            <div class="featured-case" onclick="mainPage.openCaseDetail('${this.featuredCase.id}')">
                <div class="featured-badge">Featured</div>
                <img src="${this.featuredCase.image}" alt="${this.featuredCase.name}" class="featured-case-image" onerror="this.src='assets/images/placeholder-case.png'">
                <h2 class="featured-case-name">${this.featuredCase.name}</h2>
                <p class="featured-case-description">${this.featuredCase.description}</p>
                <div class="featured-case-price">${this.featuredCase.price} 💎</div>
            </div>
        `;
    }

    /**
     * Обновление сетки кейсов
     */
    updateCasesGrid() {
        const casesGrid = document.querySelector('.cases-grid');
        if (!casesGrid) return;

        // Очищаем существующий контент
        casesGrid.innerHTML = '';

        // Добавляем кейсы
        this.cases.forEach(caseItem => {
            if (caseItem.featured) return; // Пропускаем featured кейс
            
            const caseElement = this.createCaseElement(caseItem);
            casesGrid.appendChild(caseElement);
        });

        // Показываем анимацию появления
        const caseCards = casesGrid.querySelectorAll('.case-card');
        caseCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * Создание элемента кейса
     */
    createCaseElement(caseItem) {
        const caseElement = document.createElement('div');
        caseElement.className = 'case-card';
        caseElement.onclick = () => this.openCaseDetail(caseItem.id);
        
        caseElement.innerHTML = `
            <div class="case-rarity ${caseItem.rarity}"></div>
            <img src="${caseItem.image}" alt="${caseItem.name}" class="case-image" onerror="this.src='assets/images/placeholder-case.png'">
            <h3 class="case-name">${caseItem.name}</h3>
            <div class="case-price">${caseItem.price} 💎</div>
        `;
        
        return caseElement;
    }

    /**
     * Обновление отображения баланса
     */
    updateBalanceDisplay(balance) {
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

    /**
     * Показ индикатора режима
     */
    showModeIndicator() {
        if (!this.apiAvailable) {
            // Показываем индикатор демо режима
            const indicator = document.createElement('div');
            indicator.className = 'demo-mode-indicator show';
            indicator.textContent = '🎭 Демо режим - данные не сохраняются';
            
            // Удаляем существующий индикатор
            const existing = document.querySelector('.demo-mode-indicator');
            if (existing) existing.remove();
            
            document.body.appendChild(indicator);
            
            // Автоскрытие через 5 секунд
            setTimeout(() => {
                indicator.classList.remove('show');
                setTimeout(() => indicator.remove(), 300);
            }, 5000);
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Кнопка баланса
        const balanceWidget = document.querySelector('.balance-widget');
        if (balanceWidget) {
            balanceWidget.onclick = () => {
                window.haptic?.ui.buttonPress();
                window.Utils.URL.navigateTo('balance.html');
            };
        }

        // Обновление при фокусе на страницу
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshData();
            }
        });

        // Обработка pull-to-refresh (если поддерживается)
        this.setupPullToRefresh();
    }

    /**
     * Настройка pull-to-refresh
     */
    setupPullToRefresh() {
        let startY = 0;
        let pullDistance = 0;
        const threshold = 100;
        let isPulling = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;

            const currentY = e.touches[0].clientY;
            pullDistance = currentY - startY;

            if (pullDistance > 0 && window.scrollY === 0) {
                e.preventDefault();
                
                // Визуальная обратная связь
                const opacity = Math.min(pullDistance / threshold, 1);
                document.body.style.transform = `translateY(${Math.min(pullDistance * 0.5, 50)}px)`;
                document.body.style.opacity = 1 - (opacity * 0.2);
                
                if (pullDistance > threshold) {
                    window.haptic?.ui.success();
                }
            }
        });

        document.addEventListener('touchend', () => {
            if (isPulling && pullDistance > threshold) {
                this.refreshData();
            }
            
            // Сбрасываем стили
            document.body.style.transform = '';
            document.body.style.opacity = '';
            
            isPulling = false;
            pullDistance = 0;
        });
    }

    /**
     * Открытие детальной страницы кейса
     */
    openCaseDetail(caseId) {
        window.haptic?.ui.buttonPress();
        
        // Сохраняем ID кейса для следующей страницы
        sessionStorage.setItem('selectedCaseId', caseId);
        
        // Переходим на страницу деталей
        window.Utils.URL.navigateTo('case-detail.html');
    }

    /**
     * Обновление данных
     */
    async refreshData() {
        if (this.isLoading) return;
        
        console.log('🔄 Обновление данных главной страницы...');
        
        try {
            this.isLoading = true;
            
            // Показываем индикатор загрузки
            this.showRefreshIndicator();
            
            // Перезагружаем данные
            await this.loadData();
            
            // Обновляем UI
            this.setupUI();
            
            // Показываем уведомление об успешном обновлении
            window.notifications?.success('Данные обновлены', { duration: 2000 });
            
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
            window.notifications?.error('Ошибка обновления данных');
        } finally {
            this.isLoading = false;
            this.hideRefreshIndicator();
        }
    }

    /**
     * Показ индикатора обновления
     */
    showRefreshIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'refresh-indicator';
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <span>Обновление...</span>
        `;
        indicator.style.cssText = `
            position: fixed;
            top: calc(var(--header-height) + 10px);
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(indicator);
    }

    /**
     * Скрытие индикатора обновления
     */
    hideRefreshIndicator() {
        const indicator = document.querySelector('.refresh-indicator');
        if (indicator) {
            setTimeout(() => indicator.remove(), 500);
        }
    }

    /**
     * Настройка fallback режима
     */
    setupFallbackMode() {
        console.log('⚠️ Настройка fallback режима для главной страницы');
        
        // Загружаем демо данные
        this.loadDemoCases();
        
        // Настраиваем UI
        this.setupUI();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
        
        // Показываем уведомление
        window.notifications?.warning('Работаем в автономном режиме', {
            duration: 4000
        });
    }

    /**
     * Получение кейса по ID
     */
    getCaseById(caseId) {
        return this.cases.find(c => c.id === caseId);
    }

    /**
     * Проверка достаточности средств
     */
    canAffordCase(caseId) {
        const caseItem = this.getCaseById(caseId);
        if (!caseItem) return false;
        
        const balance = window.GameState?.balance || 0;
        return balance >= caseItem.price;
    }
}

// Создаем глобальный экземпляр
window.mainPage = new MainPageManager();

// Инициализируем когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mainPage.init();
    });
} else {
    window.mainPage.init();
}

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MainPageManager;
}