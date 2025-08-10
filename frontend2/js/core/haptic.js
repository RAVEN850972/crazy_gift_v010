/**
 * Haptic Feedback System
 * Универсальная система тактильной обратной связи
 */

class HapticManager {
    constructor() {
        this.isEnabled = false;
        this.userInteracted = false;
        this.patterns = new Map();
        this.telegramHaptic = null;
        
        this.init();
    }

    /**
     * Инициализация системы
     */
    init() {
        // Проверяем поддержку вибрации
        this.isEnabled = 'vibrate' in navigator;
        
        // Проверяем доступность Telegram haptic
        if (window.telegramApp?.isFeatureSupported('hapticFeedback')) {
            this.telegramHaptic = window.telegramApp;
            console.log('✅ Telegram haptic feedback доступен');
        }
        
        // Настраиваем отслеживание взаимодействия пользователя
        this.setupUserInteractionTracking();
        
        // Регистрируем базовые паттерны
        this.registerDefaultPatterns();
        
        console.log(`Haptic feedback: ${this.isEnabled ? 'поддерживается' : 'не поддерживается'}`);
    }

    /**
     * Отслеживание взаимодействия пользователя
     */
    setupUserInteractionTracking() {
        const events = ['touchstart', 'touchend', 'click', 'keydown', 'mousedown'];
        
        const markUserInteraction = () => {
            if (this.userInteracted) return;
            
            this.userInteracted = true;
            window.hasUserInteracted = true;
            
            // Удаляем обработчики после первого взаимодействия
            events.forEach(eventType => {
                document.removeEventListener(eventType, markUserInteraction, true);
            });
            
            console.log('✅ Пользовательское взаимодействие зарегистрировано');
        };
        
        events.forEach(eventType => {
            document.addEventListener(eventType, markUserInteraction, true);
        });
    }

    /**
     * Регистрация базовых паттернов
     */
    registerDefaultPatterns() {
        // Легкие касания
        this.patterns.set('light', 50);
        this.patterns.set('tap', 30);
        this.patterns.set('tick', 25);
        
        // Средние касания
        this.patterns.set('medium', 100);
        this.patterns.set('click', 80);
        this.patterns.set('button', 75);
        
        // Сильные касания
        this.patterns.set('heavy', 200);
        this.patterns.set('impact', 150);
        this.patterns.set('punch', 180);
        
        // Уведомления
        this.patterns.set('success', [100, 50, 100]);
        this.patterns.set('error', [200, 100, 200]);
        this.patterns.set('warning', [100, 100, 100]);
        this.patterns.set('notification', [50, 100, 50]);
        
        // Игровые события
        this.patterns.set('coin', [30, 30, 30]);
        this.patterns.set('levelup', [100, 50, 100, 50, 100]);
        this.patterns.set('achievement', [50, 50, 100, 50, 150]);
        this.patterns.set('case_open', [50, 100, 200]);
        this.patterns.set('rare_drop', [100, 50, 150, 50, 200]);
        
        // Интерфейс
        this.patterns.set('swipe', [20, 20]);
        this.patterns.set('scroll', 15);
        this.patterns.set('selection', 40);
        this.patterns.set('toggle_on', [50, 30]);
        this.patterns.set('toggle_off', [30, 50]);
    }

    /**
     * Воспроизведение haptic feedback
     */
    trigger(pattern, options = {}) {
        const {
            force = false,
            delay = 0,
            repeat = 1,
            interval = 100
        } = options;

        // Проверяем разрешения
        if (!this.canVibrate(force)) {
            return false;
        }

        // Выполняем с задержкой если нужно
        if (delay > 0) {
            setTimeout(() => this.executeHaptic(pattern, repeat, interval), delay);
        } else {
            this.executeHaptic(pattern, repeat, interval);
        }

        return true;
    }

    /**
     * Выполнение haptic feedback
     */
    executeHaptic(pattern, repeat = 1, interval = 100) {
        for (let i = 0; i < repeat; i++) {
            const executeDelay = i * interval;
            
            setTimeout(() => {
                // Пытаемся использовать Telegram haptic если доступен
                if (this.telegramHaptic && this.tryTelegramHaptic(pattern)) {
                    return;
                }
                
                // Fallback на стандартную вибрацию
                this.executeStandardVibration(pattern);
            }, executeDelay);
        }
    }

