/**
 * API детектор - определяет доступность backend и инициализирует приложение
 * Автоматически переключает между API и демо режимами
 */
class APIDetector {
    
    /**
     * Проверка доступности API
     */
    static async checkAvailability() {
        try {
            const response = await fetch('http://localhost:8000/health', {
                method: 'GET',
                timeout: 3000 // 3 секунды таймаут
            });
            
            return response.ok;
            
        } catch (error) {
            console.warn('API недоступен:', error.message);
            return false;
        }
    }

    /**
     * Показать уведомление о режиме работы
     */
    static showModeNotification(isDemo) {
        // Поиск существующей функции уведомлений
        if (typeof showNotification === 'function') {
            if (isDemo) {
                showNotification('Демо режим: данные не сохраняются', 'info');
            } else {
                showNotification('Подключено к серверу', 'success');
            }
        } else {
            // Если функции нет, выводим в консоль
            if (isDemo) {
                console.log('⚠️ Демо режим активен - данные не сохраняются');
            } else {
                console.log('✅ Подключение к серверу установлено');
            }
        }
    }

    /**
     * Инициализация приложения с определением режима
     */
    static async initializeApp() {
        console.log('🔄 Инициализация CrazyGift...');
        
        // Проверяем доступность API
        const apiAvailable = await this.checkAvailability();
        
        if (apiAvailable) {
            try {
                // Пытаемся авторизоваться
                await window.apiClient.authenticateUser();
                
                // Успешная авторизация - API режим
                window.GameState.setDemoMode(false);
                this.showModeNotification(false);
                
                console.log('✅ API режим активен');
                console.log('Пользователь ID:', window.GameState.currentUserId);
                console.log('Баланс:', window.GameState.balance);
                
                // Загружаем начальные данные
                await this.preloadData();
                
            } catch (error) {
                console.error('Ошибка авторизации, переключение в демо режим:', error);
                this.activateDemoMode();
            }
        } else {
            console.log('⚠️ API недоступен, активация демо режима');
            this.activateDemoMode();
        }
        
        // Периодическая проверка соединения (каждые 30 секунд)
        this.startConnectionMonitoring();
    }

    /**
     * Активация демо режима
     */
    static activateDemoMode() {
        window.GameState.setDemoMode(true);
        window.GameState.balance = 2500; // Демо баланс
        window.GameState.updateBalance(2500);
        this.showModeNotification(true);
    }

    /**
     * Предзагрузка данных для API режима
     */
    static async preloadData() {
        try {
            // Загружаем кейсы в кэш
            await window.apiClient.getCases();
            console.log('✅ Кейсы загружены в кэш');
            
            // Можно добавить предзагрузку инвентаря
            // await window.apiClient.getInventory(window.GameState.currentUserId);
            
        } catch (error) {
            console.warn('Ошибка предзагрузки данных:', error);
        }
    }

    /**
     * Мониторинг соединения с API
     */
    static startConnectionMonitoring() {
        setInterval(async () => {
            const apiAvailable = await this.checkAvailability();
            
            // Если режимы не совпадают с доступностью API
            if (apiAvailable && window.GameState.demoMode) {
                console.log('🔄 API восстановлен, пытаемся переключиться');
                // Можно реализовать автоматическое переключение
            } else if (!apiAvailable && !window.GameState.demoMode) {
                console.log('⚠️ Потеряно соединение с API');
                // Пока оставляем как есть, можно добавить fallback
            }
        }, 30000); // Проверка каждые 30 секунд
    }

    /**
     * Принудительная повторная инициализация
     */
    static async reinitialize() {
        console.log('🔄 Повторная инициализация...');
        window.GameState.clearCache();
        await this.initializeApp();
    }

    /**
     * Получение статуса приложения
     */
    static getStatus() {
        return {
            demoMode: window.GameState.demoMode,
            authenticated: window.GameState.authenticated,
            userId: window.GameState.currentUserId,
            balance: window.GameState.balance,
            apiClient: !!window.apiClient
        };
    }
}

// Автоматическая инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await APIDetector.initializeApp();
    } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
        // Fallback в демо режим
        APIDetector.activateDemoMode();
    }
});

// Экспорт для глобального использования
window.APIDetector = APIDetector;