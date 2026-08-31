(() => {
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API_BASE_URL = isLocal ? 'http://localhost:8787' : 'https://remedios-api.REPLACE_WITH_ACCOUNT.workers.dev';
  const SESSION_KEY = 'remedios_session';

  // Static seed mirroring backend/migrations/002_seed.sql so the GitHub Pages
  // preview still renders Archive / Links / Status without the Worker API.
  // Once a real API_BASE_URL is configured, live data wins and this is unused.
  const SEED = {
    status: [
      { id: 1, type: 'now', label: 'NOW', content: 'building something', priority: 40 },
      { id: 2, type: 'mood', label: 'MOOD', content: 'low battery', priority: 30 },
      { id: 3, type: 'music', label: 'MUSIC', content: 'online', priority: 20 },
      { id: 4, type: 'signal', label: 'SIGNAL', content: 'stable', priority: 10 }
    ],
    comments: [
      { nickname: '小雨', content: '这个主页也太像你的网络房间了' },
      { nickname: '404', content: '像素味很正，归档页很好用' },
      { nickname: 'Moon', content: '今天也要保持在线 ✦' },
      { nickname: 'Nana', content: '粉蓝配色看着很舒服' },
      { nickname: '朋友A', content: '什么时候更新下一篇？' }
    ],
    friends: [
      { id: 1, name: 'Moonroom', description: '设计、摄影与一些轻量的生活记录。', url: 'https://example.com/moonroom', tag: 'design' },
      { id: 2, name: '404 Garden', description: '技术博客 / 开源项目 / 奇怪实验室。', url: 'https://example.com/404-garden', tag: 'tech' },
      { id: 3, name: 'Night Radio', description: '音乐、游戏和互联网文化收藏。', url: 'https://example.com/night-radio', tag: 'culture' }
    ],
    posts: {
      items: [
        { slug: 'network-room', title: '欢迎来到我的网络房间', description: '主页索引、最近在做的事，以及这个网站为什么长成现在这样。', category: '站务', tags: ['站务', '随笔'], link: '#', published_at: '2026-08-11T13:30:00Z' },
        { slug: 'project-retrospective', title: '最近的一次项目复盘', description: '记录从模糊想法到可运行 Demo 的过程：问题、方案、取舍与下一步。', category: '项目', tags: ['项目', '复盘'], link: '#', published_at: '2026-08-08T00:00:00Z' },
        { slug: 'recent-learning', title: '一些最近学到的东西', description: '把零散输入整理成可复用的框架，而不是让收藏夹继续无限膨胀。', category: '学习', tags: ['学习', '笔记'], link: '#', published_at: '2026-08-03T00:00:00Z' }
      ],
      pagination: { total: 3, page: 1, limit: 50, pages: 1 }
    }
  };

  // True when the production worker URL is still the placeholder — the Pages
  // preview then reads from SEED instead of firing requests to a dead host.
  const offline = API_BASE_URL.includes('REPLACE_WITH_ACCOUNT');

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

  async function read(path, fallback) {
    if (offline) return fallback;
    try { return await request(path); } catch { return fallback; }
  }

  const api = {
    API_BASE_URL,
    getStatus: () => read('/api/status', SEED.status),
    getHomeComments: limit => read(`/api/comments/home${params({ limit })}`, SEED.comments.slice(0, Math.min(50, limit || 20))),
    getFriends: () => read('/api/friends', SEED.friends),
    getPosts: values => read(`/api/posts${params(values || {})}`, SEED.posts),
    submitGuestbook: payload => {
      if (offline) return Promise.reject(new Error('OFFLINE'));
      return request('/api/guestbook', { method: 'POST', body: JSON.stringify(payload) });
    },
    trackEvent(eventName, metadata = {}) {
      if (offline) return Promise.resolve(null);
      const payload = { event_name: eventName, session_id: sessionId(), page: location.hash.slice(1) || 'home', metadata };
      return request('/api/events', { method: 'POST', body: JSON.stringify(payload) }).catch(() => null);
    }
  };
  window.RemediosAPI = api;
})();
