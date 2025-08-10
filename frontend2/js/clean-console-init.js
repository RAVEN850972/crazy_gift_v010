// Улучшенное логирование для разработки
function logTelegramInit() {
    console.log('🚀 CrazyGift WebApp запущен');
    
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        const version = parseFloat(tg.version || '6.0');
        
        console.log(`📱 Telegram WebApp v${tg.version}`);
        
        // Цветное логирование статуса
        if (version >= 6.1) {
            console.log('%c✅ Полная поддержка функций', 'color: #00ff87; font-weight: bold;');
        } else if (version === 6.0) {
            console.log('%c⚠️  Ограниченная поддержка (v6.0)', 'color: #f59e0b; font-weight: bold;');
            console.log('%c💡 Обновите Telegram для полного функционала', 'color: #3b82f6;');
        } else {
            console.log('%c❌ Требуется обновление Telegram', 'color: #ef4444; font-weight: bold;');
        }
        
        // Информация о пользователе
        if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;
            console.log(`👤 Пользователь: ${user.first_name} ${user.last_name || ''} (@${user.username || 'без username'})`);
        }
        
    } else {
        console.log('%c🌐 Запуск в браузере (без Telegram WebApp)', 'color: #6b7280;');
    }
    
    console.log('---');
}

// Запускаем красивое логирование
logTelegramInit();

// Глобальная функция для дебага
window.debugTelegram = () => {
    console.clear();
    logTelegramInit();
    
    if (window.telegramVersionManager) {
        const recommendations = window.telegramVersionManager.getFeatureRecommendations();
        console.log('🔧 Рекомендации:', recommendations);
    }
    
    console.log('🎮 Состояние игры:', window.GameState || 'Не инициализировано');
};