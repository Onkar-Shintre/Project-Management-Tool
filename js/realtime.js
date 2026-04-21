/* ============================================
   TASKFLOW — Real-time Sync (Cross-tab)
   ============================================ */

const Realtime = {
  _lastHash: null,

  /**
   * Initialize real-time listener
   * @param {Function} onUpdate - Called when data changes in another tab
   */
  init(onUpdate) {
    // Listen for storage events (fires when another tab modifies localStorage)
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('taskflow_')) {
        const dataKey = e.key.replace('taskflow_', '');
        if (['boards', 'lists', 'tasks'].includes(dataKey)) {
          if (typeof onUpdate === 'function') {
            onUpdate(dataKey);
          }
        }
      }
    });

    // Listen for custom events from same tab
    window.addEventListener('taskflow-data-change', (e) => {
      // This is handled directly by components, no action needed here
    });
  },
};
