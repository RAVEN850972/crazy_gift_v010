/**
 * Интеграционные обертки для работы с API и fallback логикой
 * Обеспечивают seamless переключение между API и демо режимами
 */

/**
 * Универсальная обертка для выполнения операций с fallback
 */
async function executeWithFallback(apiOperation, demoOperation) {
    // Если демо режим активен - сразу выполняем демо операцию
    if (window.GameState?.demoMode) {
        return demoOperation();
    }
    
    try {
        // Пытаемся выполнить API операцию
        return await apiOperation();
    } catch (error) {
        console.warn('API операция провалилась, переключение на демо:', error.message);
        
        // Показываем уведомление о проблеме (если есть функция)
        if (typeof showNotification === 'function') {
            showNotification('Проблемы с сервером, переключение в демо режим', 'warning');
        }
        
        // Выполняем демо операцию как fallback
        return demoOperation();
    }
}

/**
 * Обертка для загрузки кейсов
 */
async function loadCasesWithAPI() {
    return await executeWithFallback(
        // API операция - реальные кейсы
        async () => {
            const cases = await window.apiClient.getCases();
            console.log('✅ Загружены реальные кейсы:', cases.length);
            return cases;
        },
        // Демо операция - минимальная заглушка
        () => {
            console.log('⚠️ Используются демо кейсы');
            return [
                {
                    id: 1,
                    name: "Демо кейс",
                    price_stars: 100,
                    image_url: "assets/cases/case1.png",
                    description: "Демо режим"
                }
            ];
        }
    );
}

/**
 * Обертка для открытия кейса
 */
async function openCaseWithAPI(caseId) {
    return await executeWithFallback(
        // API операция - реальное открытие
        async () => {
            const result = await window.apiClient.openCase(caseId, window.GameState.currentUserId);
            console.log('✅ Кейс открыт через API:', result);
            return result;
        },
        // Демо операция - симуляция
        () => {
            console.log('⚠️ Демо открытие кейса');
            const mockResult = {
                success: true,
                item: {
                    id: Date.now(),
                    name: "Демо предмет",
                    value: 150,
                    stars: 150,
                    rarity: "common",
                    image_url: "assets/items/demo_item.png"
                },
                new_balance: window.GameState.balance + 50
            };
            
            // Обновляем демо баланс
            window.GameState.updateBalance(mockResult.new_balance);
            
            return mockResult;
        }
    );
}

/**
 * Обертка для загрузки инвентаря
 */
async function loadInventoryWithAPI() {
    return await executeWithFallback(
        // API операция - реальный инвентарь
        async () => {
            const inventory = await window.apiClient.getInventory(window.GameState.currentUserId);
            console.log('✅ Загружен реальный инвентарь:', inventory.items?.length || 0, 'предметов');
            return inventory;
        },
        // Демо операция - пустая заглушка
        () => {
            console.log('⚠️ Демо инвентарь пуст');
            return {
                items: [],
                total_value: 0,
                message: "API недоступен - инвентарь пуст"
            };
        }
    );
}

/**
 * Обертка для продажи предмета
 */
async function sellItemWithAPI(itemId) {
    return await executeWithFallback(
        // API операция - реальная продажа
        async () => {
            const result = await window.apiClient.sellItem(itemId, window.GameState.currentUserId);
            console.log('✅ Предмет продан через API:', result);
            return result;
        },
        // Демо операция - симуляция продажи
        () => {
            console.log('⚠️ Демо продажа предмета');
            const mockResult = {
                success: true,
                message: "Предмет продан (демо)",
                earned_stars: 100,
                new_balance: window.GameState.balance + 100
            };
            
            // Обновляем демо баланс
            window.GameState.updateBalance(mockResult.new_balance);
            
            return mockResult;
        }
    );
}

/**
 * Обертка для создания TON платежа
 */
async function createTonPaymentWithAPI(amount) {
    return await executeWithFallback(
        // API операция - реальный платеж
        async () => {
            const result = await window.apiClient.createTonDeposit(window.GameState.currentUserId, amount);
            console.log('✅ TON платеж создан:', result);
            return result;
        },
        // Демо операция - симуляция
        () => {
            console.log('⚠️ Демо TON платеж');
            return {
                success: true,
                message: "Демо TON платеж",
                transaction_id: Date.now(),
                amount: amount
            };
        }
    );
}

/**
 * Обертка для создания Stars платежа
 */
async function createStarsPaymentWithAPI(starsAmount) {
    return await executeWithFallback(
        // API операция - реальный инвойс
        async () => {
            const result = await window.apiClient.createStarsInvoice(window.GameState.currentUserId, starsAmount);
            console.log('✅ Stars инвойс создан:', result);
            return result;
        },
        // Демо операция - симуляция
        () => {
            console.log('⚠️ Демо Stars платеж');
            return {
                success: true,
                message: "Демо Stars платеж",
                invoice_link: "#demo",
                stars_amount: starsAmount
            };
        }
    );
}

/**
 * Обертка для обновления баланса
 */
async function updateBalanceWithAPI() {
    return await executeWithFallback(
        // API операция - реальный баланс
        async () => {
            const balance = await window.apiClient.getUserBalance(window.GameState.currentUserId);
            console.log('✅ Баланс обновлен из API:', balance.balance_stars);
            return balance;
        },
        // Демо операция - текущий демо баланс
        () => {
            console.log('⚠️ Демо баланс:', window.GameState.balance);
            return {
                balance_stars: window.GameState.balance,
                balance_ton: 0
            };
        }
    );
}

/**
 * Обертка для получения профиля пользователя
 */
async function getUserProfileWithAPI() {
    return await executeWithFallback(
        // API операция - реальный профиль
        async () => {
            const profile = await window.apiClient.getUserProfile(window.GameState.currentUserId);
            console.log('✅ Профиль загружен из API');
            return profile;
        },
        // Демо операция - фиктивный профиль
        () => {
            console.log('⚠️ Демо профиль');
            return {
                id: null,
                username: "demo_user",
                first_name: "Demo",
                last_name: "User",
                balance_stars: window.GameState.balance,
                total_cases_opened: 0,
                created_at: new Date().toISOString()
            };
        }
    );
}

/**
 * Утилита для показа уведомлений о режиме работы
 */
function notifyCurrentMode() {
    if (typeof showNotification === 'function') {
        if (window.GameState?.demoMode) {
            showNotification('Демо режим активен', 'info');
        } else {
            showNotification('Подключен к серверу', 'success');
        }
    }
}

/**
 * Периодическое обновление баланса (если не в демо режиме)
 */
function startBalanceUpdater() {
    setInterval(async () => {
        if (!window.GameState?.demoMode && window.GameState?.authenticated) {
            try {
                await updateBalanceWithAPI();
            } catch (error) {
                console.warn('Ошибка автообновления баланса:', error.message);
            }
        }
    }, 30000); // Каждые 30 секунд
}

// Запускаем автообновление баланса после загрузки
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(startBalanceUpdater, 5000); // Задержка 5 секунд после загрузки
});