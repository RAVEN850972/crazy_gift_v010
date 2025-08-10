/**
 * Storage Manager
 * Универсальная система для работы с localStorage, sessionStorage и облачным хранилищем
 */

class StorageManager {
    constructor() {
        this.prefix = 'crazygift_';
        this.cloudStorage = null;
        this.syncQueue = new Map();
        this.syncInProgress = false;
        
        this.init();
    }

    /**
     * Инициализация системы хранения
     */
    init() {
        // Проверяем доступность облачного хранилища
        if (window.telegramApp?.isFeatureSupported('cloudStorage')) {
            this.cloudStorage = window.telegramApp;
            console.log('✅ Облачное хранилище Telegram доступно');
        }
        
        // Настраиваем автосинхронизацию
        this.setupAutoSync();
    }

    /**
     * Сохранение данных
     */
    async set(key, value, options = {}) {
        const {
            sync = false,
            persistent = true,
            encrypt = false
        } = options;

        const storageKey = this.prefix + key;
        let dataToStore = value;

        // Шифрование если требуется
        if (encrypt) {
            dataToStore = this.encrypt(JSON.stringify(value));
        } else if (typeof value === 'object') {
            dataToStore = JSON.stringify(value);
        }

        try {
            // Сохраняем локально
            if (persistent) {
                localStorage.setItem(storageKey, dataToStore);
            } else {
                sessionStorage.setItem(storageKey, dataToStore);
            }

            // Добавляем в очередь синхронизации
            if (sync && this.cloudStorage) {
                this.syncQueue.set(key, { value, timestamp: Date.now(), encrypt });
                this.scheduleSyncToCloud();
            }

            return true;
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            return false;
        }
    }

    /**
     * Получение данных
     */
    async get(key, options = {}) {
        const {
            defaultValue = null,
            fromCloud = false,
            decrypt = false
        } = options;

        const storageKey = this.prefix + key;

        try {
            let data = null;

            // Пытаемся получить из облака если требуется
            if (fromCloud && this.cloudStorage) {
                try {
                    data = await this.cloudStorage.getCloudStorage(key);
                } catch (error) {
                    console.warn('Ошибка получения из облака, используем локальное хранилище:', error);
                }
            }

            // Если нет данных из облака, берем локально
            if (data === null) {
                data = localStorage.getItem(storageKey) || 
                       sessionStorage.getItem(storageKey);
            }

            if (data === null) {
                return defaultValue;
            }

            // Расшифровка если требуется
            if (decrypt) {
                data = this.decrypt(data);
            }

            // Парсинг JSON
            try {
                return JSON.parse(data);
            } catch {
                return data; // Возвращаем как есть если не JSON
            }

        } catch (error) {
            console.error('Ошибка получения данных:', error);
            return defaultValue;
        }
    }

    /**
     * Удаление данных
     */
    async remove(key, options = {}) {
        const { fromCloud = false } = options;
        const storageKey = this.prefix + key;

        try {
            // Удаляем локально
            localStorage.removeItem(storageKey);
            sessionStorage.removeItem(storageKey);

            // Удаляем из облака если требуется
            if (fromCloud && this.cloudStorage) {
                await this.cloudStorage.setCloudStorage(key, '');
            }

            // Удаляем из очереди синхронизации
            this.syncQueue.delete(key);

            return true;
        } catch (error) {
            console.error('Ошибка удаления данных:', error);
            return false;
        }
    }

