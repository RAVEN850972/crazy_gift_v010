// ===================================================================
// main.js - Исправленная версия с API интеграцией
// ===================================================================

// === API ИНТЕГРАЦИЯ ===

/**
 * Инициализация приложения с поддержкой API
 * Добавить в начало DOMContentLoaded обработчика
 */
async function initializeAppWithAPI() {
    console.log('🚀 Инициализация CrazyGift с API поддержкой...');
    
    // Ждем инициализации API детектора
    if (window.APIDetector) {
        await window.APIDetector.initializeApp();
    }
    
    // Загружаем реальные кейсы если API доступен
    await loadCasesForHomePage();
    
    // Обновляем баланс из API
    await updateBalanceFromAPI();
    
    console.log('✅ Приложение инициализировано');
}

/**
 * Загрузка кейсов для главной страницы
 * ЗАМЕНЯЕТ захардкоженные массивы кейсов
 */
async function loadCasesForHomePage() {
    try {
        // Используем обертку для получения кейсов
        const cases = await loadCasesWithAPI();
        
        // Рендерим кейсы только если мы на главной странице
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            renderCasesGrid(cases);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки кейсов:', error);
    }
}

/**
 * Рендер сетки кейсов
 * ЗАМЕНЯЕТ старую логику с захардкоженными данными
 */
function renderCasesGrid(cases) {
    const casesGrid = document.querySelector('.cases-grid');
    if (!casesGrid) return;
    
    // Очищаем существующий контент
    casesGrid.innerHTML = '';
    
    // Рендерим реальные кейсы
    cases.forEach((caseItem, index) => {
        const caseCard = document.createElement('div');
        caseCard.className = 'case-card';
        caseCard.style.animationDelay = `${index * 0.1}s`;
        
        caseCard.innerHTML = `
            <div class="case-image">
                <img src="${caseItem.image_url || 'assets/cases/default.png'}" 
                     alt="${caseItem.name}" 
                     onerror="this.src='assets/cases/default.png'">
            </div>
            <div class="case-title">${caseItem.name}</div>
            <div class="case-price">
                ${caseItem.price_stars.toLocaleString()}
                <img src="assets/icons/star_icon.png" alt="Stars">
            </div>
        `;
        
        // Добавляем обработчик клика
        caseCard.addEventListener('click', () => {
            openCase(caseItem.id);
        });
        
        casesGrid.appendChild(caseCard);
    });
}

/**
 * Обновление баланса из API
 * ЗАМЕНЯЕТ захардкоженные значения баланса
 */
async function updateBalanceFromAPI() {
    try {
        // Обновляем баланс через обертку
        await updateBalanceWithAPI();
        
        console.log('✅ Баланс обновлен:', window.GameState.balance);
        
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
    }
}

// === ГЛОБАЛЬНЫЕ ПЕРЕОПРЕДЕЛЕНИЯ ===

/**
 * Переопределение updateBalance() для работы с API
 */
const originalUpdateBalance = window.updateBalance;
window.updateBalance = async function() {
    if (window.GameState?.demoMode) {
        // В демо режиме обновляем локально
        const balanceElement = document.getElementById('balance');
        if (balanceElement && GameState.balance > 0) {
            balanceElement.textContent = GameState.balance.toLocaleString();
        }
        return;
    }
    
    // В API режиме обновляем через сервер
    await updateBalanceFromAPI();
};

// === СУЩЕСТВУЮЩИЙ КОД (с изменениями) ===

// Global state
const GameState = {
    balance: 0, // Удалено захардкоженное значение 1451
    currentPage: 'home',
    user: null
};

