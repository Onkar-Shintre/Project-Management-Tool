/* ============================================
   TASKFLOW — Board View (Lists + Tasks)
   ============================================ */

const Board = {
  user: null,
  board: null,
  activeTaskId: null,

  init() {
    this.user = Auth.requireAuth();
    if (!this.user) return;

    // Get board ID from URL
    const params = new URLSearchParams(window.location.search);
    const boardId = params.get('id');

    if (!boardId) {
      window.location.href = 'app.html';
      return;
    }

    this.board = Store.getBoardById(boardId);
    if (!this.board) {
      Utils.showToast('Board not found', 'error');
      setTimeout(() => { window.location.href = 'app.html'; }, 1000);
      return;
    }

    this.boardContent = document.getElementById('board-content');
    this.boardTitleEl = document.getElementById('board-title');
    this.boardStarBtn = document.getElementById('board-star-btn');
    this.addListBtn = document.getElementById('add-list-btn');
    this.addListForm = document.getElementById('add-list-form');
    this.taskDetailOverlay = document.getElementById('task-detail-overlay');
    this.taskDetailPanel = document.getElementById('task-detail-panel');

    // Set navbar info
    document.getElementById('navbar-user-name').textContent = this.user.name;
    const navAvatar = document.getElementById('navbar-user-avatar');
    navAvatar.textContent = Utils.getInitials(this.user.name);
    navAvatar.style.background = Utils.stringToColor(this.user.name);

    // Init drag & drop
    DragDrop.init(this.boardContent);
    DragDrop.onDrop((taskId, newListId, newPosition) => {
      Store.moveTask(taskId, newListId, newPosition);
      this.renderLists();
      Utils.showToast('Task moved', 'info');
    });

    // Init real-time
    Realtime.init((key) => {
      this.board = Store.getBoardById(this.board.id);
      this.renderLists();
    });

    this.renderBoard();
    this.renderLists();
    this.bindEvents();
  },

  bindEvents() {
    // Board title editing
    this.boardTitleEl?.addEventListener('blur', () => {
      const newTitle = this.boardTitleEl.value.trim();
      if (newTitle && newTitle !== this.board.title) {
        Store.updateBoard(this.board.id, { title: newTitle });
        this.board.title = newTitle;
      }
    });

    this.boardTitleEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.boardTitleEl.blur();
      }
    });

    // Star toggle
    this.boardStarBtn?.addEventListener('click', () => {
      Store.toggleBoardStar(this.board.id);
      this.board = Store.getBoardById(this.board.id);
      this.renderBoardStar();
    });

    // Add list button
    this.addListBtn?.addEventListener('click', () => {
      this.showAddListForm();
    });

    // Add list form
    document.getElementById('add-list-submit')?.addEventListener('click', () => this.handleAddList());
    document.getElementById('add-list-cancel')?.addEventListener('click', () => this.hideAddListForm());
    document.getElementById('add-list-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAddList();
      if (e.key === 'Escape') this.hideAddListForm();
    });

    // Task detail close
    this.taskDetailOverlay?.addEventListener('click', () => this.closeTaskDetail());
    document.getElementById('task-detail-close')?.addEventListener('click', () => this.closeTaskDetail());

    // Back button
    document.getElementById('board-back-btn')?.addEventListener('click', () => {
      window.location.href = 'app.html';
    });

    // Board delete
    document.getElementById('board-delete-btn')?.addEventListener('click', () => {
      Modal.confirm('Delete Board', `Delete "${this.board.title}"? This cannot be undone.`, () => {
        Store.deleteBoard(this.board.id);
        Utils.showToast('Board deleted', 'success');
        setTimeout(() => { window.location.href = 'app.html'; }, 500);
      });
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());

    // Listen for data changes
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('taskflow_')) {
        this.board = Store.getBoardById(this.board.id);
        if (this.board) this.renderLists();
      }
    });
  },

  renderBoard() {
    if (!this.board) return;
    this.boardTitleEl.value = this.board.title;
    this.renderBoardStar();

    // Set board background gradient hint on body
    document.body.style.setProperty('--board-color', this.board.color);
  },

  renderBoardStar() {
    if (!this.boardStarBtn) return;
    const starred = this.board.starred;
    this.boardStarBtn.classList.toggle('starred', starred);
    this.boardStarBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="${starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    `;
  },

  renderLists() {
    if (!this.boardContent) return;
    const lists = Store.getBoardLists(this.board.id);

    // Keep add-list-btn and add-list-form, rebuild list columns
    const existingAddBtn = this.addListBtn;
    const existingAddForm = this.addListForm;

    // Remove old list columns only
    this.boardContent.querySelectorAll('.list-column').forEach(el => el.remove());

    // Insert list columns before the add-list button
    lists.forEach(list => {
      const listEl = this.createListElement(list);
      this.boardContent.insertBefore(listEl, existingAddBtn);
    });
  },

  createListElement(list) {
    const tasks = Store.getListTasks(list.id);
    const col = document.createElement('div');
    col.className = 'list-column';
    col.dataset.listId = list.id;

    col.innerHTML = `
      <div class="list-header">
        <div style="display:flex;align-items:center;flex:1;min-width:0;">
          <input class="list-title" value="${Utils.escapeHtml(list.title)}" data-list-id="${list.id}" spellcheck="false" maxlength="30">
          <span class="list-count">${tasks.length}</span>
        </div>
        <div class="dropdown">
          <button class="list-menu-btn" data-list-menu="${list.id}" title="List menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
          <div class="dropdown-menu" id="list-menu-${list.id}">
            <button class="dropdown-item" data-delete-list="${list.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
              Delete List
            </button>
          </div>
        </div>
      </div>
      <div class="list-body" data-list-body="${list.id}">
        ${tasks.map(t => this.renderTaskCard(t)).join('')}
      </div>
      <div class="list-footer">
        <button class="add-task-btn" data-add-task-list="${list.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add a task
        </button>
      </div>
      <div class="add-task-form" data-add-task-form="${list.id}">
        <input class="add-task-input" data-add-task-input="${list.id}" placeholder="Enter task title..." maxlength="100">
        <div class="add-task-actions">
          <button class="btn btn-primary btn-sm" data-submit-task="${list.id}">Add</button>
          <button class="btn btn-ghost btn-sm" data-cancel-task="${list.id}">Cancel</button>
        </div>
      </div>
    `;

    // Bind list events
    this.bindListEvents(col, list);

    // Setup drag-and-drop on list body
    const listBody = col.querySelector(`[data-list-body="${list.id}"]`);
    DragDrop.makeListDropZone(listBody, col);

    // Make task cards draggable
    col.querySelectorAll('.task-card').forEach(card => {
      DragDrop.makeTaskDraggable(card);
    });

    return col;
  },

  renderTaskCard(task) {
    const labelsHtml = (task.labels || []).map(l => {
      const labelInfo = Utils.labelColors.find(lc => lc.name === l);
      return `<div class="task-card-label" style="background: ${labelInfo ? labelInfo.color : '#666'};"></div>`;
    }).join('');

    const hasDue = task.dueDate;
    const isOverdue = Utils.isOverdue(task.dueDate);
    const checklistTotal = (task.checklist || []).length;
    const checklistDone = (task.checklist || []).filter(c => c.done).length;

    let priorityHtml = '';
    if (task.priority && task.priority !== 'none') {
      priorityHtml = `<span class="priority-badge priority-${task.priority}">${task.priority}</span>`;
    }

    return `
      <div class="task-card" data-task-id="${task.id}" draggable="true">
        ${labelsHtml ? `<div class="task-card-labels">${labelsHtml}</div>` : ''}
        <div class="task-card-title">${Utils.escapeHtml(task.title)}</div>
        <div class="task-card-meta">
          <div class="task-card-badges">
            ${priorityHtml}
            ${hasDue ? `
              <span class="task-card-badge ${isOverdue ? 'overdue' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${Utils.formatDueDate(task.dueDate)}
              </span>
            ` : ''}
            ${checklistTotal > 0 ? `
              <span class="task-card-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                ${checklistDone}/${checklistTotal}
              </span>
            ` : ''}
            ${task.description ? `
              <span class="task-card-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  bindListEvents(col, list) {
    // List title edit
    const titleInput = col.querySelector(`[data-list-id="${list.id}"].list-title`);
    titleInput?.addEventListener('blur', () => {
      const newTitle = titleInput.value.trim();
      if (newTitle && newTitle !== list.title) {
        Store.updateList(list.id, { title: newTitle });
      }
    });
    titleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); }
    });

    // List menu toggle
    const menuBtn = col.querySelector(`[data-list-menu="${list.id}"]`);
    const menu = col.querySelector(`#list-menu-${list.id}`);
    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
      menu.classList.toggle('active');
    });

    // Delete list
    col.querySelector(`[data-delete-list="${list.id}"]`)?.addEventListener('click', () => {
      menu.classList.remove('active');
      Modal.confirm('Delete List', `Delete "${list.title}" and all its tasks?`, () => {
        Store.deleteList(list.id);
        this.renderLists();
        Utils.showToast('List deleted', 'success');
      });
    });

    // Add task button
    col.querySelector(`[data-add-task-list="${list.id}"]`)?.addEventListener('click', () => {
      this.showAddTaskForm(list.id);
    });

    // Submit task
    col.querySelector(`[data-submit-task="${list.id}"]`)?.addEventListener('click', () => {
      this.handleAddTask(list.id);
    });

    // Cancel task
    col.querySelector(`[data-cancel-task="${list.id}"]`)?.addEventListener('click', () => {
      this.hideAddTaskForm(list.id);
    });

    // Task input enter/escape
    col.querySelector(`[data-add-task-input="${list.id}"]`)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAddTask(list.id);
      if (e.key === 'Escape') this.hideAddTaskForm(list.id);
    });

    // Task card click (open detail)
    col.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't open if currently dragging
        if (card.classList.contains('dragging')) return;
        this.openTaskDetail(card.dataset.taskId);
      });
    });

    // Close dropdown on click outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
    });
  },

  /* ---- Add List ---- */
  showAddListForm() {
    this.addListBtn.style.display = 'none';
    this.addListForm.classList.add('active');
    document.getElementById('add-list-input')?.focus();
  },

  hideAddListForm() {
    this.addListBtn.style.display = '';
    this.addListForm.classList.remove('active');
    document.getElementById('add-list-input').value = '';
  },

  handleAddList() {
    const input = document.getElementById('add-list-input');
    const title = input.value.trim();
    if (!title) return;

    Store.createList({ boardId: this.board.id, title });
    input.value = '';
    this.renderLists();
    Utils.showToast('List added', 'success');

    // Scroll to the new list
    this.boardContent.scrollLeft = this.boardContent.scrollWidth;
  },

  /* ---- Add Task ---- */
  showAddTaskForm(listId) {
    const form = document.querySelector(`[data-add-task-form="${listId}"]`);
    const btn = document.querySelector(`[data-add-task-list="${listId}"]`)?.closest('.list-footer');
    if (form) form.classList.add('active');
    if (btn) btn.style.display = 'none';
    document.querySelector(`[data-add-task-input="${listId}"]`)?.focus();
  },

  hideAddTaskForm(listId) {
    const form = document.querySelector(`[data-add-task-form="${listId}"]`);
    const btn = document.querySelector(`[data-add-task-list="${listId}"]`)?.closest('.list-footer');
    if (form) form.classList.remove('active');
    if (btn) btn.style.display = '';
    const input = document.querySelector(`[data-add-task-input="${listId}"]`);
    if (input) input.value = '';
  },

  handleAddTask(listId) {
    const input = document.querySelector(`[data-add-task-input="${listId}"]`);
    const title = input?.value.trim();
    if (!title) return;

    Store.createTask({ listId, boardId: this.board.id, title });
    input.value = '';
    this.renderLists();
    Utils.showToast('Task added', 'success');

    // Re-show the add task form for quick entry
    this.showAddTaskForm(listId);
  },

  /* ---- Task Detail Panel ---- */
  openTaskDetail(taskId) {
    const task = Store.getTaskById(taskId);
    if (!task) return;

    this.activeTaskId = taskId;

    const body = document.getElementById('task-detail-body');
    body.innerHTML = `
      <input class="task-detail-title" id="detail-title" value="${Utils.escapeHtml(task.title)}" spellcheck="false">

      <div class="task-detail-section">
        <div class="task-detail-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
          Description
        </div>
        <textarea class="task-detail-description" id="detail-description" placeholder="Add a more detailed description...">${Utils.escapeHtml(task.description)}</textarea>
      </div>

      <div class="task-detail-section">
        <div class="task-detail-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          Properties
        </div>
        <div class="task-detail-props">
          <span class="task-detail-prop-label">Priority</span>
          <select class="task-detail-select" id="detail-priority">
            <option value="none" ${task.priority === 'none' ? 'selected' : ''}>None</option>
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
          </select>

          <span class="task-detail-prop-label">Due Date</span>
          <input type="date" class="task-detail-date-input" id="detail-due-date" value="${task.dueDate || ''}">
        </div>
      </div>

      <div class="task-detail-section">
        <div class="task-detail-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Labels
        </div>
        <div class="task-detail-labels" id="detail-labels">
          ${Utils.labelColors.map(l => `
            <button class="label ${l.class} ${(task.labels || []).includes(l.name) ? '' : ''}" 
              data-label-name="${l.name}"
              style="cursor:pointer; opacity: ${(task.labels || []).includes(l.name) ? '1' : '0.4'}; border: 2px solid ${(task.labels || []).includes(l.name) ? l.color : 'transparent'}; padding: 4px 12px;">
              ${l.name}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="task-detail-section">
        <div class="task-detail-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          Checklist
          ${(task.checklist || []).length > 0 ? `
            <span style="font-weight:400; color: var(--color-text-tertiary); text-transform: none; letter-spacing: 0;">
              (${(task.checklist || []).filter(c => c.done).length}/${(task.checklist || []).length})
            </span>
          ` : ''}
        </div>
        ${(task.checklist || []).length > 0 ? `
          <div class="progress-bar" style="margin-bottom: var(--space-3);">
            <div class="progress-bar-fill" style="width: ${(task.checklist || []).length > 0 ? Math.round(((task.checklist || []).filter(c => c.done).length / (task.checklist || []).length) * 100) : 0}%"></div>
          </div>
        ` : ''}
        <div class="checklist-items" id="detail-checklist">
          ${(task.checklist || []).map((item, i) => `
            <div class="checklist-item ${item.done ? 'completed' : ''}" data-checklist-index="${i}">
              <div class="checklist-item-checkbox ${item.done ? 'checked' : ''}" data-toggle-check="${i}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span class="checklist-item-text">${Utils.escapeHtml(item.text)}</span>
              <button class="checklist-item-delete" data-delete-check="${i}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
        <div class="checklist-add">
          <input class="checklist-add-input" id="checklist-add-input" placeholder="Add an item...">
          <button class="btn btn-primary btn-sm" id="checklist-add-btn">Add</button>
        </div>
      </div>

      <div style="margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--glass-border);">
        <button class="btn btn-danger btn-sm" id="delete-task-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          Delete Task
        </button>
        <p style="margin-top: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
          Created ${Utils.formatDate(task.createdAt)}
        </p>
      </div>
    `;

    // Show panel
    this.taskDetailOverlay.classList.add('active');
    this.taskDetailPanel.classList.add('active');

    // Bind detail events
    this.bindDetailEvents(task);
  },

  bindDetailEvents(task) {
    const saveField = (field, value) => {
      Store.updateTask(task.id, { [field]: value });
      task[field] = value;
    };

    // Title
    const titleEl = document.getElementById('detail-title');
    titleEl?.addEventListener('blur', () => {
      const v = titleEl.value.trim();
      if (v) saveField('title', v);
      this.renderLists();
    });
    titleEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
    });

    // Description
    const descEl = document.getElementById('detail-description');
    descEl?.addEventListener('blur', () => {
      saveField('description', descEl.value.trim());
      this.renderLists();
    });

    // Priority
    document.getElementById('detail-priority')?.addEventListener('change', (e) => {
      saveField('priority', e.target.value);
      this.renderLists();
    });

    // Due date
    document.getElementById('detail-due-date')?.addEventListener('change', (e) => {
      saveField('dueDate', e.target.value || null);
      this.renderLists();
    });

    // Labels
    document.querySelectorAll('[data-label-name]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.labelName;
        let labels = task.labels || [];
        if (labels.includes(name)) {
          labels = labels.filter(l => l !== name);
          btn.style.opacity = '0.4';
          btn.style.borderColor = 'transparent';
        } else {
          labels.push(name);
          btn.style.opacity = '1';
          const lc = Utils.labelColors.find(c => c.name === name);
          btn.style.borderColor = lc ? lc.color : 'white';
        }
        saveField('labels', labels);
        this.renderLists();
      });
    });

    // Checklist toggle
    document.querySelectorAll('[data-toggle-check]').forEach(cb => {
      cb.addEventListener('click', () => {
        const idx = parseInt(cb.dataset.toggleCheck);
        const checklist = [...(task.checklist || [])];
        checklist[idx].done = !checklist[idx].done;
        saveField('checklist', checklist);
        this.openTaskDetail(task.id); // Re-render detail
        this.renderLists();
      });
    });

    // Checklist delete
    document.querySelectorAll('[data-delete-check]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.deleteCheck);
        const checklist = [...(task.checklist || [])];
        checklist.splice(idx, 1);
        saveField('checklist', checklist);
        this.openTaskDetail(task.id);
        this.renderLists();
      });
    });

    // Checklist add
    const addInput = document.getElementById('checklist-add-input');
    const addBtn = document.getElementById('checklist-add-btn');
    const addChecklistItem = () => {
      const text = addInput?.value.trim();
      if (!text) return;
      const checklist = [...(task.checklist || []), { text, done: false }];
      saveField('checklist', checklist);
      addInput.value = '';
      this.openTaskDetail(task.id);
      this.renderLists();
    };
    addBtn?.addEventListener('click', addChecklistItem);
    addInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addChecklistItem();
    });

    // Delete task
    document.getElementById('delete-task-btn')?.addEventListener('click', () => {
      Modal.confirm('Delete Task', `Delete "${task.title}"? This cannot be undone.`, () => {
        Store.deleteTask(task.id);
        this.closeTaskDetail();
        this.renderLists();
        Utils.showToast('Task deleted', 'success');
      });
    });
  },

  closeTaskDetail() {
    this.taskDetailOverlay?.classList.remove('active');
    this.taskDetailPanel?.classList.remove('active');
    this.activeTaskId = null;
  },
};

document.addEventListener('DOMContentLoaded', () => Board.init());
