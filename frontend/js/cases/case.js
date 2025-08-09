// Game Data
const caseData = {
    1: {
        name: 'Telegram Case #1',
        price: 150,
        items: [
            { id: 1, name: 'Telegram Sticker', value: 25.6, stars: 2556, rarity: 'common', image: 'assets/gifts/gift1.png', weight: 40 },
            { id: 2, name: 'Blue Bow Tie', value: 35.0, stars: 3500, rarity: 'common', image: 'assets/gifts/gift2.png', weight: 30 },
            { id: 3, name: 'Pink Teddy Bear', value: 45.5, stars: 4550, rarity: 'common', image: 'assets/gifts/gift3.png', weight: 20 },
            { id: 4, name: 'Telegram Cap', value: 65.0, stars: 6500, rarity: 'rare', image: 'assets/gifts/gift4.png', weight: 10 },
            { id: 5, name: 'Telegram Sticker', value: 25.6, stars: 2556, rarity: 'common', image: 'assets/gifts/gift5.png', weight: 40 },
            { id: 6, name: 'Blue Bow Tie', value: 35.0, stars: 3500, rarity: 'common', image: 'assets/gifts/gift6.png', weight: 30 },
            { id: 7, name: 'Pink Teddy Bear', value: 45.5, stars: 4550, rarity: 'common', image: 'assets/gifts/gift7.png', weight: 20 },
            { id: 8, name: 'Telegram Cap', value: 65.0, stars: 6500, rarity: 'rare', image: 'assets/gifts/gift8.png', weight: 10 },
            { id: 9, name: 'Telegram Sticker', value: 25.6, stars: 2556, rarity: 'common', image: 'assets/gifts/gift9.png', weight: 40 },
            { id: 10, name: 'Blue Bow Tie', value: 35.0, stars: 3500, rarity: 'common', image: 'assets/gifts/gift10.png', weight: 30 },
            { id: 11, name: 'Pink Teddy Bear', value: 45.5, stars: 4550, rarity: 'common', image: 'assets/gifts/gift11.png', weight: 20 },
            { id: 12, name: 'Telegram Cap', value: 65.0, stars: 6500, rarity: 'rare', image: 'assets/gifts/gift12.png', weight: 10 },
            { id: 13, name: 'Telegram Sticker', value: 25.6, stars: 2556, rarity: 'common', image: 'assets/gifts/gift1.png', weight: 40 },
            { id: 14, name: 'Blue Bow Tie', value: 35.0, stars: 3500, rarity: 'common', image: 'assets/gifts/gift3.png', weight: 30 },
            { id: 15, name: 'Pink Teddy Bear', value: 45.5, stars: 4550, rarity: 'common', image: 'assets/gifts/gift8.png', weight: 20 },
            { id: 16, name: 'Telegram Cap', value: 65.0, stars: 6500, rarity: 'rare', image: 'assets/gifts/gift7.png', weight: 10 }
        ]
    },
    2: {
        name: 'Telegram Case #2',
        price: 250,
        items: [
            { id: 3, name: 'Pink Teddy Bear', value: 45.5, stars: 4550, rarity: 'common', image: 'assets/gifts/gift3.png', weight: 35 },
            { id: 4, name: 'Telegram Cap', value: 65.0, stars: 6500, rarity: 'rare', image: 'assets/gifts/gift4.png', weight: 30 },
            { id: 5, name: 'Golden Star', value: 125.0, stars: 12500, rarity: 'rare', image: 'assets/gifts/gift5.png', weight: 25 },
            { id: 6, name: 'Black Cat', value: 180.5, stars: 18050, rarity: 'epic', image: 'assets/gifts/gift1.png', weight: 10 }
        ]
    }
};

// Global State
let currentCase = null;
let isSpinning = false;
let currentBalance = 1451;

// Initialize page
function initPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('id') || '1';
    currentCase = caseData[caseId];
    
    if (!currentCase) {
        window.location.href = 'index.html';
        return;
    }

    // Update case title
    document.getElementById('caseTitle').textContent = currentCase.name;
    
    // Generate roulette items
    generateRouletteItems();
    
    // Generate contents grid
    generateContentsGrid();
    
    // Update balance
    updateBalance();
    
    // Initialize Telegram WebApp
    initTelegramApp();
}

