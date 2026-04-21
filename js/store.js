/* ============================================
   TASKFLOW — Data Store (localStorage CRUD)
   ============================================ */

const Store = {
  /* ---- Internal Helpers ---- */
  _get(key) {
    try {
      const data = localStorage.getItem('taskflow_' + key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  _set(key, value) {
    try {
      localStorage.setItem('taskflow_' + key, JSON.stringify(value));
      // Dispatch custom event for real-time sync
      window.dispatchEvent(new CustomEvent('taskflow-data-change', { detail: { key } }));
    } catch (e) {
      console.error('Store: Failed to save', key, e);
    }
  },

  /* ==============================
     USERS
     ============================== */
  getUsers() {
    return this._get('users') || [];
  },

  getUserById(id) {
    return this.getUsers().find(u => u.id === id) || null;
  },

  getUserByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  createUser({ name, email, password }) {
    const users = this.getUsers();
    const user = {
      id: Utils.generateId(),
      name,
      email: email.toLowerCase(),
      password: btoa(password), // base64 encode (demo only!)
      avatar: null,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    this._set('users', users);
    return user;
  },

  /* ==============================
     SESSION
     ============================== */
  getSession() {
    return this._get('session');
  },

  setSession(userId) {
    this._set('session', {
      userId,
      token: Utils.generateId(),
      createdAt: new Date().toISOString(),
    });
  },

  clearSession() {
    localStorage.removeItem('taskflow_session');
  },

  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    return this.getUserById(session.userId);
  },

  /* ==============================
     BOARDS
     ============================== */
  getBoards() {
    return this._get('boards') || [];
  },

  getUserBoards(userId) {
    return this.getBoards().filter(b => b.ownerId === userId || (b.memberIds || []).includes(userId));
  },

  getBoardById(id) {
    return this.getBoards().find(b => b.id === id) || null;
  },

  createBoard({ title, description, color, ownerId }) {
    const boards = this.getBoards();
    const board = {
      id: Utils.generateId(),
      title,
      description: description || '',
      color: color || Utils.boardColors[0],
      ownerId,
      memberIds: [],
      starred: false,
      createdAt: new Date().toISOString(),
    };
    boards.push(board);
    this._set('boards', boards);
    return board;
  },

  updateBoard(id, updates) {
    const boards = this.getBoards();
    const idx = boards.findIndex(b => b.id === id);
    if (idx === -1) return null;
    boards[idx] = { ...boards[idx], ...updates };
    this._set('boards', boards);
    return boards[idx];
  },

  deleteBoard(id) {
    const boards = this.getBoards().filter(b => b.id !== id);
    this._set('boards', boards);
    // Also delete all lists and tasks for this board
    const lists = this.getLists().filter(l => l.boardId !== id);
    this._set('lists', lists);
    const tasks = this.getTasks().filter(t => t.boardId !== id);
    this._set('tasks', tasks);
  },

  toggleBoardStar(id) {
    const boards = this.getBoards();
    const board = boards.find(b => b.id === id);
    if (board) {
      board.starred = !board.starred;
      this._set('boards', boards);
    }
    return board;
  },

  /* ==============================
     LISTS
     ============================== */
  getLists() {
    return this._get('lists') || [];
  },

  getBoardLists(boardId) {
    return this.getLists()
      .filter(l => l.boardId === boardId)
      .sort((a, b) => a.position - b.position);
  },

  getListById(id) {
    return this.getLists().find(l => l.id === id) || null;
  },

  createList({ boardId, title }) {
    const lists = this.getLists();
    const boardLists = lists.filter(l => l.boardId === boardId);
    const list = {
      id: Utils.generateId(),
      boardId,
      title,
      position: boardLists.length,
      createdAt: new Date().toISOString(),
    };
    lists.push(list);
    this._set('lists', lists);
    return list;
  },

  updateList(id, updates) {
    const lists = this.getLists();
    const idx = lists.findIndex(l => l.id === id);
    if (idx === -1) return null;
    lists[idx] = { ...lists[idx], ...updates };
    this._set('lists', lists);
    return lists[idx];
  },

  deleteList(id) {
    const lists = this.getLists().filter(l => l.id !== id);
    this._set('lists', lists);
    // Delete tasks in this list
    const tasks = this.getTasks().filter(t => t.listId !== id);
    this._set('tasks', tasks);
  },

  /* ==============================
     TASKS
     ============================== */
  getTasks() {
    return this._get('tasks') || [];
  },

  getListTasks(listId) {
    return this.getTasks()
      .filter(t => t.listId === listId)
      .sort((a, b) => a.position - b.position);
  },

  getTaskById(id) {
    return this.getTasks().find(t => t.id === id) || null;
  },

  getBoardTasks(boardId) {
    return this.getTasks().filter(t => t.boardId === boardId);
  },

  createTask({ listId, boardId, title }) {
    const tasks = this.getTasks();
    const listTasks = tasks.filter(t => t.listId === listId);
    const task = {
      id: Utils.generateId(),
      listId,
      boardId,
      title,
      description: '',
      priority: 'none',
      dueDate: null,
      labels: [],
      checklist: [],
      position: listTasks.length,
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);
    this._set('tasks', tasks);
    return task;
  },

  updateTask(id, updates) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    tasks[idx] = { ...tasks[idx], ...updates };
    this._set('tasks', tasks);
    return tasks[idx];
  },

  deleteTask(id) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this._set('tasks', tasks);
  },

  moveTask(taskId, newListId, newPosition) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldListId = task.listId;

    // Remove from old position
    const oldListTasks = tasks
      .filter(t => t.listId === oldListId && t.id !== taskId)
      .sort((a, b) => a.position - b.position);
    oldListTasks.forEach((t, i) => { t.position = i; });

    // Update task's list
    task.listId = newListId;

    // Insert at new position
    const newListTasks = tasks
      .filter(t => t.listId === newListId && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    newListTasks.splice(newPosition, 0, task);
    newListTasks.forEach((t, i) => { t.position = i; });

    this._set('tasks', tasks);
  },
};
