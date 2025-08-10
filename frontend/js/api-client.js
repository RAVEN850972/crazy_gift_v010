/**
 * API клиент для взаимодействия с backend CrazyGift
 * Обеспечивает все методы для работы с сервером
 */
class APIClient {
    constructor() {
        this.baseURL = 'http://localhost:8000/api';
        this.authenticated = false;
        this.userId = null;
        this.authToken = null;
    }

    /**
     * Генерация фиктивных Telegram auth данных для разработки
     */
    generateTelegramAuthData() {
        const mockData = {
            id: Math.floor(Math.random() * 1000000),
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            auth_date: Math.floor(Date.now() / 1000)
        };
        
        // Простая сериализация для тестов
        const dataString = Object.keys(mockData)
            .sort()
            .map(key => `${key}=${mockData[key]}`)
            .join('\n');
        
        return {
            ...mockData,
            hash: 'mock_hash_' + Math.random().toString(36).substr(2, 9)
        };
    }

    /**
     * Авторизация пользователя через Telegram WebApp
     */
    async authenticateUser() {
        try {
            let authData;
            
            // Попытка получить реальные данные из Telegram WebApp
            if (window.Telegram?.WebApp?.initData) {
                authData = window.Telegram.WebApp.initData;
            } else {
                // Генерация тестовых данных для разработки
                authData = this.generateTelegramAuthData();
            }

            const response = await fetch(`${this.baseURL}/users/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ telegram_auth_data: authData })
            });

            if (!response.ok) {
                throw new Error(`Auth failed: ${response.status}`);
            }

            const userData = await response.json();
            
            this.authenticated = true;
            this.userId = userData.id;
            
            // Обновляем глобальное состояние
            window.GameState.setUser(userData);
            
            return userData;

        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    /**
     * Получение списка доступных кейсов
     */
    async getCases() {
        try {
            const response = await fetch(`${this.baseURL}/cases/`);
            
            if (!response.ok) {
                throw new Error(`Get cases failed: ${response.status}`);
            }

            const cases = await response.json();
            window.GameState.cachedCases = cases;
            
            return cases;

        } catch (error) {
            console.error('Get cases error:', error);
            throw error;
        }
    }

    /**
     * Получение информации о конкретном кейсе
     */
    async getCase(caseId) {
        try {
            const response = await fetch(`${this.baseURL}/cases/${caseId}`);
            
            if (!response.ok) {
                throw new Error(`Get case failed: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Get case error:', error);
            throw error;
        }
    }

    /**
     * Открытие кейса
     */
    async openCase(caseId, userId) {
        try {
            const response = await fetch(`${this.baseURL}/cases/${caseId}/open`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: userId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Open case failed: ${response.status}`);
            }

            const result = await response.json();
            
            // Обновляем баланс в глобальном состоянии
            if (result.new_balance !== undefined) {
                window.GameState.updateBalance(result.new_balance);
            }
            
            return result;

        } catch (error) {
            console.error('Open case error:', error);
            throw error;
        }
    }

    /**
     * Получение инвентаря пользователя
     */
    async getInventory(userId) {
        try {
            const response = await fetch(`${this.baseURL}/inventory/${userId}`);
            
            if (!response.ok) {
                throw new Error(`Get inventory failed: ${response.status}`);
            }

            const inventory = await response.json();
            window.GameState.cachedInventory = inventory;
            
            return inventory;

        } catch (error) {
            console.error('Get inventory error:', error);
            throw error;
        }
    }

    /**
     * Продажа предмета из инвентаря
     */
    async sellItem(itemId, userId) {
        try {
            const response = await fetch(`${this.baseURL}/inventory/${itemId}/sell`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: userId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Sell item failed: ${response.status}`);
            }

            const result = await response.json();
            
            // Обновляем баланс
            if (result.new_balance !== undefined) {
                window.GameState.updateBalance(result.new_balance);
            }
            
            return result;

        } catch (error) {
            console.error('Sell item error:', error);
            throw error;
        }
    }

    /**
     * Создание TON депозита
     */
    async createTonDeposit(userId, amount) {
        try {
            const response = await fetch(`${this.baseURL}/payments/ton/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    user_id: userId, 
                    amount: parseFloat(amount) 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `TON deposit failed: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('TON deposit error:', error);
            throw error;
        }
    }

    /**
     * Создание Stars инвойса
     */
    async createStarsInvoice(userId, starsAmount) {
        try {
            const response = await fetch(`${this.baseURL}/payments/stars/invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    user_id: userId, 
                    stars_amount: parseInt(starsAmount) 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Stars invoice failed: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Stars invoice error:', error);
            throw error;
        }
    }

    /**
     * Получение профиля пользователя
     */
    async getUserProfile(userId) {
        try {
            const response = await fetch(`${this.baseURL}/users/${userId}/profile`);
            
            if (!response.ok) {
                throw new Error(`Get profile failed: ${response.status}`);
            }

            const profile = await response.json();
            
            // Обновляем баланс
            if (profile.balance_stars !== undefined) {
                window.GameState.updateBalance(profile.balance_stars);
            }
            
            return profile;

        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    }

    /**
     * Получение баланса пользователя
     */
    async getUserBalance(userId) {
        try {
            const response = await fetch(`${this.baseURL}/users/${userId}/balance`);
            
            if (!response.ok) {
                throw new Error(`Get balance failed: ${response.status}`);
            }

            const balance = await response.json();
            
            // Обновляем глобальное состояние
            window.GameState.updateBalance(balance.balance_stars);
            
            return balance;

        } catch (error) {
            console.error('Get balance error:', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр API клиента
window.apiClient = new APIClient();