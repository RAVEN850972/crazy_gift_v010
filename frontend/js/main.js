// Global Game State
window.GameState = {
    balance: 1451,
    inventory: [],
    currentPage: 'main',
    user: null
};

// Image Glow Effect System
class ImageGlowExtractor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.processedImages = new Map();
        
        // Предустановленные цвета для разных типов подарков
        this.fallbackColors = [
            'rgba(255, 215, 0, 0.8)',   // Золотой
            'rgba(255, 100, 150, 0.8)', // Розовый
            'rgba(100, 200, 255, 0.8)', // Голубой
            'rgba(150, 255, 100, 0.8)', // Зеленый
            'rgba(255, 150, 50, 0.8)',  // Оранжевый
            'rgba(200, 100, 255, 0.8)', // Фиолетовый
        ];
    }

    // Создаем CORS-совместимое изображение
    createCORSImage(originalImg) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => resolve(img);
            img.onerror = () => {
                // Если CORS не работает, используем оригинальное изображение для анализа по URL
                resolve(null);
            };
            
            img.src = originalImg.src;
        });
    }

    // Извлечение цвета из имени файла (fallback метод)
    extractColorFromFilename(src) {
        const filename = src.toLowerCase();
        
        if (filename.includes('gold') || filename.includes('yellow') || filename.includes('gift1')) {
            return 'rgba(255, 215, 0, 0.8)';
        } else if (filename.includes('red') || filename.includes('pink') || filename.includes('gift2')) {
            return 'rgba(255, 100, 150, 0.8)';
        } else if (filename.includes('blue') || filename.includes('gift3')) {
            return 'rgba(100, 200, 255, 0.8)';
        } else if (filename.includes('green') || filename.includes('gift4')) {
            return 'rgba(150, 255, 100, 0.8)';
        } else if (filename.includes('orange') || filename.includes('gift5')) {
            return 'rgba(255, 150, 50, 0.8)';
        } else {
            // Случайный цвет из палитры
            const hash = this.simpleHash(src);
            return this.fallbackColors[hash % this.fallbackColors.length];
        }
    }

    // Простая хеш-функция для строки
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    async extractDominantColor(img) {
        // Проверяем кэш
        const cacheKey = img.src;
        if (this.processedImages.has(cacheKey)) {
            return this.processedImages.get(cacheKey);
        }

        let dominantColor = this.extractColorFromFilename(img.src);

        try {
            // Пытаемся создать CORS-совместимое изображение
            const corsImg = await this.createCORSImage(img);
            
            if (corsImg) {
                // Устанавливаем размер canvas
                this.canvas.width = 50;
                this.canvas.height = 50;

                // Рисуем изображение на canvas
                this.ctx.drawImage(corsImg, 0, 0, 50, 50);
                
                // Получаем данные пикселей
                const imageData = this.ctx.getImageData(0, 0, 50, 50);
                const data = imageData.data;
                
                // Анализ цветов
                const colorCounts = {};
                const step = 8; // Больший шаг для оптимизации
                
                for (let i = 0; i < data.length; i += step * 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];
                    
                    // Пропускаем прозрачные и крайние значения
                    if (a < 100 || (r < 50 && g < 50 && b < 50) || (r > 230 && g > 230 && b > 230)) {
                        continue;
                    }
                    
                    // Группируем цвета
                    const colorKey = `${Math.floor(r/20)*20},${Math.floor(g/20)*20},${Math.floor(b/20)*20}`;
                    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
                }
                
                // Находим доминантный цвет
                let maxCount = 0;
                for (const [color, count] of Object.entries(colorCounts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        const [r, g, b] = color.split(',').map(Number);
                        // Усиливаем цвет
                        const enhancedR = Math.min(255, Math.max(100, r + 50));
                        const enhancedG = Math.min(255, Math.max(100, g + 50));
                        const enhancedB = Math.min(255, Math.max(100, b + 50));
                        dominantColor = `rgba(${enhancedR}, ${enhancedG}, ${enhancedB}, 0.8)`;
                    }
                }
            }
            
        } catch (error) {
            console.log('Используется fallback цвет для:', img.src);
            // dominantColor уже установлен из fallback метода
        }
        
        // Сохраняем в кэш
        this.processedImages.set(cacheKey, dominantColor);
        return dominantColor;
    }

    async applyGlowToLiveItem(liveItem, img) {
        // Проверяем, что это не timer блок
        if (liveItem.classList.contains('timer')) {
            return;
        }

        const dominantColor = await this.extractDominantColor(img);
        
        // Создаем многослойное свечение
        const glowEffect = `
            0 0 8px ${dominantColor},
            0 0 16px ${dominantColor},
            0 0 24px ${dominantColor}
        `;
        
        // Применяем свечение к изображению
        img.style.filter = `drop-shadow(${glowEffect})`;
        
        // Добавляем слабое свечение фону блока
        const bgGlowColor = dominantColor.replace('0.8)', '0.15)');
        liveItem.style.boxShadow = `inset 0 0 15px ${bgGlowColor}`;
        
        // Добавляем внешнее свечение блока
        const outerGlowColor = dominantColor.replace('0.8)', '0.3)');
        liveItem.style.border = `1px solid ${outerGlowColor}`;
    }

    async processAllLiveItems() {
        const liveItems = document.querySelectorAll('.live-item');
        
        for (const liveItem of liveItems) {
            const img = liveItem.querySelector('img');
            
            if (!img || liveItem.classList.contains('timer')) {
                continue;
            }

            // Если изображение уже загружено
            if (img.complete && img.naturalHeight !== 0) {
                await this.applyGlowToLiveItem(liveItem, img);
            } else {
                // Ждем загрузки изображения
                img.addEventListener('load', async () => {
                    await this.applyGlowToLiveItem(liveItem, img);
                });
                
                // Обработка ошибки загрузки
                img.addEventListener('error', () => {
                    console.log('Ошибка загрузки изображения, применяем fallback:', img.src);
                    // Применяем fallback цвет при ошибке загрузки
                    const fallbackColor = this.extractColorFromFilename(img.src);
                    const glowEffect = `
                        0 0 8px ${fallbackColor},
                        0 0 16px ${fallbackColor},
                        0 0 24px ${fallbackColor}
                    `;
                    img.style.filter = `drop-shadow(${glowEffect})`;
                });
            }
        }
    }
}

