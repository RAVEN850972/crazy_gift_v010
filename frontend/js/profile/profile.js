// Global state
let currentTab = 'all';
let selectedItems = new Set();

// Initialize page
function initPage() {
   initTelegramApp();
   updateBalance();
   filterInventory();
   initTabSwipe();
}

// Tab switching
function switchTab(tabName) {
   currentTab = tabName;
   
   // Update tab buttons
   document.querySelectorAll('.tab-button').forEach(btn => {
       btn.classList.remove('active');
   });
   event.target.classList.add('active');
   
   // Filter inventory
   filterInventory();
}

// Filter inventory based on current tab
function filterInventory() {
   const items = document.querySelectorAll('.inventory-item');
   
   items.forEach(item => {
       let show = false;
       
       switch(currentTab) {
           case 'all':
               show = true;
               break;
           case 'sellable':
               // Show all items that can be sold (most items)
               show = !item.classList.contains('mythic');
               break;
           case 'rare':
               // Show rare, epic, legendary, mythic
               show = item.classList.contains('rare') || 
                       item.classList.contains('epic') || 
                       item.classList.contains('legendary') || 
                       item.classList.contains('mythic');
               break;
           case 'common':
               // Show common items
               show = item.classList.contains('common');
               break;
           case 'mythic':
               // Show mythic items
               show = item.classList.contains('mythic');
               break;
           case 'legendary':
               // Show legendary items
               show = item.classList.contains('legendary');
               break;
       }
       
       item.style.display = show ? 'block' : 'none';
   });
}

// Select/deselect item - теперь открывает модальное окно
function selectItem(item) {
   showItemModal(item);
}

// Show item modal
function showItemModal(item) {
   const img = item.querySelector('img:not(.item-value img)');
   const tonValue = item.querySelector('.item-value').textContent.trim();
   const rarity = getRarityFromClasses(item);
   
   // Update modal content
   document.getElementById('prizeName').textContent = getItemName(img.src);
   document.getElementById('prizeRarity').textContent = getRarityText(rarity);
   document.getElementById('prizeRarity').className = `prize-rarity ${rarity}`;
   document.getElementById('prizeImage').src = img.src;
   document.getElementById('prizeTonValue').textContent = tonValue;
   document.getElementById('prizeStarsValue').textContent = Math.floor(parseFloat(tonValue) * 1000).toLocaleString();
   
   // Set rarity-based effects
   const prizeImageContainer = document.getElementById('prizeImageContainer');
   updatePrizeContainerEffect(prizeImageContainer, rarity);
   
   // Show modal
   const prizeModal = document.getElementById('prizeModal');
   prizeModal.classList.add('show');
   
   // Store current item for actions
   window.currentInventoryItem = {
       element: item,
       name: getItemName(img.src),
       value: parseFloat(tonValue),
       stars: Math.floor(parseFloat(tonValue) * 1000),
       rarity: rarity,
       image: img.src
   };
}

function closePrizeModal() {
   const prizeModal = document.getElementById('prizeModal');
   prizeModal.classList.remove('show');
}

function sellPrize() {
   if (!window.currentInventoryItem) return;
   
   const item = window.currentInventoryItem;
   
   // Remove from inventory
   item.element.remove();
   
   // Add stars to balance
   let currentBalance = parseInt(document.getElementById('balance').textContent);
   currentBalance += item.stars;
   document.getElementById('balance').textContent = currentBalance;
   
   closePrizeModal();
   
   // Show notification
   setTimeout(() => {
       showNotification(`${item.name} продан за ${item.stars.toLocaleString()} звёзд!`, 'success');
   }, 300);
}

function withdrawPrize() {
   if (!window.currentInventoryItem) return;
   
   const item = window.currentInventoryItem;
   
   // Remove from inventory
   item.element.remove();
   
   closePrizeModal();
   
   // Show notification
   setTimeout(() => {
       showNotification(`${item.name} добавлен в очередь на вывод. Администратор свяжется с вами.`, 'info');
   }, 300);
}

