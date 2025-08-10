/**
 * Notification System
 * Универсальная система уведомлений для CrazyGift
 */

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.defaultDuration = 3000;
        this.maxNotifications = 5;
        this.container = null;
        
        this.createContainer();
    }

    /**
     * Создание контейнера для уведомлений
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1001;
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 350px;
            width: 100%;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    /**
     * Показ уведомления
     */
    show(message, type = 'info', options = {}) {
        const {
            duration = this.defaultDuration,
            title = null,
            icon = null,
            closeable = false,
            progress = false,
            onclick = null
        } = options;

        // Ограничиваем количество уведомлений
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.hide(oldestId);
        }

        const id = this.generateId();
        const notification = this.createNotificationElement(id, message, type, {
            title, icon, closeable, progress, onclick, duration
        });

        this.notifications.set(id, {
            element: notification,
            timeout: null,
            startTime: Date.now(),
            duration
        });

        this.container.appendChild(notification);

        // Анимация появления
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Автоскрытие
        if (duration > 0) {
            const timeoutId = setTimeout(() => {
                this.hide(id);
            }, duration);
            
            this.notifications.get(id).timeout = timeoutId;
        }

        // Воспроизводим звук если нужно
        this.playSound(type);

        return id;
    }

    /**
     * Создание элемента уведомления
     */
    createNotificationElement(id, message, type, options) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.dataset.id = id;
        
        // Базовые стили
        notification.style.cssText = `
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            font-size: 14px;
            line-height: 1.4;
            pointer-events: auto;
            position: relative;
            overflow: hidden;
        `;

        // Цвета по типам
        const colors = {
            success: 'linear-gradient(135deg, #00ff87, #00cc6a)',
            info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)'
        };
        
        notification.style.background = colors[type] || colors.info;

        // Содержимое
        let content = '';
        
        if (options.icon || options.title) {
            content += '<div class="notification-with-icon">';
            
            if (options.icon) {
                content += `<div class="notification-icon">${options.icon}</div>`;
            }
            
            content += '<div class="notification-content">';
            
            if (options.title) {
                content += `<div class="notification-title">${options.title}</div>`;
            }
            
            content += `<div class="notification-message">${message}</div>`;
            content += '</div></div>';
        } else {
            content = message;
        }

        notification.innerHTML = content;

        // Кнопка закрытия
        if (options.closeable) {
            notification.classList.add('notification-closeable');
            const closeBtn = document.createElement('button');
            closeBtn.className = 'notification-close';
            closeBtn.innerHTML = '×';
            closeBtn.onclick = () => this.hide(id);
            notification.appendChild(closeBtn);
        }

        // Прогресс бар
        if (options.progress && options.duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'notification-progress';
            progressBar.style.width = '100%';
            notification.appendChild(progressBar);
            
            // Анимация прогресса
            setTimeout(() => {
                progressBar.style.transition = `width ${options.duration}ms linear`;
                progressBar.style.width = '0%';
            }, 50);
        }

        // Клик по уведомлению
        if (options.onclick) {
            notification.style.cursor = 'pointer';
            notification.onclick = (e) => {
                if (!e.target.classList.contains('notification-close')) {
                    options.onclick();
                    this.hide(id);
                }
            };
        }

        return notification;
    }

    /**
     * Скрытие уведомления
     */
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Отменяем таймаут
        if (notification.timeout) {
            clearTimeout(notification.timeout);
        }

        // Анимация скрытия
        notification.element.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (this.container.contains(notification.element)) {
                this.container.removeChild(notification.element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * Скрытие всех уведомлений
     */
    hideAll() {
        for (const [id] of this.notifications) {
            this.hide(id);
        }
    }

    /**
     * Успешное уведомление
     */
    success(message, options = {}) {
        return this.show(message, 'success', {
            icon: '✅',
            ...options
        });
    }

    /**
     * Информационное уведомление
     */
    info(message, options = {}) {
        return this.show(message, 'info', {
            icon: 'ℹ️',
            ...options
        });
    }

    /**
     * Предупреждение
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', {
            icon: '⚠️',
            ...options
        });
    }

    /**
     * Ошибка
     */
    error(message, options = {}) {
        return this.show(message, 'error', {
            icon: '❌',
            duration: 5000, // Ошибки показываем дольше
            ...options
        });
    }

    /**
     * Загрузка
     */
    loading(message, options = {}) {
        return this.show(message, 'info', {
            icon: '<div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>',
            duration: 0, // Не скрываем автоматически
            ...options
        });
    }

    /**
     * Пользовательское уведомление
     */
    custom(message, customType, styles = {}, options = {}) {
        const notification = this.show(message, 'info', options);
        const element = this.notifications.get(notification)?.element;
        
        if (element) {
            // Применяем кастомные стили
            Object.assign(element.style, styles);
            
            // Убираем базовый фон если задан кастомный
            if (styles.background) {
                element.style.background = styles.background;
            }
        }
        
        return notification;
    }

    /**
     * Генерация уникального ID
     */
    generateId() {
        return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Воспроизведение звука
     */
    playSound(type) {
        // Проверяем настройки звука
        if (!window.GameState?.settings?.soundEnabled) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Разные звуки для разных типов
            switch(type) {
                case 'success':
                    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                    break;
                case 'error':
                    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    break;
                case 'warning':
                    oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                    break;
                default: // info
                    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            }
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // Тихо игнорируем ошибки аудио
        }
    }

    /**
     * Обновление уведомления
     */
    update(id, message, options = {}) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const element = notification.element;
        
        // Обновляем текст
        const messageElement = element.querySelector('.notification-message') || element;
        if (messageElement.textContent !== undefined) {
            messageElement.textContent = message;
        } else {
            messageElement.innerHTML = message;
        }

        // Обновляем заголовок если передан
        if (options.title) {
            const titleElement = element.querySelector('.notification-title');
            if (titleElement) {
                titleElement.textContent = options.title;
            }
        }

        // Продлеваем время показа если нужно
        if (options.extendDuration && notification.timeout) {
            clearTimeout(notification.timeout);
            const timeoutId = setTimeout(() => {
                this.hide(id);
            }, options.extendDuration);
            notification.timeout = timeoutId;
        }
    }

    /**
     * Подсчет активных уведомлений
     */
    getActiveCount() {
        return this.notifications.size;
    }

    /**
     * Получение всех активных уведомлений
     */
    getActive() {
        return Array.from(this.notifications.entries()).map(([id, data]) => ({
            id,
            message: data.element.textContent,
            startTime: data.startTime,
            duration: data.duration
        }));
    }
}

// Создаем глобальный экземпляр системы уведомлений
window.notifications = new NotificationManager();

// Устаревшая функция для совместимости
window.showNotification = (message, type = 'info') => {
    return window.notifications.show(message, type);
};

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}