function generateRouletteItems() {
    const rouletteLine = document.getElementById('rouletteLine');
    const items = [];
    
    // Generate multiple rounds of items for smooth spinning
    for (let round = 0; round < 8; round++) {
        currentCase.items.forEach(item => {
            // Add each item multiple times based on weight
            const count = Math.ceil(item.weight / 10);
            for (let i = 0; i < count; i++) {
                items.push(item);
            }
        });
    }
    
    // Shuffle items
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    
    // Create DOM elements
    rouletteLine.innerHTML = '';
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = `roulette-item ${item.rarity}`;
        itemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="roulette-item-ton">
                <img src="assets/icons/ton_icon.png" alt="TON">
                <span>${item.value}</span>
            </div>
            <div class="roulette-item-stars">
                <img src="assets/icons/star_icon.png" alt="Stars">
                <span>${item.stars}</span>
            </div>
        `;
        rouletteLine.appendChild(itemElement);
    });
}

function generateContentsGrid() {
    const contentsGrid = document.getElementById('contentsGrid');
    
    contentsGrid.innerHTML = '';
    currentCase.items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = `content-item ${item.rarity}`;
        itemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="content-item-ton">
                <img src="assets/icons/ton_icon.png" alt="TON">
                <span>${item.value}</span>
            </div>
            <div class="content-item-stars">
                <img src="assets/icons/star_icon.png" alt="Stars">
                <span>${item.stars}</span>
            </div>
        `;
        contentsGrid.appendChild(itemElement);
    });
}

function openCase() {
    if (isSpinning) return;
    
    // Check balance
    if (currentBalance < currentCase.price) {
        alert('Недостаточно звёзд для открытия кейса!');
        return;
    }
    
    isSpinning = true;
    const openButton = document.getElementById('openButton');
    openButton.disabled = true;
    openButton.textContent = 'Открытие...';
    
    // Deduct balance
    currentBalance -= currentCase.price;
    updateBalance();
    
    // Start spinning
    spinRoulette();
}

function spinRoulette() {
   const rouletteLine = document.getElementById('rouletteLine');
   const items = rouletteLine.querySelectorAll('.roulette-item');
   
   // Calculate winning item
   const winningItem = selectWinningItem();
   
   // Find a winning item element in the middle part of the roulette
   const startIndex = Math.floor(items.length * 0.4);
   const endIndex = Math.floor(items.length * 0.6);
   let winningElement = null;
   
   for (let i = startIndex; i < endIndex; i++) {
       const itemImg = items[i].querySelector('img');
       if (itemImg && itemImg.src.includes(winningItem.image.split('/').pop())) {
           winningElement = items[i];
           break;
       }
   }
   
   if (!winningElement) {
       winningElement = items[Math.floor(items.length / 2)];
   }
   
   // Calculate spin distance (учитываем начальное смещение)
   const containerWidth = document.querySelector('.roulette-container').offsetWidth;
   const itemWidth = 180;
   const winningIndex = Array.from(items).indexOf(winningElement);
   const targetOffset = (winningIndex * itemWidth) - (containerWidth / 2) + (itemWidth / 2) + 200; // +200 компенсирует начальное смещение
   
   // Add random offset for more natural feel
   const randomOffset = Math.random() * 40 - 20;
   const finalOffset = targetOffset + randomOffset;
   
   // Apply spinning animation
   rouletteLine.style.transform = `translateX(-${finalOffset}px)`;
   rouletteLine.classList.add('spinning');
   
   // Show result after animation
   setTimeout(() => {
       showPrizeResult(winningItem);
       highlightWinningItem(winningElement);
       
       // Reset for next spin
       setTimeout(() => {
           isSpinning = false;
           const openButton = document.getElementById('openButton');
           openButton.disabled = false;
           openButton.textContent = 'Открыть кейс';
           rouletteLine.classList.remove('spinning');
       }, 2000);
   }, 3000);
}

