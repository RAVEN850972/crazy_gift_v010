// Система уведомлений о совместимости версий Telegram WebApp
class TelegramVersionManager {
    constructor() {
        this.currentVersion = null;
        this.features = {};
        this.init();
    }

    init() {
        if (window.Telegram?.WebApp) {
            this.currentVersion = parseFloat(window.Telegram.WebApp.version || '6.0');
            this.features = this.checkFeatures();
            this.showCompatibilityInfo();
        }
    }

    checkFeatures() {
        const tg = window.Telegram?.WebApp;
        if (!tg) return {};

        const version = this.currentVersion;
        
        return {
            // Основные функции
            backButton: version >= 6.1,
            hapticFeedback: version >= 6.1,
            setHeaderColor: version >= 6.1,
            cloudStorage: version >= 6.9,
            biometric: version >= 7.2,
            
            // Статус поддержки
            isFullySupported: version >= 6.1,
            isLimited: version === 6.0,
            needsUpdate: version < 6.0
        };
    }

    showCompatibilityInfo() {
        // Показываем уведомление только для ограниченных версий
        if (this.features.needsUpdate) {
            this.showUpdateNotice();
        } else if (this.features.isLimited) {
            this.showLimitedNotice();
        }
        
        // Логируем информацию для разработчика
        console.log('🔧 Telegram WebApp Compatibility Report:');
        console.log(`📱 Version: ${this.currentVersion}`);
        console.log('✅ Supported features:', Object.entries(this.features)
            .filter(([key, value]) => value === true && !key.startsWith('is') && !key.startsWith('needs'))
            .map(([key]) => key));
        console.log('❌ Unsupported features:', Object.entries(this.features)
            .filter(([key, value]) => value === false && !key.startsWith('is') && !key.startsWith('needs'))
            .map(([key]) => key));
    }

    showUpdateNotice() {
        const notice = this.createNotice(
            '⚠️ Устаревшая версия Telegram',
            'Пожалуйста, обновите Telegram для корректной работы приложения',
            'warning',
            8000
        );
        
        // Добавляем кнопку обновления
        const updateBtn = document.createElement('button');
        updateBtn.textContent = 'Как обновить?';
        updateBtn.style.cssText = `
            margin-top: 10px;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            color: white;
            font-size: 12px;
            cursor: pointer;
        `;
        updateBtn.onclick = () => this.showUpdateInstructions();
        
        notice.appendChild(updateBtn);
    }

    showLimitedNotice() {
        this.createNotice(
            '💡 Ограниченный режим',
            'Некоторые функции недоступны в Telegram 6.0. Обновите до версии 6.1+ для полного функционала',
            'info',
            5000
        );
    }

    createNotice(title, message, type = 'info', duration = 4000) {
        const notice = document.createElement('div');
        notice.className = `telegram-version-notice telegram-version-notice-${type}`;
        
        const colors = {
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
            info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            success: 'linear-gradient(135deg, #10b981, #059669)'
        };

        notice.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            z-index: 9999;
            background: ${colors[type] || colors.info};
            border-radius: 12px;
            padding: 16px 20px;
            color: white;
            font-size: 13px;
            line-height: 1.4;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transform: translateY(-100px);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
            max-width: 400px;
            margin: 0 auto;
        `;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight: 600; margin-bottom: 4px; font-size: 14px;';
        titleEl.textContent = title;

        const messageEl = document.createElement('div');
        messageEl.style.cssText = 'opacity: 0.9;';
        messageEl.textContent = message;

        notice.appendChild(titleEl);
        notice.appendChild(messageEl);

        document.body.appendChild(notice);

        // Анимация появления
        setTimeout(() => {
            notice.style.transform = 'translateY(0)';
            notice.style.opacity = '1';
        }, 100);

        // Автоскрытие
        setTimeout(() => {
            notice.style.transform = 'translateY(-100px)';
            notice.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notice)) {
                    document.body.removeChild(notice);
                }
            }, 500);
        }, duration);

        return notice;
    }

    showUpdateInstructions() {
        const modal = document.createElement('div');
        modal.className = 'update-instructions-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(10px);
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #1a1a1a;
            border-radius: 16px;
            padding: 24px;
            max-width: 400px;
            width: 100%;
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        content.innerHTML = `
            <div style="text-align: center;">
                <h3 style="margin-bottom: 16px; color: #f59e0b;">🔄 Как обновить Telegram</h3>
                <div style="text-align: left; margin-bottom: 20px; line-height: 1.6;">
                    <p style="margin-bottom: 12px;"><strong>📱 На телефоне:</strong></p>
                    <p style="margin-bottom: 8px; color: #cccccc;">1. Откройте магазин приложений</p>
                    <p style="margin-bottom: 8px; color: #cccccc;">2. Найдите "Telegram"</p>
                    <p style="margin-bottom: 8px; color: #cccccc;">3. Нажмите "Обновить"</p>
                    <p style="margin-bottom: 16px; color: #cccccc;">4. Перезапустите приложение</p>
                    
                    <p style="margin-bottom: 8px;"><strong>💻 На компьютере:</strong></p>
                    <p style="margin-bottom: 8px; color: #cccccc;">1. Откройте Telegram Desktop</p>
                    <p style="margin-bottom: 8px; color: #cccccc;">2. Меню → Проверить обновления</p>
                    <p style="color: #cccccc;">3. Установите обновление</p>
                </div>
                <button onclick="this.closest('.update-instructions-modal').remove()" 
                        style="
                            width: 100%;
                            padding: 12px;
                            background: linear-gradient(135deg, #f59e0b, #d97706);
                            border: none;
                            border-radius: 10px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                            font-size: 14px;
                        ">
                    Понятно
                </button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Закрытие по клику на overlay
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    // Проверка поддержки конкретной функции
    isFeatureSupported(featureName) {
        return this.features[featureName] || false;
    }

    // Получение рекомендаций по функциям
    getFeatureRecommendations() {
        if (this.features.needsUpdate) {
            return {
                recommendation: 'critical_update',
                message: 'Требуется обновление Telegram'
            };
        } else if (this.features.isLimited) {
            return {
                recommendation: 'optional_update',
                message: 'Рекомендуется обновление для полного функционала'
            };
        } else {
            return {
                recommendation: 'fully_supported',
                message: 'Все функции поддерживаются'
            };
        }
    }
}

// Инициализируем менеджер версий
const telegramVersionManager = new TelegramVersionManager();

// Экспортируем для глобального использования
window.telegramVersionManager = telegramVersionManager;

// Хелпер функция для проверки поддержки функций
window.isTelegramFeatureSupported = (featureName) => {
    return telegramVersionManager.isFeatureSupported(featureName);
};