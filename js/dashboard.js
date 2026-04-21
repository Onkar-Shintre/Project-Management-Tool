/* ============================================
   TASKFLOW — Dashboard (Board Management)
   ============================================ */

const Dashboard = {
  user: null,

  init() {
    this.user = Auth.requireAuth();
    if (!this.user) return;

    this.boardsGrid = document.getElementById('boards-grid');
    this.starredGrid = document.getElementById('starred-grid');
    this.starredSection = document.getElementById('starred-section');
    this.greetingEl = document.getElementById('greeting-name');
    this.searchInput = document.getElementById('search-input');
    this.userNameEl = document.getElementById('user-name');
    this.userAvatarEl = document.getElementById('user-avatar');

    this.render();
    this.bindEvents();
  },

  bindEvents() {
    // Create board button
    document.getElementById('create-board-btn')?.addEventListener('click', () => this.openCreateBoardModal());

    // Search
    this.searchInput?.addEventListener('input', Utils.debounce((e) => {
      this.render(e.target.value);
    }, 200));

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());

    // Listen for data changes (real-time)
    window.addEventListener('taskflow-data-change', () => this.render());
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('taskflow_')) this.render();
    });
  },

  render(searchQuery = '') {
    if (!this.user) return;

    // Update user info
    if (this.greetingEl) this.greetingEl.textContent = this.user.name.split(' ')[0];
    if (this.userNameEl) this.userNameEl.textContent = this.user.name;
    if (this.userAvatarEl) {
      this.userAvatarEl.textContent = Utils.getInitials(this.user.name);
      this.userAvatarEl.style.background = Utils.stringToColor(this.user.name);
    }

    let boards = Store.getUserBoards(this.user.id);

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      boards = boards.filter(b => b.title.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q));
    }

    // Starred boards
    const starred = boards.filter(b => b.starred);
    if (this.starredSection) {
      this.starredSection.style.display = starred.length ? 'block' : 'none';
    }
    if (this.starredGrid) {
      this.starredGrid.innerHTML = starred.map(b => this.renderBoardCard(b)).join('');
      this.bindBoardCards(this.starredGrid);
    }

    // All boards
    if (this.boardsGrid) {
      this.boardsGrid.innerHTML = boards.map(b => this.renderBoardCard(b)).join('') + this.renderNewBoardCard();
      this.bindBoardCards(this.boardsGrid);

      // Bind new board card
      const newCard = this.boardsGrid.querySelector('.board-card-new');
      if (newCard) newCard.addEventListener('click', () => this.openCreateBoardModal());
    }
  },

  renderBoardCard(board) {
    const listCount = Store.getBoardLists(board.id).length;
    const taskCount = Store.getBoardTasks(board.id).length;

    return `
      <div class="board-card" data-board-id="${board.id}">
        <div class="board-card-bg" style="background: ${board.color};"></div>
        <div class="board-card-overlay"></div>
        <div class="board-card-menu">
          <button class="board-card-menu-btn" data-menu-board="${board.id}" title="Board menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>
        <div class="board-card-content">
          <div class="board-card-title">${Utils.escapeHtml(board.title)}</div>
          ${board.description ? `<div class="board-card-desc">${Utils.escapeHtml(board.description)}</div>` : ''}
          <div class="board-card-meta">
            <div class="board-card-stats">
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                ${listCount} lists
              </span>
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                ${taskCount} tasks
              </span>
            </div>
            <button class="board-card-star ${board.starred ? 'starred' : ''}" data-star-board="${board.id}" title="Star board">
              <svg viewBox="0 0 24 24" fill="${board.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderNewBoardCard() {
    return `
      <div class="board-card-new" id="create-board-card">
        <div class="board-card-new-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <span class="board-card-new-text">Create New Board</span>
      </div>
    `;
  },

  bindBoardCards(container) {
    // Click to open board
    container.querySelectorAll('.board-card[data-board-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't navigate if clicking star or menu
        if (e.target.closest('[data-star-board]') || e.target.closest('[data-menu-board]')) return;
        const boardId = card.dataset.boardId;
        window.location.href = `board.html?id=${boardId}`;
      });
    });

    // Star toggle
    container.querySelectorAll('[data-star-board]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const boardId = btn.dataset.starBoard;
        Store.toggleBoardStar(boardId);
        this.render();
      });
    });

    // Board menu (delete)
    container.querySelectorAll('[data-menu-board]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const boardId = btn.dataset.menuBoard;
        const board = Store.getBoardById(boardId);
        Modal.confirm(
          'Delete Board',
          `Are you sure you want to delete "${board.title}"? This will permanently delete all lists and tasks in this board.`,
          () => {
            Store.deleteBoard(boardId);
            Utils.showToast('Board deleted', 'success');
            this.render();
          }
        );
      });
    });
  },

  openCreateBoardModal() {
    const colorsHtml = Utils.boardColors.map((c, i) => `
      <div class="color-swatch ${i === 0 ? 'active' : ''}" data-color="${c}" style="background: ${c};" tabindex="0"></div>
    `).join('');

    Modal.open({
      title: 'Create New Board',
      body: `
        <div class="form-group">
          <label class="form-label" for="board-title-input">Board Title</label>
          <input class="form-input" type="text" id="board-title-input" placeholder="e.g., Product Roadmap" maxlength="50" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="board-desc-input">Description (optional)</label>
          <input class="form-input" type="text" id="board-desc-input" placeholder="A brief description..." maxlength="100">
        </div>
        <div class="form-group">
          <label class="form-label">Background Color</label>
          <div class="color-swatches" id="color-swatches">
            ${colorsHtml}
          </div>
        </div>
      `,
      actions: [
        { label: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          label: 'Create Board',
          class: 'btn-primary',
          onClick: () => this.handleCreateBoard(),
        },
      ],
    });

    // Color swatch selection
    setTimeout(() => {
      document.querySelectorAll('#color-swatches .color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          document.querySelectorAll('#color-swatches .color-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
        });
      });
    }, 50);
  },

  handleCreateBoard() {
    const title = document.getElementById('board-title-input')?.value.trim();
    const description = document.getElementById('board-desc-input')?.value.trim();
    const activeSwatch = document.querySelector('#color-swatches .color-swatch.active');
    const color = activeSwatch?.dataset.color || Utils.boardColors[0];

    if (!title) {
      Utils.showToast('Please enter a board title', 'warning');
      return;
    }

    const board = Store.createBoard({
      title,
      description,
      color,
      ownerId: this.user.id,
    });

    Modal.close();
    Utils.showToast('Board "' + title + '" created!', 'success');
    this.render();

    // Navigate to the new board
    setTimeout(() => {
      window.location.href = `board.html?id=${board.id}`;
    }, 600);
  },
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