function selectWinningItem() {
    const totalWeight = currentCase.items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of currentCase.items) {
        random -= item.weight;
        if (random <= 0) {
            return item;
        }
    }
    
    return currentCase.items[0]; // Fallback
}

function highlightWinningItem(element) {
    element.classList.add('winner-glow');
    setTimeout(() => {
        element.classList.remove('winner-glow');
    }, 3000);
}

// Prize Modal Functions
function showPrizeResult(item) {
    // Update modal content
    document.getElementById('modalCaseName').textContent = currentCase.name;
    document.getElementById('prizeName').textContent = item.name;
    document.getElementById('prizeRarity').textContent = getRarityText(item.rarity);
    document.getElementById('prizeRarity').className = `prize-rarity ${item.rarity}`;
    document.getElementById('prizeImage').src = item.image;
    
    // Update values in overlay
    document.getElementById('prizeTonValue').textContent = item.value;
    document.getElementById('prizeStarsValue').textContent = item.stars.toLocaleString();
    
    // Set rarity-based effects
    const prizeImageContainer = document.getElementById('prizeImageContainer');
    updatePrizeContainerEffect(prizeImageContainer, item.rarity);
    
    // Show modal with animation
    const prizeModal = document.getElementById('prizeModal');
    prizeModal.classList.add('show');
    
    // Add vibration feedback
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    // Store current prize for actions
    window.currentPrize = item;
}

function updatePrizeContainerEffect(container, rarity) {
    const rarityEffects = {
        'common': {
            gradient: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent)',
            glowColor: 'rgba(255, 255, 255, 0.3)'
        },
        'rare': {
            gradient: 'radial-gradient(circle, rgba(59,130,246,0.2), transparent)',
            glowColor: 'rgba(59, 130, 246, 0.4)'
        },
        'epic': {
            gradient: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent)',
            glowColor: 'rgba(139, 92, 246, 0.4)'
        },
        'legendary': {
            gradient: 'radial-gradient(circle, rgba(245,158,11,0.2), transparent)',
            glowColor: 'rgba(245, 158, 11, 0.4)'
        },
        'mythic': {
            gradient: 'radial-gradient(circle, rgba(239,68,68,0.2), transparent)',
            glowColor: 'rgba(239, 68, 68, 0.4)'
        }
    };
    
    const effect = rarityEffects[rarity] || rarityEffects['common'];
    container.style.background = effect.gradient;
    container.style.boxShadow = `none`;
}

function closePrizeModal() {
    const prizeModal = document.getElementById('prizeModal');
    prizeModal.classList.remove('show');
}

function sellPrize() {
    if (!window.currentPrize) return;
    
    const prizeName = window.currentPrize.name;
    const prizeStars = window.currentPrize.stars;
    
    // Add stars to balance
    currentBalance += prizeStars;
    updateBalance();
    
    // Add to history (if implemented)
    addToHistory('sell', window.currentPrize);
    
    // Close modal
    closePrizeModal();
    
    // Show success notification
    setTimeout(() => {
        showNotification(`${prizeName} продан за ${prizeStars.toLocaleString()} звёзд!`, 'success');
    }, 300);
}

function withdrawPrize() {
    if (!window.currentPrize) return;
    
    const prizeName = window.currentPrize.name;
    
    // Add to inventory/withdrawal queue (if implemented)
    addToWithdrawalQueue(window.currentPrize);
    
    // Close modal
    closePrizeModal();
    
    // Show notification
    setTimeout(() => {
        showNotification(`${prizeName} добавлен в очередь на вывод. Администратор свяжется с вами.`, 'info');
    }, 300);
}

function keepPrize() {
    if (!window.currentPrize) return;
    
    const prizeName = window.currentPrize.name;
    
    // Add to inventory (if implemented)
    addToInventory(window.currentPrize);
    
    // Close modal
    closePrizeModal();
    
    // Show notification
    setTimeout(() => {
        showNotification(`${prizeName} добавлен в инвентарь!`, 'success');
    }, 300);
}

