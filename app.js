document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. THEME SWITCHER
    // ==========================================
    const themeButtons = document.querySelectorAll('.theme-btn');
    const body = document.body;

    // Load saved theme or default to cyberpunk
    const savedTheme = localStorage.getItem('theme') || 'cyberpunk';
    setTheme(savedTheme);

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            setTheme(theme);
        });
    });

    function setTheme(theme) {
        // Remove existing theme classes
        body.classList.remove('theme-cyberpunk', 'theme-ocean', 'theme-sunset');
        // Add selected theme class
        body.classList.add(`theme-${theme}`);
        // Save to local storage
        localStorage.setItem('theme', theme);

        // Update active class on buttons
        themeButtons.forEach(btn => {
            if (btn.getAttribute('data-theme') === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // ==========================================
    // 2. INTERACTIVE CHECKLIST (TODO)
    // ==========================================
    const todoInput = document.getElementById('todo-input');
    const todoAddBtn = document.getElementById('todo-add-btn');
    const todoList = document.getElementById('todo-list');

    // Default tasks if none exist in localStorage
    const defaultTasks = [
        { id: 1, text: 'GitHub Pagesの公開設定を確認する', completed: false },
        { id: 2, text: 'テーマ切り替えを試す', completed: true },
        { id: 3, text: 'メッセージを入力して送信する', completed: false }
    ];

    let tasks = JSON.parse(localStorage.getItem('tasks')) || defaultTasks;

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        todoList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `todo-item ${task.completed ? 'completed' : ''}`;
            li.dataset.id = task.id;

            li.innerHTML = `
                <div class="todo-text-wrapper">
                    <div class="todo-checkbox"></div>
                    <span class="todo-text">${escapeHtml(task.text)}</span>
                </div>
                <button class="todo-delete-btn" aria-label="タスクを削除">&times;</button>
            `;

            // Toggle completion on click
            li.querySelector('.todo-text-wrapper').addEventListener('click', () => {
                task.completed = !task.completed;
                saveTasks();
                renderTasks();
            });

            // Delete task on click
            li.querySelector('.todo-delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                tasks = tasks.filter(t => t.id !== task.id);
                saveTasks();
                renderTasks();
            });

            todoList.appendChild(li);
        });
    }

    // Add new task
    function addTask() {
        const text = todoInput.value.trim();
        if (text) {
            const newTask = {
                id: Date.now(),
                text: text,
                completed: false
            };
            tasks.push(newTask);
            saveTasks();
            renderTasks();
            todoInput.value = '';
            todoInput.focus();
        }
    }

    todoAddBtn.addEventListener('click', addTask);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // Initial render
    renderTasks();

    // ==========================================
    // 3. INTERACTIVE COUNTER
    // ==========================================
    const counterValue = document.getElementById('counter-value');
    const counterDec = document.getElementById('counter-dec');
    const counterInc = document.getElementById('counter-inc');

    let count = parseInt(localStorage.getItem('counter')) || 0;
    counterValue.textContent = count;

    counterDec.addEventListener('click', () => {
        count--;
        updateCounter();
    });

    counterInc.addEventListener('click', () => {
        count++;
        updateCounter();
    });

    function updateCounter() {
        counterValue.textContent = count;
        localStorage.setItem('counter', count);
    }

    // ==========================================
    // 4. ANIMATION BOX (PULSE)
    // ==========================================
    const pulseTriggerBtn = document.getElementById('pulse-trigger-btn');
    const pulseBox = document.getElementById('pulse-box');

    pulseTriggerBtn.addEventListener('click', () => {
        const isActive = pulseBox.classList.toggle('pulse-active');
        if (isActive) {
            pulseTriggerBtn.textContent = 'アニメーション停止';
            pulseTriggerBtn.style.borderColor = 'var(--accent)';
        } else {
            pulseTriggerBtn.textContent = 'アニメーション開始';
            pulseTriggerBtn.style.borderColor = 'var(--border-color)';
        }
    });

    // ==========================================
    // 5. FEEDBACK FORM PREVIEW
    // ==========================================
    const feedbackForm = document.getElementById('feedback-form');
    const userName = document.getElementById('user-name');
    const userMessage = document.getElementById('user-message');
    const formFeedback = document.getElementById('form-feedback');
    const feedbackName = document.getElementById('feedback-name');
    const feedbackMsg = document.getElementById('feedback-msg');

    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nameVal = userName.value.trim();
        const msgVal = userMessage.value.trim();

        if (nameVal && msgVal) {
            feedbackName.textContent = nameVal;
            feedbackMsg.textContent = msgVal;
            formFeedback.classList.remove('hidden');

            // Soft scroll to show the output
            formFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Optional: reset form fields
            // userName.value = '';
            // userMessage.value = '';
        }
    });

    // Helper: Escape HTML to prevent XSS
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
