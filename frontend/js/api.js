(() => {
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API_BASE_URL = isLocal ? 'http://localhost:8787' : 'https://remedios-api.REPLACE_WITH_ACCOUNT.workers.dev';
  const SESSION_KEY = 'remedios_session';

  function sessionId() {
    let value = localStorage.getItem(SESSION_KEY);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, value);
    }
    return value;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json', 'x-session-id': sessionId(), ...(options.headers || {}) }
    });
    let payload;
    try { payload = await response.json(); } catch { throw new Error('INVALID_RESPONSE'); }
    if (!response.ok || !payload.success) {
      const error = new Error(payload.error?.message || `HTTP_${response.status}`);
      error.code = payload.error?.code || 'API_ERROR';
      throw error;
    }
    return payload.data;
  }

  function params(values) {
    const query = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value);
    });
    const result = query.toString();
    return result ? `?${result}` : '';
  }

  const api = {
    API_BASE_URL,
    getStatus: () => request('/api/status'),
    getHomeComments: limit => request(`/api/comments/home${params({ limit })}`),
    getFriends: () => request('/api/friends'),
    getPosts: values => request(`/api/posts${params(values || {})}`),
    submitGuestbook: payload => request('/api/guestbook', { method: 'POST', body: JSON.stringify(payload) }),
    trackEvent(eventName, metadata = {}) {
      const payload = { event_name: eventName, session_id: sessionId(), page: location.hash.slice(1) || 'home', metadata };
      return request('/api/events', { method: 'POST', body: JSON.stringify(payload) }).catch(() => null);
    }
  };
  window.RemediosAPI = api;
})();