function getRarityFromClasses(item) {
   if (item.classList.contains('mythic')) return 'mythic';
   if (item.classList.contains('legendary')) return 'legendary';
   if (item.classList.contains('epic')) return 'epic';
   if (item.classList.contains('rare')) return 'rare';
   return 'common';
}

function getItemName(imageSrc) {
   const filename = imageSrc.split('/').pop().split('.')[0];
   const giftNumber = filename.replace('gift', '');
   return `Подарок #${giftNumber}`;
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

function updatePrizeContainerEffect(container, rarity) {
   const rarityEffects = {
       'common': {
           gradient: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent)',
       },
       'rare': {
           gradient: 'radial-gradient(circle, rgba(59,130,246,0.2), transparent)',
       },
       'epic': {
           gradient: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent)',
       },
       'legendary': {
           gradient: 'radial-gradient(circle, rgba(245,158,11,0.2), transparent)',
       },
       'mythic': {
           gradient: 'radial-gradient(circle, rgba(239,68,68,0.2), transparent)',
       }
   };
   
   const effect = rarityEffects[rarity] || rarityEffects['common'];
   container.style.background = effect.gradient;
}

function showNotification(message, type = 'info') {
   const notification = document.createElement('div');
   notification.textContent = message;
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
   `;
   
   document.body.appendChild(notification);
   
   setTimeout(() => notification.style.transform = 'translateX(0)', 100);
   setTimeout(() => {
       notification.style.transform = 'translateX(100%)';
       setTimeout(() => document.body.removeChild(notification), 300);
   }, 3000);
}

// Add swipe functionality for tabs
function initTabSwipe() {
   const tabsContainer = document.getElementById('tabsContainer');
   let startX = 0;
   let scrollLeft = 0;
   let isDown = false;

   tabsContainer.addEventListener('mousedown', (e) => {
       isDown = true;
       startX = e.pageX - tabsContainer.offsetLeft;
       scrollLeft = tabsContainer.scrollLeft;
   });

   tabsContainer.addEventListener('mouseleave', () => {
       isDown = false;
   });

   tabsContainer.addEventListener('mouseup', () => {
       isDown = false;
   });

   tabsContainer.addEventListener('mousemove', (e) => {
       if (!isDown) return;
       e.preventDefault();
       const x = e.pageX - tabsContainer.offsetLeft;
       const walk = (x - startX) * 2;
       tabsContainer.scrollLeft = scrollLeft - walk;
   });

   // Touch events for mobile
   tabsContainer.addEventListener('touchstart', (e) => {
       startX = e.touches[0].pageX - tabsContainer.offsetLeft;
       scrollLeft = tabsContainer.scrollLeft;
   });

   tabsContainer.addEventListener('touchmove', (e) => {
       const x = e.touches[0].pageX - tabsContainer.offsetLeft;
       const walk = (x - startX) * 2;
       tabsContainer.scrollLeft = scrollLeft - walk;
   });
}

function goBack() {
   document.body.style.opacity = '0.8';
   setTimeout(() => {
       window.location.href = 'index.html';
   }, 200);
}

function updateBalance() {
   document.getElementById('balance').textContent = '1451';
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

// Handle escape key and backdrop click
document.addEventListener('keydown', (e) => {
   if (e.key === 'Escape') {
       const prizeModal = document.getElementById('prizeModal');
       if (prizeModal && prizeModal.classList.contains('show')) {
           closePrizeModal();
       }
   }
});

document.addEventListener('click', (e) => {
   if (e.target.classList.contains('prize-modal-overlay')) {
       closePrizeModal();
   }
});

// Add selection styles
const style = document.createElement('style');
style.textContent = `
   .inventory-item.selected {
       border-color: var(--accent-yellow) !important;
       box-shadow: 0 0 20px rgba(255, 215, 0, 0.4) !important;
       background: rgba(255, 215, 0, 0.1) !important;
   }
`;
document.head.appendChild(style);

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);