// Glow effect extractor
const glowExtractor = {
    processedImages: new Map(),
    canvas: document.createElement('canvas'),
    ctx: null,
    fallbackColors: [
        '255, 215, 0',    // Золото
        '138, 43, 226',   // Фиолет  
        '255, 20, 147',   // Розовый
        '0, 191, 255',    // Голубой
        '50, 205, 50',    // Зеленый
        '255, 69, 0',     // Красно-оранжевый
        '255, 140, 0',    // Оранжевый
        '30, 144, 255'    // Синий
    ],

    init() {
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 100;
        this.canvas.height = 100;
    },

    async processAllLiveItems() {
        const itemImages = document.querySelectorAll('.case-card img, .item-image img, .inventory-item img');
        
        for (const img of itemImages) {
            if (img.complete && img.naturalHeight !== 0) {
                await this.processImage(img);
            } else {
                img.onload = () => this.processImage(img);
            }
        }
    },

    async processImage(img) {
        try {
            const dominantColor = await this.extractDominantColor(img);
            this.applyGlowEffect(img, dominantColor);
        } catch (error) {
            console.log('Не удалось обработать изображение:', img.src);
            const fallbackColor = this.extractColorFromFilename(img.src);
            this.applyGlowEffect(img, fallbackColor);
        }
    },

    applyGlowEffect(img, color) {
        const container = img.closest('.case-card, .item-card, .inventory-item');
        if (container) {
            container.style.setProperty('--glow-color', color);
            container.classList.add('glow-effect');
        }
    },

    extractColorFromFilename(src) {
        if (src.includes('gold') || src.includes('legendary')) {
            return '255, 215, 0';
        } else if (src.includes('purple') || src.includes('epic')) {
            return '138, 43, 226';
        } else if (src.includes('blue') || src.includes('rare')) {
            return '30, 144, 255';
        } else if (src.includes('green') || src.includes('uncommon')) {
            return '50, 205, 50';
        } else {
            // Случайный цвет из палитры
            const hash = this.simpleHash(src);
            return this.fallbackColors[hash % this.fallbackColors.length];
        }
    },

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    },

    async extractDominantColor(img) {
        const cacheKey = img.src;
        if (this.processedImages.has(cacheKey)) {
            return this.processedImages.get(cacheKey);
        }

        let dominantColor = this.extractColorFromFilename(img.src);

        try {
            const corsImg = await this.createCORSImage(img);
            
            if (corsImg) {
                this.canvas.width = 50;
                this.canvas.height = 50;
                this.ctx.drawImage(corsImg, 0, 0, 50, 50);
                
                const imageData = this.ctx.getImageData(0, 0, 50, 50);
                const data = imageData.data;
                
                const colorCounts = {};
                const step = 8;
                
                for (let i = 0; i < data.length; i += step * 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];
                    
                    if (a < 100 || (r < 50 && g < 50 && b < 50) || (r > 230 && g > 230 && b > 230)) {
                        continue;
                    }
                    
                    const groupedR = Math.floor(r / 30) * 30;
                    const groupedG = Math.floor(g / 30) * 30;
                    const groupedB = Math.floor(b / 30) * 30;
                    const colorKey = `${groupedR},${groupedG},${groupedB}`;
                    
                    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
                }
                
                if (Object.keys(colorCounts).length > 0) {
                    const dominantColorKey = Object.keys(colorCounts).reduce((a, b) => 
                        colorCounts[a] > colorCounts[b] ? a : b
                    );
                    dominantColor = dominantColorKey;
                }
            }
        } catch (error) {
            console.log('Ошибка извлечения цвета:', error);
        }

        this.processedImages.set(cacheKey, dominantColor);
        return dominantColor;
    },

    async createCORSImage(originalImg) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            
            img.src = originalImg.src + (originalImg.src.includes('?') ? '&' : '?') + 'cors=' + Date.now();
            
            setTimeout(() => resolve(null), 2000);
        });
    }
};

// Initialize glow extractor
glowExtractor.init();

// Telegram WebApp initialization
function initTelegramApp() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        
        tg.ready();
        tg.expand();
        
        if (tg.MainButton) {
            tg.MainButton.hide();
        }
        
        if (tg.BackButton) {
            tg.BackButton.hide();
        }
    }
}

// Navigation functions
function setActivePage(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.closest('.nav-item').classList.add('active');
    GameState.currentPage = page;
    
    console.log('Navigating to:', page);
}

// Handle navigation clicks
function handleNavigation(url) {
    document.body.style.opacity = '0.8';
    setTimeout(() => {
        window.location.href = url;
    }, 200);
}

// Handle case opening - ОБНОВЛЕНО для работы с API
function openCase(caseId) {
    if (event) {
        event.target.closest('.case-card').style.transform = 'scale(0.95)';
    }
    
    setTimeout(() => {
        window.location.href = `case-detail.html?id=${caseId}`;
    }, 150);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // API инициализация (ДОБАВЛЕНО)
    await initializeAppWithAPI();
    
    // Существующая инициализация
    initTelegramApp();
    updateBalance();
    
    // Animate case cards on load
    document.querySelectorAll('.case-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    // Header navigation
    const appLogo = document.querySelector('.app-logo');
    if (appLogo) {
        appLogo.onclick = () => handleNavigation('profile.html');
    }
    
    const balanceWidget = document.querySelector('.balance-widget');
    if (balanceWidget) {
        balanceWidget.onclick = () => handleNavigation('balance.html');
    }
    
    // Promo banner navigation
    const promoBanner = document.querySelector('.promo-banner');
    if (promoBanner) {
        promoBanner.onclick = () => handleNavigation('referral.html');
    }

    // Запускаем обработку изображений для эффекта свечения
    setTimeout(async () => {
        await glowExtractor.processAllLiveItems();
    }, 100);

    // Обновляем свечение при изменении изображений
    async function refreshImageGlow() {
        await glowExtractor.processAllLiveItems();
    }
    
    // Периодическое обновление баланса (ДОБАВЛЕНО)
    setInterval(async () => {
        if (!window.GameState?.demoMode && window.GameState?.authenticated) {
            await updateBalance();
        }
    }, 30000); // Каждые 30 секунд
});