/**
 * Modal Component System
 * Универсальная система модальных окон для CrazyGift
 */

class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.overlay = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация системы модальных окон
     */
    init() {
        if (this.isInitialized) return;
        
        this.createOverlay();
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Modal system initialized');
    }

    /**
     * Создание общего overlay
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 999;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        this.overlay.addEventListener('click', () => {
            if (this.activeModal && this.modals.get(this.activeModal).closeOnOverlay) {
                this.hide(this.activeModal);
            }
        });
        
        document.body.appendChild(this.overlay);
    }

    /**
     * Настройка глобальных обработчиков событий
     */
    setupEventListeners() {
        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                const modal = this.modals.get(this.activeModal);
                if (modal.closeOnEsc) {
                    this.hide(this.activeModal);
                }
            }
        });

        // Предотвращение прокрутки фона
        document.addEventListener('wheel', (e) => {
            if (this.activeModal) {
                const modal = this.modals.get(this.activeModal);
                if (!modal.allowScroll) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
    }

    /**
     * Создание модального окна
     */
    create(id, options = {}) {
        const {
            title = '',
            content = '',
            type = 'default',
            size = 'medium',
            closeButton = true,
            closeOnOverlay = true,
            closeOnEsc = true,
            allowScroll = false,
            buttons = [],
            customClass = '',
            onShow = null,
            onHide = null
        } = options;

        // Удаляем существующее модальное окно с таким ID
        if (this.modals.has(id)) {
            this.destroy(id);
        }

        // Создаем элемент модального окна
        const modal = this.createElement(id, {
            title, content, type, size, closeButton, buttons, customClass
        });

        // Сохраняем конфигурацию
        this.modals.set(id, {
            element: modal,
            closeOnOverlay,
            closeOnEsc,
            allowScroll,
            onShow,
            onHide,
            type,
            isVisible: false
        });

        document.body.appendChild(modal);
        return id;
    }

    /**
     * Создание DOM элемента модального окна
     */
    createElement(id, config) {
        const modal = document.createElement('div');
        modal.className = `modal modal-${config.type} modal-${config.size} ${config.customClass}`;
        modal.dataset.modalId = id;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = `
            position: relative;
            background: var(--bg-secondary);
            border-radius: var(--border-radius-large);
            width: 100%;
            max-width: ${this.getSizeMaxWidth(config.size)};
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transform: scale(0.9);
            transition: transform 0.3s ease;
        `;

        // Заголовок
        if (config.title || config.closeButton) {
            const header = this.createHeader(config.title, config.closeButton, id);
            content.appendChild(header);
        }

        // Тело модального окна
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.style.cssText = 'padding: 20px;';
        
        if (typeof config.content === 'string') {
            body.innerHTML = config.content;
        } else if (config.content instanceof HTMLElement) {
            body.appendChild(config.content);
        }
        
        content.appendChild(body);

        // Кнопки
        if (config.buttons && config.buttons.length > 0) {
            const footer = this.createFooter(config.buttons, id);
            content.appendChild(footer);
        }

        modal.appendChild(content);
        return modal;
    }

    /**
     * Создание заголовка модального окна
     */
    createHeader(title, closeButton, modalId) {
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 20px 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        `;

        if (title) {
            const titleElement = document.createElement('h3');
            titleElement.className = 'modal-title';
            titleElement.textContent = title;
            titleElement.style.cssText = `
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0;
            `;
            header.appendChild(titleElement);
        }

        if (closeButton) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close';
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                width: 32px;
                height: 32px;
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.2s ease;
                color: var(--text-muted);
                font-size: 20px;
                font-weight: 600;
            `;
            
            closeBtn.addEventListener('click', () => this.hide(modalId));
            closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '0.7');
            closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '1');
            
            header.appendChild(closeBtn);
        }

        return header;
    }

    /**
     * Создание футера с кнопками
     */
    createFooter(buttons, modalId) {
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.style.cssText = `
            padding: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        `;

        buttons.forEach(buttonConfig => {
            const button = this.createButton(buttonConfig, modalId);
            footer.appendChild(button);
        });

        return footer;
    }

    /**
     * Создание кнопки
     */
    createButton(config, modalId) {
        const {
            text = 'Button',
            type = 'secondary',
            action = null,
            closeModal = true
        } = config;

        const button = document.createElement('button');
        button.className = `modal-btn ${type}`;
        button.textContent = text;
        
        const styles = {
            primary: `
                background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
                color: #000000;
                border: none;
            `,
            secondary: `
                background: transparent;
                color: var(--text-secondary);
                border: 1px solid rgba(255, 255, 255, 0.2);
            `,
            danger: `
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: #ffffff;
                border: none;
            `
        };

        button.style.cssText = `
            padding: 12px 20px;
            border-radius: var(--border-radius);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 80px;
            ${styles[type] || styles.secondary}
        `;

        // Hover эффекты
        button.addEventListener('mouseenter', () => {
            if (type === 'primary') {
                button.style.transform = 'translateY(-1px)';
                button.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)';
            } else if (type === 'secondary') {
                button.style.background = 'rgba(255, 255, 255, 0.05)';
                button.style.color = 'var(--text-primary)';
            } else if (type === 'danger') {
                button.style.transform = 'translateY(-1px)';
                button.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
            }
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = '';
            button.style.boxShadow = '';
            if (type === 'secondary') {
                button.style.background = 'transparent';
                button.style.color = 'var(--text-secondary)';
            }
        });

        // Обработчик клика
        button.addEventListener('click', async () => {
            if (action && typeof action === 'function') {
                try {
                    const result = await action();
                    // Если action возвращает false, не закрываем модальное окно
                    if (result === false) return;
                } catch (error) {
                    console.error('Ошибка в обработчике кнопки:', error);
                    return;
                }
            }
            
            if (closeModal) {
                this.hide(modalId);
            }
        });

        return button;
    }

    /**
     * Получение максимальной ширины по размеру
     */
    getSizeMaxWidth(size) {
        const sizes = {
            small: '300px',
            medium: '400px',
            large: '600px',
            xlarge: '800px',
            full: '95vw'
        };
        return sizes[size] || sizes.medium;
    }

    /**
     * Показ модального окна
     */
    show(id) {
        if (!this.modals.has(id)) {
            console.error(`Modal with id "${id}" not found`);
            return false;
        }

        // Скрываем текущее активное модальное окно
        if (this.activeModal && this.activeModal !== id) {
            this.hide(this.activeModal);
        }

        const modal = this.modals.get(id);
        
        // Haptic feedback
        window.haptic?.ui.selection();
        
        // Показываем overlay
        this.overlay.style.display = 'block';
        setTimeout(() => {
            this.overlay.style.opacity = '1';
        }, 10);

        // Показываем модальное окно
        modal.element.style.display = 'flex';
        setTimeout(() => {
            modal.element.style.opacity = '1';
            const content = modal.element.querySelector('.modal-content');
            if (content) {
                content.style.transform = 'scale(1)';
            }
        }, 10);

        // Блокируем прокрутку фона
        if (!modal.allowScroll) {
            document.body.style.overflow = 'hidden';
        }

        this.activeModal = id;
        modal.isVisible = true;

        // Вызываем callback
        if (modal.onShow && typeof modal.onShow === 'function') {
            modal.onShow();
        }

        return true;
    }

    /**
     * Скрытие модального окна
     */
    hide(id) {
        if (!this.modals.has(id)) {
            console.error(`Modal with id "${id}" not found`);
            return false;
        }

        const modal = this.modals.get(id);
        
        if (!modal.isVisible) return false;

        // Haptic feedback
        window.haptic?.ui.selection();

        // Анимация скрытия
        modal.element.style.opacity = '0';
        const content = modal.element.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(0.9)';
        }

        setTimeout(() => {
            modal.element.style.display = 'none';
            
            // Скрываем overlay если это последнее модальное окно
            if (this.activeModal === id) {
                this.overlay.style.opacity = '0';
                setTimeout(() => {
                    this.overlay.style.display = 'none';
                }, 300);
                
                // Восстанавливаем прокрутку
                document.body.style.overflow = '';
                this.activeModal = null;
            }
        }, 300);

        modal.isVisible = false;

        // Вызываем callback
        if (modal.onHide && typeof modal.onHide === 'function') {
            modal.onHide();
        }

        return true;
    }

    /**
     * Обновление содержимого модального окна
     */
    updateContent(id, content) {
        if (!this.modals.has(id)) return false;

        const modal = this.modals.get(id);
        const body = modal.element.querySelector('.modal-body');
        
        if (body) {
            if (typeof content === 'string') {
                body.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                body.innerHTML = '';
                body.appendChild(content);
            }
        }

        return true;
    }

    /**
     * Удаление модального окна
     */
    destroy(id) {
        if (!this.modals.has(id)) return false;

        const modal = this.modals.get(id);
        
        // Скрываем если видимо
        if (modal.isVisible) {
            this.hide(id);
        }

        // Удаляем из DOM
        setTimeout(() => {
            if (document.body.contains(modal.element)) {
                document.body.removeChild(modal.element);
            }
            this.modals.delete(id);
        }, 300);

        return true;
    }

    /**
     * Проверка видимости модального окна
     */
    isVisible(id) {
        if (!this.modals.has(id)) return false;
        return this.modals.get(id).isVisible;
    }

    /**
     * Получение активного модального окна
     */
    getActive() {
        return this.activeModal;
    }

    /**
     * Скрытие всех модальных окон
     */
    hideAll() {
        for (const [id, modal] of this.modals) {
            if (modal.isVisible) {
                this.hide(id);
            }
        }
    }

    /**
     * Быстрые методы для стандартных модальных окон
     */
    alert(title, message, type = 'info') {
        const id = 'alert_' + Date.now();
        
        this.create(id, {
            title,
            content: `<p style="margin: 0; line-height: 1.4;">${message}</p>`,
            type,
            size: 'small',
            buttons: [{
                text: 'OK',
                type: 'primary',
                action: () => true
            }]
        });

        this.show(id);
        return id;
    }

    confirm(title, message, onConfirm = null) {
        const id = 'confirm_' + Date.now();
        
        this.create(id, {
            title,
            content: `<p style="margin: 0; line-height: 1.4;">${message}</p>`,
            type: 'default',
            size: 'small',
            buttons: [
                {
                    text: 'Cancel',
                    type: 'secondary',
                    action: () => true
                },
                {
                    text: 'Confirm',
                    type: 'primary',
                    action: () => {
                        if (onConfirm && typeof onConfirm === 'function') {
                            return onConfirm();
                        }
                        return true;
                    }
                }
            ]
        });

        this.show(id);
        return id;
    }

    loading(title = 'Loading...', message = 'Please wait...') {
        const id = 'loading_' + Date.now();
        
        const loadingContent = `
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(255, 215, 0, 0.3); border-top-color: var(--accent-yellow); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="margin: 0; line-height: 1.4; color: var(--text-muted);">${message}</p>
            </div>
        `;
        
        this.create(id, {
            title,
            content: loadingContent,
            type: 'default',
            size: 'small',
            closeButton: false,
            closeOnOverlay: false,
            closeOnEsc: false
        });

        this.show(id);
        return id;
    }
}

// Создаем глобальный экземпляр
window.modal = new ModalManager();

// Устаревшие функции для совместимости
window.showModal = (id, options) => {
    window.modal.create(id, options);
    return window.modal.show(id);
};

window.hideModal = (id) => window.modal.hide(id);

window.showAlert = (title, message, type) => window.modal.alert(title, message, type);

window.showConfirm = (title, message, onConfirm) => window.modal.confirm(title, message, onConfirm);

window.showLoading = (title, message) => window.modal.loading(title, message);

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}