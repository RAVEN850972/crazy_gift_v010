/**
 * CrazyGift API Client
 * Централизованный клиент для работы с backend API
 */

class CrazyGiftAPIClient {
    constructor(baseURL = 'http://localhost:8000/api') {
        this.baseURL = baseURL;
        this.cache = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * Базовый метод для выполнения HTTP запросов
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, config);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
                
            } catch (error) {
                lastError = error;
                console.warn(`API request attempt ${attempt} failed:`, error.message);
                
                if (attempt < this.retryAttempts && this.shouldRetry(error)) {
                    await this.delay(this.retryDelay * attempt);
                    continue;
                }
                break;
            }
        }
        
        throw lastError;
    }

    /**
     * Определяет, стоит ли повторить запрос
     */
    shouldRetry(error) {
        // Повторяем только сетевые ошибки, не ошибки валидации
        return error.name === 'TypeError' || // Network error
               error.message.includes('Failed to fetch') ||
               error.message.includes('NetworkError');
    }

    /**
     * Задержка для retry
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Кэширование запросов
     */
    async getWithCache(cacheKey, fetcher, ttl = 60000) {
        if (this.cache.has(cacheKey)) {
            const { data, timestamp } = this.cache.get(cacheKey);
            if (Date.now() - timestamp < ttl) {
                return data;
            }
        }
        
        const data = await fetcher();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    }

    /**
     * Очистка кэша
     */
    clearCache(pattern = null) {
        if (!pattern) {
            this.cache.clear();
            return;
        }
        
        for (const [key] of this.cache) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    // ========== AUTHENTICATION ==========

    /**
     * Авторизация пользователя через Telegram WebApp
     */
    async authenticateUser() {
        if (!window.Telegram?.WebApp?.initData) {
            throw new Error('Telegram WebApp data not available');
        }

        const initData = window.Telegram.WebApp.initData;
        
        return await this.request('/users/auth', {
            method: 'POST',
            body: JSON.stringify({ init_data: initData })
        });
    }

    // ========== USERS ==========

    /**
     * Получить профиль пользователя
     */
    async getUserProfile(userId) {
        return await this.getWithCache(
            `user_profile_${userId}`,
            () => this.request(`/users/${userId}/profile`),
            30000 // 30 секунд кэш
        );
    }

    /**
     * Обновить профиль пользователя
     */
    async updateUserProfile(userId, updateData) {
        const result = await this.request(`/users/${userId}/profile`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        // Очищаем кэш профиля после обновления
        this.clearCache(`user_profile_${userId}`);
        
        return result;
    }

    /**
     * Получить баланс пользователя
     */
    async getUserBalance(userId) {
        return await this.request(`/users/${userId}/balance`);
    }

    /**
     * Получить статистику пользователя
     */
    async getUserStats(userId) {
        return await this.getWithCache(
            `user_stats_${userId}`,
            () => this.request(`/users/${userId}/stats`),
            60000 // 1 минута кэш
        );
    }

    /**
     * Получить историю операций
     */
    async getUserHistory(userId, options = {}) {
        const params = new URLSearchParams(options);
        return await this.request(`/users/${userId}/history?${params}`);
    }

    /**
     * Получить рефералов пользователя
     */
    async getUserReferrals(userId) {
        return await this.getWithCache(
            `user_referrals_${userId}`,
            () => this.request(`/users/${userId}/referrals`),
            120000 // 2 минуты кэш
        );
    }

    // ========== CASES ==========

    /**
     * Получить список кейсов
     */
    async getCases(options = {}) {
        const params = new URLSearchParams(options);
        return await this.getWithCache(
            `cases_${params.toString()}`,
            () => this.request(`/cases/?${params}`),
            300000 // 5 минут кэш
        );
    }

    /**
     * Получить детали кейса
     */
    async getCaseDetails(caseId) {
        return await this.getWithCache(
            `case_details_${caseId}`,
            () => this.request(`/cases/${caseId}`),
            300000 // 5 минут кэш
        );
    }

    /**
     * Открыть кейс
     */
    async openCase(caseId, userId) {
        const result = await this.request(`/cases/${caseId}/open`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
        
        // Очищаем кэш пользователя после открытия кейса
        this.clearCache(`user_`);
        
        return result;
    }

    /**
     * Получить категории кейсов
     */
    async getCaseCategories() {
        return await this.getWithCache(
            'case_categories',
            () => this.request('/cases/categories'),
            600000 // 10 минут кэш
        );
    }

    /**
     * Получить статистику кейсов
     */
    async getCaseStats() {
        return await this.getWithCache(
            'case_stats',
            () => this.request('/cases/stats'),
            120000 // 2 минуты кэш
        );
    }

    // ========== INVENTORY ==========

    /**
     * Получить инвентарь пользователя
     */
    async getInventory(userId, options = {}) {
        const params = new URLSearchParams(options);
        return await this.request(`/inventory/${userId}?${params}`);
    }

    /**
     * Получить статистику инвентаря
     */
    async getInventoryStats(userId) {
        return await this.getWithCache(
            `inventory_stats_${userId}`,
            () => this.request(`/inventory/${userId}/stats`),
            60000 // 1 минута кэш
        );
    }

    /**
     * Продать предмет
     */
    async sellItem(itemId, userId) {
        const result = await this.request(`/inventory/${itemId}/sell`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
        
        // Очищаем кэш после продажи
        this.clearCache(`user_`);
        this.clearCache(`inventory_`);
        
        return result;
    }

    /**
     * Запросить вывод предмета
     */
    async withdrawItem(itemId, userId, contactInfo = null) {
        const result = await this.request(`/inventory/${itemId}/withdraw`, {
            method: 'POST',
            body: JSON.stringify({ 
                user_id: userId,
                contact_info: contactInfo 
            })
        });
        
        // Очищаем кэш после запроса вывода
        this.clearCache(`inventory_`);
        
        return result;
    }

    /**
     * Получить запросы на вывод
     */
    async getWithdrawalRequests(userId) {
        return await this.request(`/inventory/${userId}/withdrawals`);
    }

    // ========== PAYMENTS ==========

    /**
     * Создать депозит TON
     */
    async createTonDeposit(userId, amount) {
        return await this.request('/payments/ton/deposit', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                amount: amount
            })
        });
    }

    /**
     * Создать инвойс для Telegram Stars
     */
    async createStarsInvoice(userId, starsAmount) {
        return await this.request('/payments/stars/invoice', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                stars_amount: starsAmount
            })
        });
    }

    /**
     * Получить информацию о транзакции
     */
    async getTransaction(transactionId) {
        return await this.request(`/payments/transaction/${transactionId}`);
    }

    /**
     * Webhook для TON платежей (для демонстрации)
     */
    async simulateTonWebhook(transactionId, txHash) {
        return await this.request('/payments/webhook/ton', {
            method: 'POST',
            body: JSON.stringify({
                transaction_id: transactionId,
                tx_hash: txHash
            })
        });
    }

    /**
     * Webhook для Telegram платежей (для демонстрации)
     */
    async simulateTelegramWebhook(transactionId, paymentId, status = 'paid') {
        return await this.request('/payments/webhook/telegram', {
            method: 'POST',
            body: JSON.stringify({
                transaction_id: transactionId,
                payment_id: paymentId,
                status: status
            })
        });
    }

    // ========== SYSTEM ==========

    /**
     * Проверка здоровья API
     */
    async healthCheck() {
        return await this.request('/health', {
            timeout: 5000 // Короткий таймаут для проверки
        });
    }

    /**
     * Получить публичную статистику
     */
    async getPublicStats() {
        return await this.getWithCache(
            'public_stats',
            () => this.request('/stats'),
            60000 // 1 минута кэш
        );
    }

    /**
     * Проверка доступности API
     */
    async checkAvailability() {
        try {
            await this.healthCheck();
            return true;
        } catch (error) {
            console.warn('API недоступен:', error.message);
            return false;
        }
    }
}

// Создаем глобальный экземпляр API клиента
window.apiClient = new CrazyGiftAPIClient();

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrazyGiftAPIClient;
}