    /**
     * Очистка всех данных
     */
    async clear(options = {}) {
        const { includeCloud = false } = options;

        try {
            // Получаем все ключи с префиксом
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }

            // Удаляем локально
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                const cleanKey = key.replace(this.prefix, '');
                this.syncQueue.delete(cleanKey);
            });

            // Очищаем sessionStorage
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const key = sessionStorage.key(i);
                if (key?.startsWith(this.prefix)) {
                    sessionStorage.removeItem(key);
                }
            }

            // Очищаем облако если требуется
            if (includeCloud && this.cloudStorage) {
                // TODO: Реализовать очистку облачного хранилища
                console.log('Очистка облачного хранилища пока не реализована');
            }

            return true;
        } catch (error) {
            console.error('Ошибка очистки данных:', error);
            return false;
        }
    }

    /**
     * Получение всех ключей
     */
    getKeys(persistent = true) {
        const storage = persistent ? localStorage : sessionStorage;
        const keys = [];
        
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key?.startsWith(this.prefix)) {
                keys.push(key.replace(this.prefix, ''));
            }
        }
        
        return keys;
    }

    /**
     * Синхронизация с облаком
     */
    async syncToCloud() {
        if (!this.cloudStorage || this.syncInProgress || this.syncQueue.size === 0) {
            return;
        }

        this.syncInProgress = true;
        console.log(`🔄 Синхронизация ${this.syncQueue.size} элементов с облаком...`);

        const syncPromises = [];
        const itemsToSync = Array.from(this.syncQueue.entries());

        for (const [key, data] of itemsToSync) {
            const syncPromise = this.syncSingleItem(key, data);
            syncPromises.push(syncPromise);
        }

        try {
            await Promise.allSettled(syncPromises);
            this.syncQueue.clear();
            console.log('✅ Синхронизация с облаком завершена');
        } catch (error) {
            console.error('❌ Ошибка синхронизации с облаком:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Синхронизация одного элемента
     */
    async syncSingleItem(key, data) {
        try {
            let valueToSync = data.value;
            
            if (data.encrypt) {
                valueToSync = this.encrypt(JSON.stringify(data.value));
            } else if (typeof data.value === 'object') {
                valueToSync = JSON.stringify(data.value);
            }

            await this.cloudStorage.setCloudStorage(key, valueToSync);
            return true;
        } catch (error) {
            console.warn(`Ошибка синхронизации ключа ${key}:`, error);
            return false;
        }
    }

    /**
     * Планирование синхронизации
     */
    scheduleSyncToCloud() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        this.syncTimeout = setTimeout(() => {
            this.syncToCloud();
        }, 2000); // Синхронизируем через 2 секунды после последнего изменения
    }

    /**
     * Настройка автосинхронизации
     */
    setupAutoSync() {
        // Синхронизируем при видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.syncQueue.size > 0) {
                this.syncToCloud();
            }
        });

        // Синхронизируем перед закрытием
        window.addEventListener('beforeunload', () => {
            if (this.syncQueue.size > 0) {
                // Синхронный вызов для beforeunload
                this.syncToCloudSync();
            }
        });
    }

    /**
     * Синхронная синхронизация (для beforeunload)
     */
    syncToCloudSync() {
        if (!this.cloudStorage || this.syncQueue.size === 0) return;

        try {
            for (const [key, data] of this.syncQueue) {
                let valueToSync = data.value;
                
                if (data.encrypt) {
                    valueToSync = this.encrypt(JSON.stringify(data.value));
                } else if (typeof data.value === 'object') {
                    valueToSync = JSON.stringify(data.value);
                }

                // Используем navigator.sendBeacon если доступен
                if (navigator.sendBeacon) {
                    const payload = JSON.stringify({ key, value: valueToSync });
                    navigator.sendBeacon('/api/sync', payload);
                }
            }
        } catch (error) {
            console.error('Ошибка синхронной синхронизации:', error);
        }
    }

    /**
     * Простое шифрование (Base64)
     */
    encrypt(data) {
        try {
            return btoa(encodeURIComponent(data));
        } catch (error) {
            console.error('Ошибка шифрования:', error);
            return data;
        }
    }

    /**
     * Расшифровка
     */
    decrypt(encryptedData) {
        try {
            return decodeURIComponent(atob(encryptedData));
        } catch (error) {
            console.error('Ошибка расшифровки:', error);
            return encryptedData;
        }
    }

    /**
     * Получение размера хранилища
     */
    getStorageSize() {
        let localSize = 0;
        let sessionSize = 0;

        // Размер localStorage
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key) && key.startsWith(this.prefix)) {
                localSize += localStorage[key].length + key.length;
            }
        }

        // Размер sessionStorage
        for (let key in sessionStorage) {
            if (sessionStorage.hasOwnProperty(key) && key.startsWith(this.prefix)) {
                sessionSize += sessionStorage[key].length + key.length;
            }
        }

        return {
            localStorage: this.formatBytes(localSize),
            sessionStorage: this.formatBytes(sessionSize),
            total: this.formatBytes(localSize + sessionSize)
        };
    }

    /**
     * Форматирование размера в байтах
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Проверка доступности хранилища
     */
    isStorageAvailable(type = 'localStorage') {
        try {
            const storage = window[type];
            const test = '__storage_test__';
            storage.setItem(test, test);
            storage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Резервное копирование данных
     */
    async backup() {
        const backup = {
            timestamp: new Date().toISOString(),
            data: {}
        };

        const keys = this.getKeys();
        
        for (const key of keys) {
            try {
                backup.data[key] = await this.get(key);
            } catch (error) {
                console.error(`Ошибка резервирования ключа ${key}:`, error);
            }
        }

        return backup;
    }

    /**
     * Восстановление из резервной копии
     */
    async restore(backup, options = {}) {
        const { overwrite = false, sync = false } = options;

        if (!backup || !backup.data) {
            throw new Error('Невалидная резервная копия');
        }

        let restored = 0;
        let skipped = 0;

        for (const [key, value] of Object.entries(backup.data)) {
            try {
                // Проверяем существование ключа
                const existing = await this.get(key);
                
                if (existing !== null && !overwrite) {
                    skipped++;
                    continue;
                }

                await this.set(key, value, { sync });
                restored++;
            } catch (error) {
                console.error(`Ошибка восстановления ключа ${key}:`, error);
            }
        }

        return { restored, skipped };
    }

    /**
     * Миграция данных
     */
    async migrate(migrations) {
        const currentVersion = await this.get('storage_version', { defaultValue: 0 });
        
        for (const migration of migrations) {
            if (migration.version > currentVersion) {
                try {
                    console.log(`Выполнение миграции v${migration.version}...`);
                    await migration.up(this);
                    await this.set('storage_version', migration.version, { sync: true });
                    console.log(`✅ Миграция v${migration.version} завершена`);
                } catch (error) {
                    console.error(`❌ Ошибка миграции v${migration.version}:`, error);
                    throw error;
                }
            }
        }
    }
}

// Специализированные методы для игровых данных

class GameStorageManager extends StorageManager {
    constructor() {
        super();
        this.gamePrefix = 'game_';
    }

    /**
     * Сохранение состояния игры
     */
    async saveGameState(gameState) {
        return await this.set(this.gamePrefix + 'state', gameState, { 
            sync: true, 
            encrypt: false 
        });
    }

    /**
     * Загрузка состояния игры
     */
    async loadGameState() {
        return await this.get(this.gamePrefix + 'state', { 
            defaultValue: this.getDefaultGameState(),
            fromCloud: true 
        });
    }

    /**
     * Сохранение настроек
     */
    async saveSettings(settings) {
        return await this.set(this.gamePrefix + 'settings', settings, { 
            sync: true 
        });
    }

    /**
     * Загрузка настроек
     */
    async loadSettings() {
        return await this.get(this.gamePrefix + 'settings', { 
            defaultValue: this.getDefaultSettings(),
            fromCloud: true 
        });
    }

    /**
     * Сохранение истории транзакций
     */
    async saveTransactionHistory(history) {
        return await this.set(this.gamePrefix + 'transaction_history', history, { 
            persistent: true 
        });
    }

    /**
     * Загрузка истории транзакций
     */
    async loadTransactionHistory() {
        return await this.get(this.gamePrefix + 'transaction_history', { 
            defaultValue: [] 
        });
    }

    /**
     * Сохранение инвентаря (локально)
     */
    async saveInventory(inventory) {
        return await this.set(this.gamePrefix + 'inventory', inventory, { 
            persistent: true 
        });
    }

    /**
     * Загрузка инвентаря
     */
    async loadInventory() {
        return await this.get(this.gamePrefix + 'inventory', { 
            defaultValue: [] 
        });
    }

    /**
     * Состояние игры по умолчанию
     */
    getDefaultGameState() {
        return {
            balance: 0,
            demoMode: true,
            currentUserId: null,
            user: null,
            lastSync: null
        };
    }

    /**
     * Настройки по умолчанию
     */
    getDefaultSettings() {
        return {
            sound: true,
            vibration: false,
            language: 'en',
            notifications: true,
            autoSync: true
        };
    }

    /**
     * Очистка игровых данных
     */
    async clearGameData() {
        const gameKeys = this.getKeys().filter(key => key.startsWith(this.gamePrefix));
        
        for (const key of gameKeys) {
            await this.remove(key, { fromCloud: true });
        }
        
        return gameKeys.length;
    }
}

// Создаем глобальные экземпляры
window.storage = new StorageManager();
window.gameStorage = new GameStorageManager();

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageManager, GameStorageManager };
}