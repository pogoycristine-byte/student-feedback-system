// ── Per-user schedule helpers ──
// Key is scoped to the logged-in user's ID so staff1 and staff2 have separate schedules.

export const getSchedulesKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return `feedbackSchedules_${user.id || 'unknown'}`;
  } catch {
    return 'feedbackSchedules_unknown';
  }
};

export const getSchedules = () => {
  try { return JSON.parse(localStorage.getItem(getSchedulesKey()) || '[]'); }
  catch { return []; }
};

export const saveSchedules = (schedules) => {
  localStorage.setItem(getSchedulesKey(), JSON.stringify(schedules));
  window.dispatchEvent(new Event('schedulesUpdated'));
};