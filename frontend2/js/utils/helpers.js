/**
 * Helper Utilities
 * Вспомогательные функции для CrazyGift
 */

/**
 * Утилиты для чисел и форматирования
 */
const NumberUtils = {
    /**
     * Форматирование числа с разделителями тысяч
     */
    formatNumber(num) {
        return num.toLocaleString();
    },

    /**
     * Сокращение больших чисел (1000 -> 1K)
     */
    abbreviateNumber(num) {
        if (num < 1000) return num.toString();
        if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
        if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
        return (num / 1000000000).toFixed(1) + 'B';
    },

    /**
     * Генерация случайного числа в диапазоне
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Ограничение числа в диапазоне
     */
    clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    },

    /**
     * Интерполяция между двумя значениями
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Округление до N знаков после запятой
     */
    roundTo(num, decimals) {
        return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
    }
};

/**
 * Утилиты для строк
 */
const StringUtils = {
    /**
     * Капитализация первой буквы
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Обрезка строки с многоточием
     */
    truncate(str, length, suffix = '...') {
        if (str.length <= length) return str;
        return str.substring(0, length - suffix.length) + suffix;
    },

    /**
     * Очистка строки от HTML тегов
     */
    stripHtml(str) {
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent || div.innerText || '';
    },

    /**
     * Экранирование HTML
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Генерация случайной строки
     */
    randomString(length, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    },

    /**
     * Простая хеш-функция для строки
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
};

/**
 * Утилиты для дат
 */
const DateUtils = {
    /**
     * Форматирование даты
     */
    formatDate(date, format = 'dd.mm.yyyy') {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        return format
            .replace('dd', day)
            .replace('mm', month)
            .replace('yyyy', year)
            .replace('hh', hours)
            .replace('MM', minutes);
    },

    /**
     * Относительное время ("2 минуты назад")
     */
    timeAgo(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'только что';
        if (diffMins < 60) return `${diffMins} мин. назад`;
        if (diffHours < 24) return `${diffHours} ч. назад`;
        if (diffDays < 7) return `${diffDays} дн. назад`;
        
        return this.formatDate(date);
    },

    /**
     * Проверка, сегодня ли дата
     */
    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        return today.toDateString() === checkDate.toDateString();
    },

    /**
     * Добавление времени к дате
     */
    addTime(date, amount, unit = 'minutes') {
        const result = new Date(date);
        switch (unit) {
            case 'seconds':
                result.setSeconds(result.getSeconds() + amount);
                break;
            case 'minutes':
                result.setMinutes(result.getMinutes() + amount);
                break;
            case 'hours':
                result.setHours(result.getHours() + amount);
                break;
            case 'days':
                result.setDate(result.getDate() + amount);
                break;
        }
        return result;
    }
};

/**
 * Утилиты для работы с DOM
 */
const DOMUtils = {
    /**
     * Поиск элемента с таймаутом
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    },

    /**
     * Плавная прокрутка к элементу
     */
    scrollToElement(element, options = {}) {
        const {
            behavior = 'smooth',
            block = 'center',
            inline = 'nearest'
        } = options;

        if (typeof element === 'string') {
            element = document.querySelector(element);
        }

        if (element) {
            element.scrollIntoView({ behavior, block, inline });
        }
    },

    /**
     * Проверка видимости элемента
     */
    isElementVisible(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }

        if (!element) return false;

        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Копирование текста в буфер обмена
     */
    async copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (error) {
                console.warn('Clipboard API failed, using fallback', error);
            }
        }

        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (error) {
            document.body.removeChild(textArea);
            return false;
        }
    },

    /**
     * Создание элемента с атрибутами
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    },

    /**
     * Удаление всех детей элемента
     */
    clearElement(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    }
};

/**
 * Утилиты для URL и навигации
 */
const URLUtils = {
    /**
     * Получение параметров URL
     */
    getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    /**
     * Получение одного параметра URL
     */
    getQueryParam(name, defaultValue = null) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name) || defaultValue;
    },

    /**
     * Обновление URL без перезагрузки
     */
    updateURL(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        window.history.replaceState({}, '', url);
    },

    /**
     * Навигация с плавным переходом
     */
    navigateTo(url, transition = true) {
        if (transition) {
            document.body.style.opacity = '0.8';
            setTimeout(() => {
                window.location.href = url;
            }, 200);
        } else {
            window.location.href = url;
        }
    }
};

/**
 * Утилиты для изображений
 */
