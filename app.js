document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // DATA PROTECTION (XOR ENCRYPTION HELPERS)
    // ==========================================
    function encryptData(dataObject, key) {
        const jsonString = JSON.stringify(dataObject);
        let encrypted = "";
        for (let i = 0; i < jsonString.length; i++) {
            const charCode = jsonString.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            encrypted += String.fromCharCode(charCode);
        }
        return btoa(unescape(encodeURIComponent(encrypted)));
    }

    function decryptData(encryptedBase64, key) {
        try {
            const encrypted = decodeURIComponent(escape(atob(encryptedBase64)));
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

        // Create default multi-trip user data encrypted with their key
        const defaultData = {
            activeTripId: "trip_default",
            trips: {
                "trip_default": {
                    id: "trip_default",
                    name: "初めての旅行計画",
                    startDate: new Date().toISOString().split('T')[0],
                    durationNights: 2,
                    durationDays: 3,
                    itinerary: [
                        { day: 1, startPoint: "東京", endPoint: "京都", stops: [
                            { id: 1, timeStart: "08:00", timeEnd: "10:15", location: "新幹線で京都へ移動", note: "のぞみ号 指定席" },
                            { id: 2, timeStart: "11:30", timeEnd: "13:00", location: "京都駅でおばんざいランチ", note: "駅ビル2F" },
                            { id: 3, timeStart: "14:00", timeEnd: "16:00", location: "清水寺を散策", note: "拝観料 400円" }
                        ]},
                        { day: 2, startPoint: "京都", endPoint: "嵐山", stops: [
                            { id: 4, timeStart: "09:30", timeEnd: "12:00", location: "嵐山の竹林の小径", note: "トロッコ列車も検討" }
                        ]},
                        { day: 3, startPoint: "京都", endPoint: "東京", stops: [
                            { id: 5, timeStart: "16:00", timeEnd: "18:15", location: "新幹線で東京へ帰還", note: "お土産を駅で買う" }
                        ]}
                    ],
                    packingItems: [
                        { id: 1, text: '航空券 / 乗車チケット', category: 'essential', packed: false },
                        { id: 2, text: '財布（免許証・保険証）', category: 'essential', packed: true },
                        { id: 3, text: 'スマートフォンと充電器', category: 'gadget', packed: false },
                        { id: 4, text: '洗面道具・常備薬', category: 'toiletries', packed: false },
                        { id: 5, text: '着替え（日数分）', category: 'clothing', packed: false }
                    ],
                    todoItems: [
                        { id: 101, text: '新幹線／飛行機のチケット確認', completed: true },
                        { id: 102, text: 'ホテルの予約確認・チェックイン時間の連絡', completed: false },
                        { id: 103, text: '冷蔵庫の生ゴミの整理', completed: false }
                    ]
                }
            }
        };

        const encrypted = encryptData(defaultData, passHash);
        localStorage.setItem(`tr_data_${username}`, encrypted);

        // Sign in automatically
        currentUser = username;
        currentUserKey = passHash;
        sessionStorage.setItem('tr_session_user', username);
        sessionStorage.setItem('tr_session_key', passHash);

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
            const encryptedData = localStorage.getItem(`tr_data_${username}`);
            if (encryptedData) {
                const decrypted = decryptData(encryptedData, passHash);
                if (decrypted) {
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
        const encryptedData = localStorage.getItem(`tr_data_${currentUser}`);
        let userData = { activeTripId: "trip_default", trips: {} };

        if (encryptedData) {
            const decrypted = decryptData(encryptedData, currentUserKey);
            if (decrypted) {
                userData = decrypted;
            }
        }

        // Migration Check: If old single-trip schema exists, migrate it to multi-trip schema
        if (userData && !userData.trips) {
            const legacyPacking = userData.packingItems || [];
            const legacyTodo = userData.todoItems || [];
            const legacyDest = userData.destination || 'デフォルトの旅行';
            const legacyDate = userData.date || '';

            userData = {
                activeTripId: "trip_migrated",
                trips: {
                    "trip_migrated": {
                        id: "trip_migrated",
                        name: legacyDest,
                        startDate: legacyDate,
                        durationNights: 2,
                        durationDays: 3,
                        itinerary: [
                            { day: 1, startPoint: "", endPoint: "", stops: [] },
                            { day: 2, startPoint: "", endPoint: "", stops: [] },
                            { day: 3, startPoint: "", endPoint: "", stops: [] }
                        ],
                        packingItems: legacyPacking,
                        todoItems: legacyTodo
                    }
                }
            };
            // Save migrated data immediately
            const encrypted = encryptData(userData, currentUserKey);
            localStorage.setItem(`tr_data_${currentUser}`, encrypted);
        }

        // Guarantee at least one trip exists
        if (Object.keys(userData.trips).length === 0) {
            userData.trips["trip_default"] = {
                id: "trip_default",
                name: "新しい旅行プラン",
                startDate: new Date().toISOString().split('T')[0],
                durationNights: 0,
                durationDays: 1,
                itinerary: [{ day: 1, startPoint: "", endPoint: "", stops: [] }],
                packingItems: [],
                todoItems: []
            };
            userData.activeTripId = "trip_default";
            saveDataToStorage();
        }

        let activeTripId = userData.activeTripId;
        let activeTrip = userData.trips[activeTripId] || Object.values(userData.trips)[0];
        activeTripId = activeTrip.id;
        userData.activeTripId = activeTripId;

        // Sub states
        let activeItineraryDay = 1;
        let currentCategoryTab = 'all';

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

        // ==========================================
        // SELECTORS & INTERFACE ELEMENTS
        // ==========================================
        const tripSelect = document.getElementById('trip-select');
        const newTripBtn = document.getElementById('new-trip-btn');
        const deleteTripBtn = document.getElementById('delete-trip-btn');
        const countdownCard = document.getElementById('countdown-card');
        const countdownDays = document.getElementById('countdown-days');
        const countdownHours = document.getElementById('countdown-hours');
        const destDisplay = document.getElementById('dest-display');

        const mainTabButtons = document.querySelectorAll('.main-tab-btn');
        const checklistPanel = document.getElementById('checklist-panel');
        const itineraryPanel = document.getElementById('itinerary-panel');
        const todoPanel = document.getElementById('todo-panel');

        const progressBarFill = document.getElementById('progress-bar-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressCounts = document.getElementById('progress-counts');

        // New Trip Modal elements
        const newTripModal = document.getElementById('new-trip-modal');
        const modalClose = document.getElementById('modal-close');
        const newTripForm = document.getElementById('new-trip-form');

        // Packing Checklist panel elements
        const packingList = document.getElementById('packing-list');
        const itemInput = document.getElementById('item-input');
        const categorySelect = document.getElementById('category-select');
        const itemAddBtn = document.getElementById('item-add-btn');
        const clearPackedBtn = document.getElementById('clear-packed-btn');
        const categoryTabButtons = document.querySelectorAll('.tab-btn');

        // Itinerary panel elements
        const itineraryDayTabs = document.getElementById('itinerary-day-tabs');
        const startPointInput = document.getElementById('itinerary-start-point');
        const endPointInput = document.getElementById('itinerary-end-point');
        const timelineList = document.getElementById('timeline-list');
        const timeStartInput = document.getElementById('timeline-time-start');
        const timeEndInput = document.getElementById('timeline-time-end');
        const locationInput = document.getElementById('timeline-location');
        const noteInput = document.getElementById('timeline-note');
        const addTimelineBtn = document.getElementById('add-timeline-btn');

        // Todo panel elements
        const todoList = document.getElementById('todo-list');
        const presetButtons = document.querySelectorAll('.preset-btn');

        // ==========================================
        // ENCRYPTED DATA PERSISTENCE
        // ==========================================
        function saveDataToStorage() {
            const encrypted = encryptData(userData, currentUserKey);
            localStorage.setItem(`tr_data_${currentUser}`, encrypted);
            updateProgress();
        }

        // ==========================================
        // TRIP CRUD OPERATIONS
        // ==========================================
        function renderTripSelect() {
            tripSelect.innerHTML = '';
            Object.values(userData.trips).forEach(trip => {
                const option = document.createElement('option');
                option.value = trip.id;
                option.textContent = `${trip.name} (${trip.startDate || '未定'})`;
                if (trip.id === activeTripId) {
                    option.selected = true;
                }
                tripSelect.appendChild(option);
            });
        }

        // Trip select event
        tripSelect.onchange = () => {
            activeTripId = tripSelect.value;
            userData.activeTripId = activeTripId;
            activeTrip = userData.trips[activeTripId];
            activeItineraryDay = 1;
            saveDataToStorage();
            refreshActiveTripView();
        };

        // Modal triggers
        newTripBtn.onclick = () => {
            newTripModal.classList.remove('hidden');
        };

        modalClose.onclick = () => {
            newTripModal.classList.add('hidden');
        };

        // Click outside modal content to close
        window.onclick = (e) => {
            if (e.target === newTripModal) {
                newTripModal.classList.add('hidden');
            }
        };

        // Handle new trip creation
        newTripForm.onsubmit = (e) => {
            e.preventDefault();
            const name = document.getElementById('modal-trip-name').value.trim();
            const startDate = document.getElementById('modal-start-date').value;
            const nights = parseInt(document.getElementById('modal-nights').value) || 0;
            const days = parseInt(document.getElementById('modal-days').value) || 1;

            if (name && startDate) {
                const newId = `trip_${Date.now()}`;
                
                // Initialize Itinerary days
                const newItinerary = [];
                for (let i = 1; i <= days; i++) {
                    newItinerary.push({
                        day: i,
                        startPoint: "",
                        endPoint: "",
                        stops: []
                    });
                }

                userData.trips[newId] = {
                    id: newId,
                    name: name,
                    startDate: startDate,
                    durationNights: nights,
                    durationDays: days,
                    itinerary: newItinerary,
                    packingItems: [
                        { id: Date.now() + 1, text: '航空券 / 乗車チケット', category: 'essential', packed: false },
                        { id: Date.now() + 2, text: '財布（免許証・保険証）', category: 'essential', packed: true },
                        { id: Date.now() + 3, text: 'スマートフォンと充電器', category: 'gadget', packed: false }
                    ],
                    todoItems: [
                        { id: Date.now() + 101, text: '新幹線／飛行機のチケット確認', completed: false },
                        { id: Date.now() + 102, text: 'ホテルの予約確認', completed: false }
                    ]
                };

                activeTripId = newId;
                userData.activeTripId = newId;
                activeTrip = userData.trips[newId];
                activeItineraryDay = 1;

                saveDataToStorage();
                newTripForm.reset();
                newTripModal.classList.add('hidden');
                
                renderTripSelect();
                refreshActiveTripView();
            }
        };

        // Delete active trip
        deleteTripBtn.onclick = () => {
            const tripCount = Object.keys(userData.trips).length;
            if (tripCount <= 1) {
                alert("最後の1つの計画は削除できません。新しい計画を作成してから削除してください。");
                return;
            }

            if (confirm(`本当に「${activeTrip.name}」を削除しますか？\nこの操作は取り消せません。`)) {
                delete userData.trips[activeTripId];
                // Select first available trip
                activeTripId = Object.keys(userData.trips)[0];
                userData.activeTripId = activeTripId;
                activeTrip = userData.trips[activeTripId];
                activeItineraryDay = 1;

                saveDataToStorage();
                renderTripSelect();
                refreshActiveTripView();
            }
        };

        // ==========================================
        // COUNTDOWN TIMER
        // ==========================================
        function updateCountdown() {
            if (!activeTrip || !activeTrip.startDate) {
                countdownCard.classList.add('hidden');
                return;
            }

            const now = new Date();
            const departure = new Date(activeTrip.startDate + 'T00:00:00');
            destDisplay.textContent = activeTrip.name || '目的地';

            const timeDiff = departure.getTime() - now.getTime();

            if (timeDiff <= 0) {
                countdownCard.classList.remove('hidden');
                countdownDays.textContent = '0';
                countdownHours.textContent = '00';
                countdownCard.querySelector('.countdown-label').innerHTML = `🎉 <strong>${escapeHtml(activeTrip.name || '旅行')}</strong> の出発日を迎えました！`;
                return;
            }

            countdownCard.classList.remove('hidden');
            countdownCard.querySelector('.countdown-label').innerHTML = `<span>${escapeHtml(activeTrip.name || '目的地')}</span> まであと`;

            const totalHours = Math.floor(timeDiff / (1000 * 60 * 60));
            const days = Math.floor(totalHours / 24);
            const hours = totalHours % 24;

            countdownDays.textContent = days;
            countdownHours.textContent = String(hours).padStart(2, '0');
        }

        // ==========================================
        // TAB VIEW TOGGLE (MAIN CHANNELS)
        // ==========================================
        mainTabButtons.forEach(btn => {
            btn.onclick = () => {
                mainTabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tab = btn.getAttribute('data-main-tab');
                checklistPanel.classList.add('hidden');
                itineraryPanel.classList.add('hidden');
                todoPanel.classList.add('hidden');

                if (tab === 'checklist') {
                    checklistPanel.classList.remove('hidden');
                } else if (tab === 'itinerary') {
                    itineraryPanel.classList.remove('hidden');
                    renderItinerary();
                } else if (tab === 'todo') {
                    todoPanel.classList.remove('hidden');
                    renderTodos();
                }
            };
        });

        // ==========================================
        // PACKING CHECKLIST CORE LOGIC
        // ==========================================
        function updateProgress() {
            if (!activeTrip) return;
            const items = activeTrip.packingItems || [];
            const total = items.length;
            const packed = items.filter(item => item.packed).length;
            const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;

            progressBarFill.style.width = `${percentage}%`;
            progressPercentage.textContent = `${percentage}%`;
            progressCounts.textContent = `${packed}/${total}`;
        }

        function renderPackingItems() {
            packingList.innerHTML = '';
            const items = activeTrip.packingItems || [];

            const filteredItems = items.filter(item => {
                if (currentCategoryTab === 'all') return true;
                return item.category === currentCategoryTab;
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
                    saveDataToStorage();
                    renderPackingItems();
                };

                li.querySelector('.delete-btn').onclick = (e) => {
                    e.stopPropagation();
                    activeTrip.packingItems = activeTrip.packingItems.filter(i => i.id !== item.id);
                    saveDataToStorage();
                    renderPackingItems();
                };

                packingList.appendChild(li);
            });
        }

        function addPackingItem() {
            const text = itemInput.value.trim();
            const category = categorySelect.value;

            if (text && activeTrip) {
                if (!activeTrip.packingItems) activeTrip.packingItems = [];
                activeTrip.packingItems.push({
                    id: Date.now() + Math.random(),
                    text: text,
                    category: category,
                    packed: false
                });
                saveDataToStorage();
                renderPackingItems();
                itemInput.value = '';
                itemInput.focus();
            }
        }

        itemAddBtn.onclick = addPackingItem;
        itemInput.onkeypress = (e) => {
            if (e.key === 'Enter') addPackingItem();
        };

        clearPackedBtn.onclick = () => {
            if (activeTrip && activeTrip.packingItems) {
                activeTrip.packingItems = activeTrip.packingItems.filter(item => !item.packed);
                saveDataToStorage();
                renderPackingItems();
            }
        };

        categoryTabButtons.forEach(btn => {
            btn.onclick = () => {
                categoryTabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategoryTab = btn.getAttribute('data-tab');
                renderPackingItems();
            };
        });

        // ==========================================
        // ITINERARY (ITINERARY PLANNER) CORE LOGIC
        // ==========================================
        function renderItinerary() {
            if (!activeTrip) return;
            const durationDays = activeTrip.durationDays || 1;
            const nights = activeTrip.durationNights || 0;

            // Header summary string
            const itineraryCard = document.getElementById('itinerary-panel').querySelector('h2');
            itineraryCard.innerHTML = `🗺️ 行程表 (${nights}泊${durationDays}日)`;

            // Render day tabs
            itineraryDayTabs.innerHTML = '';
            for (let d = 1; d <= durationDays; d++) {
                const btn = document.createElement('button');
                btn.className = `tab-btn ${d === activeItineraryDay ? 'active' : ''}`;
                btn.textContent = `${d}日目`;
                btn.dataset.day = d;
                btn.onclick = () => {
                    activeItineraryDay = d;
                    renderItineraryDayContent();
                };
                itineraryDayTabs.appendChild(btn);
            }

            renderItineraryDayContent();
        }

        function renderItineraryDayContent() {
            // Find active day itinerary details
            if (!activeTrip.itinerary) {
                // Initialize if missing
                activeTrip.itinerary = [];
                for (let i = 1; i <= activeTrip.durationDays; i++) {
                    activeTrip.itinerary.push({ day: i, startPoint: "", endPoint: "", stops: [] });
                }
            }

            // Ensure activeItineraryDay exists in array
            let dayData = activeTrip.itinerary.find(it => it.day === activeItineraryDay);
            if (!dayData) {
                dayData = { day: activeItineraryDay, startPoint: "", endPoint: "", stops: [] };
                activeTrip.itinerary.push(dayData);
            }

            // Bind values
            startPointInput.value = dayData.startPoint || '';
            endPointInput.value = dayData.endPoint || '';

            // Handle start/end point changes
            startPointInput.oninput = () => {
                dayData.startPoint = startPointInput.value.trim();
                saveDataToStorage();
            };

            endPointInput.oninput = () => {
                dayData.endPoint = endPointInput.value.trim();
                saveDataToStorage();
            };

            // Render timeline stops
            timelineList.innerHTML = '';
            const stops = dayData.stops || [];

            if (stops.length === 0) {
                timelineList.innerHTML = `<p class="card-desc" style="padding: 1rem 0; text-align:center;">まだスケジュールがありません。下のフォームから予定を追加しましょう！</p>`;
            } else {
                stops.forEach(stop => {
                    const item = document.createElement('div');
                    item.className = 'timeline-item';
                    item.dataset.id = stop.id;

                    const timeDisplay = formatTimeDisplay(stop.timeStart, stop.timeEnd);

                    item.innerHTML = `
                        <div class="timeline-time-col">
                            ${timeDisplay}
                        </div>
                        <div class="timeline-content-col">
                            <div class="timeline-location-text">${escapeHtml(stop.location)}</div>
                            ${stop.note ? `<div class="timeline-note-text">📝 ${escapeHtml(stop.note)}</div>` : ''}
                        </div>
                        <button class="delete-btn" aria-label="削除">&times;</button>
                    `;

                    // Delete stop
                    item.querySelector('.delete-btn').onclick = () => {
                        dayData.stops = dayData.stops.filter(s => s.id !== stop.id);
                        saveDataToStorage();
                        renderItineraryDayContent();
                    };

                    timelineList.appendChild(item);
                });
            }

            // Add timeline event
            addTimelineBtn.onclick = () => {
                const timeStart = timeStartInput.value;
                const timeEnd = timeEndInput.value;
                const location = locationInput.value.trim();
                const note = noteInput.value.trim();

                if (!location) {
                    alert("場所または行動内容を入力してください。");
                    return;
                }

                if (!dayData.stops) dayData.stops = [];

                dayData.stops.push({
                    id: Date.now() + Math.random(),
                    timeStart: timeStart,
                    timeEnd: timeEnd,
                    location: location,
                    note: note
                });

                // Chronological sorting based on start time
                dayData.stops.sort((a, b) => {
                    if (!a.timeStart) return 1;
                    if (!b.timeStart) return -1;
                    return a.timeStart.localeCompare(b.timeStart);
                });

                saveDataToStorage();
                renderItineraryDayContent();

                // Clear inputs
                timeStartInput.value = '';
                timeEndInput.value = '';
                locationInput.value = '';
                noteInput.value = '';
            };
        }

        function formatTimeDisplay(start, end) {
            if (!start && !end) return '<span class="time-text">終日</span>';
            
            let display = '';
            if (start) {
                display += `<span class="time-text">${start}</span>`;
            } else {
                display += `<span class="time-text">-</span>`;
            }

            if (end) {
                display += `<span class="time-dash">▼</span>`;
                display += `<span class="time-text">${end}</span>`;
            }

            return display;
        }

        // ==========================================
        // PRESET INTEGRATION
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
            btn.onclick = () => {
                const presetType = btn.getAttribute('data-preset');
                const itemsToAdd = presets[presetType];

                if (itemsToAdd && activeTrip) {
                    if (!activeTrip.packingItems) activeTrip.packingItems = [];

                    itemsToAdd.forEach(pItem => {
                        const exists = activeTrip.packingItems.some(item => item.text.toLowerCase() === pItem.text.toLowerCase());
                        if (!exists) {
                            activeTrip.packingItems.push({
                                id: Date.now() + Math.random(),
                                text: pItem.text,
                                category: pItem.category,
                                packed: false
                            });
                        }
                    });
                    saveDataToStorage();
                    renderPackingItems();

                    // active animation
                    btn.style.borderColor = 'var(--accent)';
                    btn.style.background = 'rgba(46, 196, 182, 0.15)';
                    setTimeout(() => {
                        btn.style.borderColor = 'var(--border-color)';
                        btn.style.background = 'rgba(255, 255, 255, 0.03)';
                    }, 800);
                }
            };
        });

        // ==========================================
        // PRE-DEPARTURE TODO LIST
        // ==========================================
        function renderTodos() {
            todoList.innerHTML = '';
            const todos = activeTrip.todoItems || [];

            if (todos.length === 0) {
                todoList.innerHTML = `<li class="card-desc" style="text-align: center; padding: 2rem 0; margin: 0;">やることタスクはありません</li>`;
                return;
            }

            todos.forEach(todo => {
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
                    saveDataToStorage();
                    renderTodos();
                };

                li.querySelector('.delete-btn').onclick = (e) => {
                    e.stopPropagation();
                    activeTrip.todoItems = activeTrip.todoItems.filter(t => t.id !== todo.id);
                    saveDataToStorage();
                    renderTodos();
                };

                todoList.appendChild(li);
            });
        }

        // ==========================================
        // REFRESH & LOAD ACTIVE VIEW
        // ==========================================
        function refreshActiveTripView() {
            updateCountdown();
            renderPackingItems();
            updateProgress();

            // Refresh sub-views depending on active panel
            const activeMainTabBtn = document.querySelector('.main-tab-btn.active');
            const activeTab = activeMainTabBtn.getAttribute('data-main-tab');
            if (activeTab === 'itinerary') {
                renderItinerary();
            } else if (activeTab === 'todo') {
                renderTodos();
            }
        }

        // Initialize selectors and view
        renderTripSelect();
        refreshActiveTripView();
        
        // Setup countdown checker interval
        clearInterval(window.countdownInterval);
        window.countdownInterval = setInterval(updateCountdown, 60000);
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
