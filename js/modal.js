/* ============================================
   TASKFLOW — Modal System
   ============================================ */

const Modal = {
  _overlay: null,

  /**
   * Open a modal
   * @param {Object} config - { title, body (HTML string), actions: [{ label, class, onClick }], onClose }
   */
  open(config) {
    this.close(); // Close any existing modal

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-content" id="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${Utils.escapeHtml(config.title || '')}</h3>
          <button class="modal-close" id="modal-close-btn" aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" id="modal-body">
          ${config.body || ''}
        </div>
        ${config.actions ? `
          <div class="modal-footer" id="modal-footer">
            ${config.actions.map((a, i) => `
              <button class="btn ${a.class || 'btn-secondary'}" id="modal-action-${i}">${Utils.escapeHtml(a.label)}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    this._overlay = overlay;

    // Force reflow then add active class for animation
    overlay.offsetHeight;
    overlay.classList.add('active');

    // Bind close
    overlay.querySelector('#modal-close-btn').addEventListener('click', () => this.close(config.onClose));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close(config.onClose);
    });

    // Bind action buttons
    if (config.actions) {
      config.actions.forEach((action, i) => {
        const btn = overlay.querySelector(`#modal-action-${i}`);
        if (btn && action.onClick) {
          btn.addEventListener('click', () => action.onClick());
        }
      });
    }

    // Escape key
    this._escHandler = (e) => {
      if (e.key === 'Escape') this.close(config.onClose);
    };
    document.addEventListener('keydown', this._escHandler);

    // Focus first input if exists
    setTimeout(() => {
      const firstInput = overlay.querySelector('input, textarea, select');
      if (firstInput) firstInput.focus();
    }, 100);

    return overlay;
  },

  /**
   * Close the modal
   */
  close(onClose) {
    if (this._overlay) {
      this._overlay.classList.remove('active');
      setTimeout(() => {
        this._overlay?.remove();
        this._overlay = null;
      }, 250);
    }

    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }

    if (typeof onClose === 'function') onClose();
  },

  /**
   * Quick confirm dialog
   */
  confirm(title, message, onConfirm) {
    this.open({
      title,
      body: `<p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.6;">${Utils.escapeHtml(message)}</p>`,
      actions: [
        { label: 'Cancel', class: 'btn-secondary', onClick: () => this.close() },
        { label: 'Confirm', class: 'btn-danger', onClick: () => { this.close(); onConfirm(); } },
      ],
    });
  },
};
