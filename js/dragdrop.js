/* ============================================
   TASKFLOW — Drag and Drop Engine
   ============================================ */

const DragDrop = {
  draggedEl: null,
  draggedTaskId: null,
  sourceListId: null,
  placeholder: null,

  init(boardContent) {
    this.boardContent = boardContent;
    this.onDropCallback = null;
  },

  /**
   * Set callback for when a task is dropped
   * @param {Function} cb - (taskId, newListId, newPosition) => void
   */
  onDrop(cb) {
    this.onDropCallback = cb;
  },

  /**
   * Make a task card draggable
   */
  makeTaskDraggable(taskCard) {
    taskCard.setAttribute('draggable', 'true');

    taskCard.addEventListener('dragstart', (e) => {
      this.draggedEl = taskCard;
      this.draggedTaskId = taskCard.dataset.taskId;
      this.sourceListId = taskCard.closest('.list-column')?.dataset.listId;

      taskCard.classList.add('dragging');

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', this.draggedTaskId);

      // Slight delay so the dragging class shows
      requestAnimationFrame(() => {
        taskCard.style.opacity = '0.4';
      });
    });

    taskCard.addEventListener('dragend', () => {
      taskCard.classList.remove('dragging');
      taskCard.style.opacity = '';
      this.removePlaceholder();
      this.removeAllHighlights();
      this.draggedEl = null;
      this.draggedTaskId = null;
      this.sourceListId = null;
    });
  },

  /**
   * Make a list body a drop zone
   */
  makeListDropZone(listBody, listColumn) {
    listBody.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (!this.draggedEl) return;

      listColumn.classList.add('drag-over');

      const afterElement = this.getDragAfterElement(listBody, e.clientY);
      this.removePlaceholder();

      const placeholder = document.createElement('div');
      placeholder.className = 'drop-placeholder';
      this.placeholder = placeholder;

      if (afterElement) {
        listBody.insertBefore(placeholder, afterElement);
      } else {
        listBody.appendChild(placeholder);
      }
    });

    listBody.addEventListener('dragleave', (e) => {
      // Only remove if actually leaving the list body
      if (!listBody.contains(e.relatedTarget)) {
        listColumn.classList.remove('drag-over');
        this.removePlaceholder();
      }
    });

    listBody.addEventListener('drop', (e) => {
      e.preventDefault();
      listColumn.classList.remove('drag-over');

      if (!this.draggedTaskId) return;

      const listId = listColumn.dataset.listId;
      const afterElement = this.getDragAfterElement(listBody, e.clientY);

      // Calculate new position
      let newPosition;
      if (afterElement) {
        const cards = [...listBody.querySelectorAll('.task-card:not(.dragging)')];
        newPosition = cards.indexOf(afterElement);
      } else {
        const cards = [...listBody.querySelectorAll('.task-card:not(.dragging)')];
        newPosition = cards.length;
      }

      this.removePlaceholder();

      if (this.onDropCallback) {
        this.onDropCallback(this.draggedTaskId, listId, newPosition);
      }
    });

    // Also handle dragover on empty lists
    listColumn.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.draggedEl) return;
      listColumn.classList.add('drag-over');
    });

    listColumn.addEventListener('dragleave', (e) => {
      if (!listColumn.contains(e.relatedTarget)) {
        listColumn.classList.remove('drag-over');
      }
    });

    listColumn.addEventListener('drop', (e) => {
      e.preventDefault();
      listColumn.classList.remove('drag-over');
    });
  },

  /**
   * Get the element after which we should insert
   */
  getDragAfterElement(listBody, y) {
    const cards = [...listBody.querySelectorAll('.task-card:not(.dragging)')];

    return cards.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  },

  removePlaceholder() {
    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }
    // Also remove any stale placeholders
    document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
  },

  removeAllHighlights() {
    document.querySelectorAll('.list-column.drag-over').forEach(l => l.classList.remove('drag-over'));
  },
};
