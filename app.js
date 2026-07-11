document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // DATA PROTECTION (XOR ENCRYPTION HELPERS)
    // ==========================================
    function encryptData(dataObject, key) {
        const jsonString = JSON.stringify(dataObject);
        // XOR Encrypt
        let encrypted = "";
        for (let i = 0; i < jsonString.length; i++) {
            const charCode = jsonString.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            encrypted += String.fromCharCode(charCode);
        }
        // Safely encode to Base64 (supporting Unicode characters)
        return btoa(unescape(encodeURIComponent(encrypted)));
    }

    function decryptData(encryptedBase64, key) {
        try {
            // Decode from Base64
            const encrypted = decodeURIComponent(escape(atob(encryptedBase64)));
            // XOR Decrypt
            let decrypted = "";
            for (let i = 0; i < encrypted.length; i++) {
                const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                decrypted += String.fromCharCode(charCode);
            }
            return JSON.parse(decrypted);
        } catch (e) {
            console.error("Decryption failed:", e);
            return null;
        }
    }

    // SHA-256 Hashing for Passwords
    async function hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ==========================================
    // DOM ELEMENTS (AUTH & VIEW CONTROL)
    // ==========================================
    const authSection = document.getElementById('auth-section');
    const appContent = document.getElementById('app-content');
    const userMenu = document.getElementById('user-menu');
    const userDisplayName = document.getElementById('user-display-name');
    const signoutBtn = document.getElementById('signout-btn');

    const tabSignin = document.getElementById('tab-signin');
    const tabSignup = document.getElementById('tab-signup');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const signinError = document.getElementById('signin-error');
    const signupError = document.getElementById('signup-error');

    // ==========================================
    // TAB TOGGLE LOGIC
    // ==========================================
    tabSignin.addEventListener('click', () => {
        tabSignin.classList.add('active');
        tabSignup.classList.remove('active');
        signinForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        signinError.classList.add('hidden');
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabSignin.classList.remove('active');
        signupForm.classList.remove('hidden');
        signinForm.classList.add('hidden');
        signupError.classList.add('hidden');
    });

    // ==========================================
    // AUTHENTICATION STATE & SESSION
    // ==========================================
    let currentUser = sessionStorage.getItem('tr_session_user') || null;
    let currentUserKey = sessionStorage.getItem('tr_session_key') || null; // password hash used as crypto key

    // Users database in localStorage
    const getUsersDb = () => JSON.parse(localStorage.getItem('tr_users')) || {};
    const saveUsersDb = (db) => localStorage.setItem('tr_users', JSON.stringify(db));

    // Initial check
    if (currentUser && currentUserKey) {
        showApp();
    } else {
        showAuth();
    }

    function showApp() {
        authSection.classList.add('hidden');
        appContent.classList.remove('hidden');
        userMenu.classList.remove('hidden');
        userDisplayName.textContent = `👤 ${currentUser}`;
        // Load and initialize app data
        initializeApp();
    }

    function showAuth() {
        authSection.classList.remove('hidden');
        appContent.classList.add('hidden');
        userMenu.classList.add('hidden');
    }

    // Sign Out
    signoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('tr_session_user');
        sessionStorage.removeItem('tr_session_key');
        currentUser = null;
        currentUserKey = null;
        showAuth();
    });

    // ==========================================
    // SIGN UP PROCESS
    // ==========================================
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        signupError.classList.add('hidden');

        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;

        if (!username || !password) {
            showError(signupError, "すべてのフィールドを入力してください。");
            return;
        }

        if (password !== confirmPassword) {
            showError(signupError, "パスワードが一致しません。");
            return;
        }

        const usersDb = getUsersDb();
        if (usersDb[username]) {
            showError(signupError, "このユーザー名は既に登録されています。");
            return;
        }

        // Register user
        const passHash = await hashPassword(password);
        usersDb[username] = passHash;
        saveUsersDb(usersDb);

        // Create default user data encrypted with their key
        const defaultData = {
            destination: '',
            date: '',
            packingItems: [
                { id: 1, text: '航空券 / 乗車券', category: 'essential', packed: false },
                { id: 2, text: '財布（現金・カード）', category: 'essential', packed: true },
                { id: 3, text: 'スマホ充電器', category: 'gadget', packed: false },
                { id: 4, text: '歯ブラシセット', category: 'toiletries', packed: false },
                { id: 5, text: '下着・靴下', category: 'clothing', packed: false }
            ],
            todoItems: [
                { id: 101, text: 'パスポート有効期限の確認', completed: false },
                { id: 102, text: '旅行保険の加入手続き', completed: false },
                { id: 103, text: '通信（Wi-Fi/eSIM）の手配', completed: false },
                { id: 104, text: 'ホテルの予約確認', completed: true }
            ]
        };

        const encrypted = encryptData(defaultData, passHash);
        localStorage.setItem(`tr_data_${username}`, encrypted);

        // Sign in automatically
        currentUser = username;
        currentUserKey = passHash;
        sessionStorage.setItem('tr_session_user', username);
        sessionStorage.setItem('tr_session_key', passHash);

        // Reset form
        signupForm.reset();
        showApp();
    });

    // ==========================================
    // SIGN IN PROCESS
    // ==========================================
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        signinError.classList.add('hidden');

        const username = document.getElementById('signin-username').value.trim();
        const password = document.getElementById('signin-password').value;

        const usersDb = getUsersDb();
        const passHash = await hashPassword(password);

        if (usersDb[username] && usersDb[username] === passHash) {
            // Check if user has encrypted data
            const encryptedData = localStorage.getItem(`tr_data_${username}`);
            if (encryptedData) {
                // Confirm decryption works
                const decrypted = decryptData(encryptedData, passHash);
                if (decrypted) {
                    // Success login
                    currentUser = username;
                    currentUserKey = passHash;
                    sessionStorage.setItem('tr_session_user', username);
                    sessionStorage.setItem('tr_session_key', passHash);

                    signinForm.reset();
                    showApp();
                    return;
                }
            }
            showError(signinError, "データの読み込みに失敗しました。");
        } else {
            showError(signinError, "ユーザー名またはパスワードが正しくありません。");
        }
    });

    function showError(element, msg) {
        element.textContent = msg;
        element.classList.remove('hidden');
    }

    // ==========================================
    // TRAVEL APP INITIALIZATION & CORE LOGIC
    // ==========================================
    function initializeApp() {
        // Load encrypted data
        const encryptedData = localStorage.getItem(`tr_data_${currentUser}`);
        let userData = { destination: '', date: '', packingItems: [], todoItems: [] };

        if (encryptedData) {
            const decrypted = decryptData(encryptedData, currentUserKey);
            if (decrypted) {
                userData = decrypted;
            }
        }

        let packingItems = userData.packingItems || [];
        let todoItems = userData.todoItems || [];
        let travelDestination = userData.destination || '';
        let travelDate = userData.date || '';
        let currentTab = 'all';

        // Emoji mapping
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

        // DOM Elements
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

        // Set initial values
        destInput.value = travelDestination;
        dateInput.value = travelDate;

        // Auto Save to local storage (encrypted)
        function saveUserData() {
            const dataToSave = {
                destination: travelDestination,
                date: travelDate,
                packingItems: packingItems,
                todoItems: todoItems
            };
            const encrypted = encryptData(dataToSave, currentUserKey);
            localStorage.setItem(`tr_data_${currentUser}`, encrypted);
            updateProgress();
        }

        // Travel Details & Countdown
        function updateCountdown() {
            if (!travelDate) {
                countdownCard.classList.add('hidden');
                return;
            }

            const now = new Date();
            const departure = new Date(travelDate + 'T00:00:00');
            destDisplay.textContent = travelDestination || '目的地';

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

        destInput.oninput = () => {
            travelDestination = destInput.value.trim();
            saveUserData();
            updateCountdown();
        };

        dateInput.onchange = () => {
            travelDate = dateInput.value;
            saveUserData();
            updateCountdown();
        };

        // Run countdown setup
        updateCountdown();

        // Progress Calculation
        function updateProgress() {
            const total = packingItems.length;
            const packed = packingItems.filter(item => item.packed).length;
            const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;

            progressBarFill.style.width = `${percentage}%`;
            progressPercentage.textContent = `${percentage}%`;
            progressCounts.textContent = `${packed}/${total}`;
        }

        // Packing List Render
        function renderPackingItems() {
            packingList.innerHTML = '';
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

                li.querySelector('.item-left').onclick = () => {
                    item.packed = !item.packed;
                    saveUserData();
                    renderPackingItems();
                };

                li.querySelector('.delete-btn').onclick = (e) => {
                    e.stopPropagation();
                    packingItems = packingItems.filter(i => i.id !== item.id);
                    saveUserData();
                    renderPackingItems();
                };

                packingList.appendChild(li);
            });
        }

        // Add item
        function addPackingItem() {
            const text = itemInput.value.trim();
            const category = categorySelect.value;

            if (text) {
                packingItems.push({
                    id: Date.now() + Math.random(),
                    text: text,
                    category: category,
                    packed: false
                });
                saveUserData();
                renderPackingItems();
                itemInput.value = '';
                itemInput.focus();
            }
        }

        itemAddBtn.onclick = addPackingItem;
        itemInput.onkeypress = (e) => {
            if (e.key === 'Enter') addPackingItem();
        };

        // Clear Packed
        clearPackedBtn.onclick = () => {
            packingItems = packingItems.filter(item => !item.packed);
            saveUserData();
            renderPackingItems();
        };

        // Tab selection
        tabButtons.forEach(btn => {
            btn.onclick = () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.getAttribute('data-tab');
                renderPackingItems();
            };
        });

        // Presets Setup
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
            btn.onclick = () => {
                const presetType = btn.getAttribute('data-preset');
                const itemsToAdd = presets[presetType];

                if (itemsToAdd) {
                    itemsToAdd.forEach(pItem => {
                        const exists = packingItems.some(item => item.text.toLowerCase() === pItem.text.toLowerCase());
                        if (!exists) {
                            packingItems.push({
                                id: Date.now() + Math.random(),
                                text: pItem.text,
                                category: pItem.category,
                                packed: false
                            });
                        }
                    });
                    saveUserData();
                    renderPackingItems();

                    // Active glow feedback
                    btn.style.borderColor = 'var(--accent)';
                    btn.style.background = 'rgba(46, 196, 182, 0.15)';
                    setTimeout(() => {
                        btn.style.borderColor = 'var(--border-color)';
                        btn.style.background = 'rgba(255, 255, 255, 0.03)';
                    }, 800);
                }
            };
        });

        // Pre-departure Todos
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

                li.querySelector('.item-left').onclick = () => {
                    todo.completed = !todo.completed;
                    saveUserData();
                    renderTodos();
                };

                li.querySelector('.delete-btn').onclick = (e) => {
                    e.stopPropagation();
                    todoItems = todoItems.filter(t => t.id !== todo.id);
                    saveUserData();
                    renderTodos();
                };

                todoList.appendChild(li);
            });
        }

        // Run renders
        renderPackingItems();
        updateProgress();
        renderTodos();
    }

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
