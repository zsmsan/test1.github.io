document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // DATA MODELS & DEFAULT VALUES
    // ==========================================

    // Category Emoji Mapping for Display
    const categoryEmojis = {
        essential: '💳',
        gadget: '🔌',
        clothing: '👔',
        toiletries: '🧴'
    };

    const categoryNames = {
        essential: '貴重品',
        gadget: '電子機器',
        clothing: '衣類',
        toiletries: '日用品'
    };

    // Default Packing Items
    const defaultPackingItems = [
        { id: 1, text: '航空券 / 乗車券', category: 'essential', packed: false },
        { id: 2, text: '財布（現金・カード）', category: 'essential', packed: true },
        { id: 3, text: 'スマホ充電器', category: 'gadget', packed: false },
        { id: 4, text: '歯ブラシセット', category: 'toiletries', packed: false },
        { id: 5, text: '下着・靴下', category: 'clothing', packed: false }
    ];

    // Default Pre-departure To-Dos
    const defaultTodos = [
        { id: 101, text: 'パスポート有効期限の確認', completed: false },
        { id: 102, text: '旅行保険の加入手続き', completed: false },
        { id: 103, text: '通信（Wi-Fiレンタル/eSIM/ローミング）の手配', completed: false },
        { id: 104, text: 'ホテルの予約確認とバウチャー保存', completed: true },
        { id: 105, text: '戸締まりと家電の電源オフ', completed: false }
    ];

    // State Variables
    let packingItems = JSON.parse(localStorage.getItem('tr_packing_items')) || defaultPackingItems;
    let todoItems = JSON.parse(localStorage.getItem('tr_todo_items')) || defaultTodos;
    let travelDestination = localStorage.getItem('tr_destination') || '';
    let travelDate = localStorage.getItem('tr_date') || '';
    let currentTab = 'all';

    // ==========================================
    // DOM ELEMENTS
    // ==========================================
    const destInput = document.getElementById('dest-input');
    const dateInput = document.getElementById('date-input');
    const destDisplay = document.getElementById('dest-display');
    const countdownCard = document.getElementById('countdown-card');
    const countdownDays = document.getElementById('countdown-days');
    const countdownHours = document.getElementById('countdown-hours');

    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressCounts = document.getElementById('progress-counts');

    const packingList = document.getElementById('packing-list');
    const itemInput = document.getElementById('item-input');
    const categorySelect = document.getElementById('category-select');
    const itemAddBtn = document.getElementById('item-add-btn');
    const clearPackedBtn = document.getElementById('clear-packed-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    const todoList = document.getElementById('todo-list');
    const presetButtons = document.querySelectorAll('.preset-btn');

    // ==========================================
    // TRAVEL DETAILS & COUNTDOWN LOGIC
    // ==========================================
    destInput.value = travelDestination;
    dateInput.value = travelDate;

    // Listeners for travel plan inputs
    destInput.addEventListener('input', () => {
        travelDestination = destInput.value.trim();
        localStorage.setItem('tr_destination', travelDestination);
        updateCountdown();
    });

    dateInput.addEventListener('change', () => {
        travelDate = dateInput.value;
        localStorage.setItem('tr_date', travelDate);
        updateCountdown();
    });

    function updateCountdown() {
        if (!travelDate) {
            countdownCard.classList.add('hidden');
            return;
        }

        const now = new Date();
        const departure = new Date(travelDate + 'T00:00:00'); // set local date start
        
        // Reset destination name display
        destDisplay.textContent = travelDestination || '目的地';

        // Calculate time diff
        const timeDiff = departure.getTime() - now.getTime();

        if (timeDiff <= 0) {
            countdownCard.classList.remove('hidden');
            countdownDays.textContent = '0';
            countdownHours.textContent = '00';
            countdownCard.querySelector('.countdown-label').innerHTML = `🎉 <strong>${escapeHtml(travelDestination || '旅行')}</strong> の出発日を迎えました！`;
            return;
        }

        countdownCard.classList.remove('hidden');
        countdownCard.querySelector('.countdown-label').innerHTML = `<span>${escapeHtml(travelDestination || '目的地')}</span> まであと`;

        const totalHours = Math.floor(timeDiff / (1000 * 60 * 60));
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;

        countdownDays.textContent = days;
        countdownHours.textContent = String(hours).padStart(2, '0');
    }

    // Run countdown update periodically
    updateCountdown();
    setInterval(updateCountdown, 60000); // update every minute

    // ==========================================
    // PACKING LIST LOGIC
    // ==========================================
    function savePackingItems() {
        localStorage.setItem('tr_packing_items', JSON.stringify(packingItems));
        updateProgress();
    }

    function updateProgress() {
        const total = packingItems.length;
        const packed = packingItems.filter(item => item.packed).length;
        const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;

        progressBarFill.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;
        progressCounts.textContent = `${packed}/${total}`;
    }

    function renderPackingItems() {
        packingList.innerHTML = '';

        // Filter based on active tab
        const filteredItems = packingItems.filter(item => {
            if (currentTab === 'all') return true;
            return item.category === currentTab;
        });

        if (filteredItems.length === 0) {
            packingList.innerHTML = `<li class="card-desc" style="text-align: center; padding: 2rem 0; margin: 0;">このカテゴリーのアイテムは登録されていません</li>`;
            return;
        }

        filteredItems.forEach(item => {
            const li = document.createElement('li');
            li.className = `packing-item ${item.packed ? 'packed' : ''}`;
            li.dataset.id = item.id;

            li.innerHTML = `
                <div class="item-left">
                    <div class="item-checkbox"></div>
                    <div class="item-text-wrapper">
                        <span class="item-title">${escapeHtml(item.text)}</span>
                        <span class="item-tag">${categoryEmojis[item.category]} ${categoryNames[item.category]}</span>
                    </div>
                </div>
                <button class="delete-btn" aria-label="削除">&times;</button>
            `;

            // Toggle packed status
            li.querySelector('.item-left').addEventListener('click', () => {
                item.packed = !item.packed;
                savePackingItems();
                renderPackingItems();
            });

            // Delete item
            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                packingItems = packingItems.filter(i => i.id !== item.id);
                savePackingItems();
                renderPackingItems();
            });

            packingList.appendChild(li);
        });
    }

    // Add new custom item
    function addPackingItem() {
        const text = itemInput.value.trim();
        const category = categorySelect.value;

        if (text) {
            const newItem = {
                id: Date.now(),
                text: text,
                category: category,
                packed: false
            };
            packingItems.push(newItem);
            savePackingItems();
            renderPackingItems();
            itemInput.value = '';
            itemInput.focus();
        }
    }

    itemAddBtn.addEventListener('click', addPackingItem);
    itemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPackingItem();
        }
    });

    // Clear Packed Items
    clearPackedBtn.addEventListener('click', () => {
        packingItems = packingItems.filter(item => !item.packed);
        savePackingItems();
        renderPackingItems();
    });

    // Tab buttons handling
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.getAttribute('data-tab');
            renderPackingItems();
        });
    });

    // ==========================================
    // PRESETS SYSTEM
    // ==========================================
    const presets = {
        resort: [
            { text: 'サングラス', category: 'essential' },
            { text: '日焼け止めクリーム', category: 'toiletries' },
            { text: '水着・ラッシュガード', category: 'clothing' },
            { text: 'ビーチサンダル', category: 'clothing' },
            { text: '防水スマホケース', category: 'gadget' }
        ],
        cold: [
            { text: '防寒インナー（ヒートテック等）', category: 'clothing' },
            { text: 'マフラー・手袋・ニット帽', category: 'clothing' },
            { text: '使い捨てカイロ', category: 'toiletries' },
            { text: '保湿リップ・乳液', category: 'toiletries' },
            { text: '入浴剤', category: 'toiletries' }
        ],
        business: [
            { text: '名刺入れ・予備の名刺', category: 'essential' },
            { text: 'スーツ・ネクタイ / 制服', category: 'clothing' },
            { text: 'ノートPC・タブレット', category: 'gadget' },
            { text: 'PC用充電アダプター・マウス', category: 'gadget' },
            { text: 'メモ帳・ボールペン', category: 'essential' }
        ]
    };

    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const presetType = btn.getAttribute('data-preset');
            const itemsToAdd = presets[presetType];

            if (itemsToAdd) {
                // Add checks to prevent duplicate text items
                itemsToAdd.forEach(pItem => {
                    const exists = packingItems.some(item => item.text.toLowerCase() === pItem.text.toLowerCase());
                    if (!exists) {
                        packingItems.push({
                            id: Date.now() + Math.random(), // guarantee unique ID
                            text: pItem.text,
                            category: pItem.category,
                            packed: false
                        });
                    }
                });
                savePackingItems();
                renderPackingItems();
                
                // Show floating check or button effect
                btn.style.borderColor = 'var(--accent)';
                btn.style.background = 'rgba(46, 196, 182, 0.15)';
                setTimeout(() => {
                    btn.style.borderColor = 'var(--border-color)';
                    btn.style.background = 'rgba(255, 255, 255, 0.03)';
                }, 800);
            }
        });
    });

    // ==========================================
    // PRE-DEPARTURE TODO LIST
    // ==========================================
    function saveTodoItems() {
        localStorage.setItem('tr_todo_items', JSON.stringify(todoItems));
    }

    function renderTodos() {
        todoList.innerHTML = '';
        todoItems.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.dataset.id = todo.id;

            li.innerHTML = `
                <div class="item-left">
                    <div class="item-checkbox"></div>
                    <span class="item-title">${escapeHtml(todo.text)}</span>
                </div>
                <button class="delete-btn" aria-label="削除">&times;</button>
            `;

            // Toggle completed status
            li.querySelector('.item-left').addEventListener('click', () => {
                todo.completed = !todo.completed;
                saveTodoItems();
                renderTodos();
            });

            // Delete todo
            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                todoItems = todoItems.filter(t => t.id !== todo.id);
                saveTodoItems();
                renderTodos();
            });

            todoList.appendChild(li);
        });
    }

    // ==========================================
    // INITIALIZATION RUNS
    // ==========================================
    renderPackingItems();
    updateProgress();
    renderTodos();

    // Helper: Escape HTML
    function escapeHtml(string) {
        return String(string).replace(/[&<>"']/g, function (s) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[s];
        });
    }
});