// Создаем экземпляр системы свечения
const glowExtractor = new ImageGlowExtractor();

// Initialize Telegram WebApp
function initTelegramApp() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Set theme
        if (tg.themeParams.bg_color) {
            document.documentElement.style.setProperty('--bg-primary', tg.themeParams.bg_color);
        }
        
        // Get user info
        if (tg.initDataUnsafe?.user) {
            GameState.user = tg.initDataUnsafe.user;
        }
    }
}

// Navigation
function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.closest('.nav-item').classList.add('active');
    GameState.currentPage = page;
    
    console.log('Navigating to:', page);
}

// Balance management
function updateBalance() {
    const balanceElement = document.getElementById('balance');
    if (balanceElement && GameState.balance > 0) {
        balanceElement.textContent = GameState.balance;
    }
}

// Handle navigation clicks
function handleNavigation(url) {
    // Add loading animation
    document.body.style.opacity = '0.8';
    setTimeout(() => {
        window.location.href = url;
    }, 200);
}

// Handle case opening
function openCase(caseId) {
    // Add click feedback
    event.target.closest('.case-card').style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        window.location.href = `case-detail.html?id=${caseId}`;
    }, 150);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initTelegramApp();
    updateBalance();
    
    // Animate case cards on load
    document.querySelectorAll('.case-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    // Case cards navigation
    document.querySelectorAll('.case-card').forEach((card, index) => {
        card.onclick = () => openCase(index + 1);
    });

    // Header navigation
    document.querySelector('.app-logo').onclick = () => handleNavigation('profile.html');
    document.querySelector('.balance-widget').onclick = () => handleNavigation('balance.html');
    
    // Promo banner navigation
    document.querySelector('.promo-banner').onclick = () => handleNavigation('referral.html');

    // Запускаем обработку изображений для эффекта свечения
    setTimeout(async () => {
        await glowExtractor.processAllLiveItems();
    }, 100);

    // Обновляем свечение при изменении изображений (если нужно)
    async function refreshImageGlow() {
        await glowExtractor.processAllLiveItems();
    }
})