const ImageUtils = {
    /**
     * Предзагрузка изображения
     */
    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    },

    /**
     * Предзагрузка нескольких изображений
     */
    async preloadImages(srcs) {
        const promises = srcs.map(src => this.preloadImage(src));
        return Promise.all(promises);
    },

    /**
     * Получение доминирующего цвета изображения
     */
    getDominantColor(imgElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imgElement.width;
        canvas.height = imgElement.height;
        
        ctx.drawImage(imgElement, 0, 0);
        
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 200) { // Игнорируем прозрачные пиксели
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }
            }
            
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            
            return `rgb(${r}, ${g}, ${b})`;
        } catch (error) {
            // CORS ошибка - возвращаем случайный цвет
            return `hsl(${Math.random() * 360}, 70%, 60%)`;
        }
    }
};

/**
 * Утилиты для анимаций
 */
const AnimationUtils = {
    /**
     * Простая анимация значения
     */
    animateValue(start, end, duration, callback, easing = 'easeOutCubic') {
        const startTime = performance.now();
        
        const easingFunctions = {
            linear: t => t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => 1 - Math.pow(1 - t, 3),
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        };
        
        const easingFunc = easingFunctions[easing] || easingFunctions.easeOutCubic;
        
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFunc(progress);
            
            const currentValue = start + (end - start) * easedProgress;
            callback(currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    },

    /**
     * Анимация счетчика
     */
    animateCounter(element, start, end, duration = 1000) {
        this.animateValue(start, end, duration, (value) => {
            element.textContent = Math.floor(value).toLocaleString();
        });
    },

    /**
     * Плавное появление элемента
     */
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        this.animateValue(0, 1, duration, (value) => {
            element.style.opacity = value;
        });
    },

    /**
     * Плавное исчезновение элемента
     */
    fadeOut(element, duration = 300, callback = null) {
        this.animateValue(1, 0, duration, (value) => {
            element.style.opacity = value;
        });
        
        setTimeout(() => {
            element.style.display = 'none';
            if (callback) callback();
        }, duration);
    }
};

/**
 * Утилиты для игровой логики
 */
const GameUtils = {
    /**
     * Выбор случайного элемента по весам
     */
    weightedRandom(items) {
        const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
        let random = Math.random() * totalWeight;
        
        for (const item of items) {
            random -= (item.weight || 1);
            if (random <= 0) {
                return item;
            }
        }
        
        return items[items.length - 1];
    },

    /**
     * Конвертация редкости в цвет
     */
    getRarityColor(rarity) {
        const colors = {
            common: '#ffffff',
            rare: '#3b82f6',
            epic: '#8b5cf6',
            legendary: '#f59e0b',
            mythic: '#ef4444'
        };
        return colors[rarity.toLowerCase()] || colors.common;
    },

    /**
     * Форматирование времени (секунды в ЧЧ:ММ:СС)
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Генерация реферального кода
     */
    generateReferralCode(prefix = 'CG', length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = prefix;
        for (let i = 0; i < length - prefix.length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Расчет шанса апгрейда
     */
    calculateUpgradeChance(fromValue, toValue) {
        const ratio = toValue / fromValue;
        let baseChance = 75;
        
        if (ratio > 2) baseChance = 50;
        if (ratio > 3) baseChance = 30;
        if (ratio > 5) baseChance = 15;
        if (ratio > 10) baseChance = 5;
        
        return Math.max(1, Math.min(95, baseChance));
    }
};

/**
 * Утилиты для валидации
 */
const ValidationUtils = {
    /**
     * Проверка email
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Проверка числа в диапазоне
     */
    isNumberInRange(num, min, max) {
        return !isNaN(num) && num >= min && num <= max;
    },

    /**
     * Проверка длины строки
     */
    isValidLength(str, min, max) {
        return str.length >= min && str.length <= max;
    },

    /**
     * Санитизация ввода
     */
    sanitizeInput(input) {
        return input.toString()
            .replace(/[<>]/g, '')
            .trim()
            .substring(0, 1000);
    }
};

// Экспорт всех утилит
window.Utils = {
    Number: NumberUtils,
    String: StringUtils,
    Date: DateUtils,
    DOM: DOMUtils,
    URL: URLUtils,
    Image: ImageUtils,
    Animation: AnimationUtils,
    Game: GameUtils,
    Validation: ValidationUtils
};

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NumberUtils,
        StringUtils,
        DateUtils,
        DOMUtils,
        URLUtils,
        ImageUtils,
        AnimationUtils,
        GameUtils,
        ValidationUtils
    };
}