    /**
     * Попытка использовать Telegram haptic
     */
    tryTelegramHaptic(pattern) {
        try {
            // Сопоставляем паттерны с Telegram API
            const telegramMapping = {
                'light': 'light',
                'tap': 'light',
                'tick': 'light',
                'medium': 'medium',
                'click': 'medium',
                'button': 'medium',
                'heavy': 'heavy',
                'impact': 'heavy',
                'punch': 'heavy',
                'success': 'success',
                'error': 'error',
                'warning': 'warning',
                'notification': 'success',
                'achievement': 'success',
                'levelup': 'success',
                'rare_drop': 'success'
            };

            const telegramType = telegramMapping[pattern];
            if (telegramType) {
                this.telegramHaptic.hapticFeedback(telegramType);
                return true;
            }
        } catch (error) {
            console.warn('Ошибка Telegram haptic:', error);
        }
        
        return false;
    }

    /**
     * Стандартная вибрация
     */
    executeStandardVibration(pattern) {
        if (!this.isEnabled || !navigator.vibrate) return;

        let vibrationPattern;

        if (this.patterns.has(pattern)) {
            vibrationPattern = this.patterns.get(pattern);
        } else if (typeof pattern === 'number' || Array.isArray(pattern)) {
            vibrationPattern = pattern;
        } else {
            // Используем легкую вибрацию по умолчанию
            vibrationPattern = 50;
        }

        try {
            navigator.vibrate(vibrationPattern);
        } catch (error) {
            console.warn('Ошибка вибрации:', error);
        }
    }

    /**
     * Проверка возможности вибрации
     */
    canVibrate(force = false) {
        if (force) return this.isEnabled;
        
        // Проверяем настройки пользователя
        const settings = window.GameState?.settings || {};
        if (settings.vibration === false) return false;
        
        // Проверяем взаимодействие пользователя
        if (!this.userInteracted) return false;
        
        return this.isEnabled;
    }

    /**
     * Регистрация кастомного паттерна
     */
    registerPattern(name, pattern) {
        this.patterns.set(name, pattern);
    }

    /**
     * Удаление паттерна
     */
    unregisterPattern(name) {
        return this.patterns.delete(name);
    }

    /**
     * Получение всех паттернов
     */
    getPatterns() {
        return Array.from(this.patterns.keys());
    }

    /**
     * Тестирование паттерна
     */
    test(pattern) {
        console.log(`Тестирование haptic паттерна: ${pattern}`);
        this.trigger(pattern, { force: true });
    }

    /**
     * Включение/выключение haptic feedback
     */
    setEnabled(enabled) {
        this.isEnabled = enabled && 'vibrate' in navigator;
        
        // Сохраняем в настройки
        if (window.GameState?.settings) {
            window.GameState.settings.vibration = enabled;
            window.gameStorage?.saveSettings(window.GameState.settings);
        }
        
        console.log(`Haptic feedback ${enabled ? 'включен' : 'выключен'}`);
    }

    /**
     * Проверка статуса
     */
    isHapticEnabled() {
        return this.isEnabled && this.userInteracted;
    }

    /**
     * Получение информации о поддержке
     */
    getCapabilities() {
        return {
            standardVibration: 'vibrate' in navigator,
            telegramHaptic: !!this.telegramHaptic,
            userInteracted: this.userInteracted,
            enabled: this.isEnabled,
            patterns: this.patterns.size
        };
    }

    /**
     * Создание последовательности
     */
    createSequence(patterns, interval = 100) {
        return {
            play: () => {
                patterns.forEach((pattern, index) => {
                    setTimeout(() => {
                        this.trigger(pattern);
                    }, index * interval);
                });
            }
        };
    }

    /**
     * Haptic для UI элементов
     */
    ui = {
        buttonPress: () => this.trigger('button'),
        toggleOn: () => this.trigger('toggle_on'),
        toggleOff: () => this.trigger('toggle_off'),
        swipe: () => this.trigger('swipe'),
        selection: () => this.trigger('selection'),
        error: () => this.trigger('error'),
        success: () => this.trigger('success'),
        scroll: () => this.trigger('scroll')
    };

    /**
     * Haptic для игровых событий
     */
    game = {
        caseOpen: () => this.trigger('case_open'),
        rareDrop: () => this.trigger('rare_drop'),
        achievement: () => this.trigger('achievement'),
        levelUp: () => this.trigger('levelup'),
        coin: () => this.trigger('coin'),
        purchase: () => this.trigger('success'),
        failure: () => this.trigger('error')
    };
}

// Создаем глобальный экземпляр
window.haptic = new HapticManager();

// Устаревшие функции для совместимости
window.triggerHaptic = (type) => window.haptic.trigger(type);

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HapticManager;
}