/**
 * Глобальное состояние приложения CrazyGift
 * Управляет текущим режимом работы и данными пользователя
 */
window.GameState = {
    // Режим работы приложения
    demoMode: true,
    
    // Данные пользователя
    currentUserId: null,
    balance: 0, // Реальный баланс из API
    authenticated: false,
    
    // Кэш данных
    cachedCases: null,
    cachedInventory: null,
    
    // Методы для управления состоянием
    setDemoMode: function(isDemo) {
        this.demoMode = isDemo;
        if (isDemo) {
            console.log('⚠️ Демо режим активен - данные не сохраняются');
        } else {
            console.log('✅ API режим активен - подключение к серверу');
        }
    },
    
    setUser: function(userData) {
        this.currentUserId = userData.id;
        this.balance = userData.balance_stars || 0;
        this.authenticated = true;
    },
    
    updateBalance: function(newBalance) {
        this.balance = newBalance;
        // Обновить в UI
        const balanceElement = document.getElementById('balance');
        if (balanceElement) {
            balanceElement.textContent = newBalance.toLocaleString();
        }
    },
    
    clearCache: function() {
        this.cachedCases = null;
        this.cachedInventory = null;
    }
};