// Helper functions
function addToHistory(action, item) {
    // Implementation for adding to history
    const historyItem = {
        id: Date.now(),
        action: action,
        item: item,
        timestamp: new Date(),
        stars: action === 'sell' ? item.stars : 0
    };
    
    // Save to localStorage or send to backend
    let history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
    history.unshift(historyItem);
    
    // Keep only last 50 items
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    
    localStorage.setItem('gameHistory', JSON.stringify(history));
}

function addToWithdrawalQueue(item) {
    // Implementation for adding to withdrawal queue
    const withdrawalItem = {
        id: Date.now(),
        item: item,
        status: 'pending',
        timestamp: new Date()
    };
    
    let withdrawalQueue = JSON.parse(localStorage.getItem('withdrawalQueue') || '[]');
    withdrawalQueue.unshift(withdrawalItem);
    localStorage.setItem('withdrawalQueue', JSON.stringify(withdrawalQueue));
}

function addToInventory(item) {
    // Implementation for adding to inventory
    const inventoryItem = {
        id: Date.now(),
        item: item,
        timestamp: new Date()
    };
    
    let inventory = JSON.parse(localStorage.getItem('gameInventory') || '[]');
    inventory.unshift(inventoryItem);
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
}

function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styling
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        max-width: 300px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background: linear-gradient(135deg, #00ff87, #00cc6a);' : ''}
        ${type === 'info' ? 'background: linear-gradient(135deg, #3b82f6, #1d4ed8);' : ''}
        ${type === 'error' ? 'background: linear-gradient(135deg, #ef4444, #dc2626);' : ''}
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide notification
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function getRarityText(rarity) {
    const rarityMap = {
        'common': 'Обычный',
        'rare': 'Редкий',
        'epic': 'Эпический',
        'legendary': 'Легендарный',
        'mythic': 'Мифический'
    };
    return rarityMap[rarity] || 'Неизвестный';
}

function getRarityColor(rarity) {
    const colorMap = {
        'common': '#ffffff',
        'rare': '#3b82f6',
        'epic': '#8b5cf6',
        'legendary': '#f59e0b',
        'mythic': '#ef4444'
    };
    return colorMap[rarity] || '#ffffff';
}

function getRarityGradient(rarity) {
    const gradientMap = {
        'common': 'radial-gradient(circle, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        'rare': 'radial-gradient(circle, rgba(59,130,246,0.2), rgba(59,130,246,0.05))',
        'epic': 'radial-gradient(circle, rgba(139,92,246,0.2), rgba(139,92,246,0.05))',
        'legendary': 'radial-gradient(circle, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
        'mythic': 'radial-gradient(circle, rgba(239,68,68,0.2), rgba(239,68,68,0.05))'
    };
    return gradientMap[rarity] || gradientMap['common'];
}

function updateBalance() {
    document.getElementById('balance').textContent = currentBalance;
}

function goBack() {
    // Add transition effect
    document.body.style.opacity = '0.8';
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 200);
}

function initTelegramApp() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Set theme
        if (tg.themeParams.bg_color) {
            document.documentElement.style.setProperty('--bg-primary', tg.themeParams.bg_color);
        }
        
        // Handle back button
        tg.BackButton.show();
        tg.BackButton.onClick(goBack);
    }
}

// Handle escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const prizeModal = document.getElementById('prizeModal');
        if (prizeModal && prizeModal.classList.contains('show')) {
            closePrizeModal();
        }
    }
});

// Handle modal backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('prize-modal-overlay')) {
        closePrizeModal();
    }
});

// Prevent scrolling during roulette spin
function preventScroll(e) {
    if (isSpinning) {
        e.preventDefault();
    }
}

document.addEventListener('touchmove', preventScroll, { passive: false });
document.addEventListener('wheel', preventScroll, { passive: false });

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);

// Add some demo live feed simulation
function simulateLiveFeed() {
    // This could be expanded to show recent wins from other players
    console.log('Live feed simulation running...');
}

// Start simulation
setTimeout(simulateLiveFeed, 2000);