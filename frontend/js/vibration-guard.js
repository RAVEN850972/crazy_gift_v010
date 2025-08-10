// Система защиты от преждевременной вибрации
(function() {
    'use strict';
    
    // Сохраняем оригинальную функцию vibrate
    const originalVibrate = navigator.vibrate?.bind(navigator);
    
    // Флаг готовности к вибрации
    let canVibrate = false;
    
    // Перехватываем вызовы navigator.vibrate
    if (navigator.vibrate) {
        navigator.vibrate = function(pattern) {
            if (!canVibrate) {
                console.log('🚫 Вибрация заблокирована до взаимодействия пользователя');
                return false;
            }
            
            return originalVibrate.call(this, pattern);
        };
    }
    
    // Настраиваем разблокировку вибрации
    function setupVibrationUnlock() {
        const unlockEvents = ['touchstart', 'click', 'keydown', 'mousedown'];
        
        function unlockVibration() {
            if (canVibrate) return;
            
            canVibrate = true;
            console.log('🔓 Вибрация разблокирована');
            
            // Удаляем обработчики
            unlockEvents.forEach(eventType => {
                document.removeEventListener(eventType, unlockVibration, true);
            });
            
            // Обновляем глобальный флаг
            window.hasUserInteracted = true;
        }
        
        // Добавляем обработчики
        unlockEvents.forEach(eventType => {
            document.addEventListener(eventType, unlockVibration, true);
        });
    }
    
    // Инициализируем защиту
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupVibrationUnlock);
    } else {
        setupVibrationUnlock();
    }
    
    // Экспортируем функцию проверки
    window.canUseVibration = () => canVibrate;
    
})();