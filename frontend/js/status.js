function setState(container, message, className = 'dynamic-state') {
  container.replaceChildren();
  const state = document.createElement('div');
  state.className = className;
  state.textContent = message;
  container.appendChild(state);
}

function renderComments(items) {
  const layer = document.querySelector('.danmaku-layer');
  layer.replaceChildren();
  if (!items.length) return;
  items.forEach((item, index) => {
    const line = document.createElement('div');
    line.className = 'danmaku';
    line.style.animationDelay = `${index * 0.7}s`;
    const name = document.createElement('b');
    name.textContent = `@${item.nickname}: `;
    line.append(name, document.createTextNode(item.content));
    layer.appendChild(line);
  });
}

function renderStatus(items) {
  const track = document.querySelector('.status-mini-track');
  track.replaceChildren();
  const values = items.length ? items : [
    { label: 'NOW', content: 'somewhere on the internet' },
    { label: 'SIGNAL', content: 'offline' }
  ];
  [...values, ...values.slice(0, Math.max(0, 8 - values.length))].forEach(item => {
    const row = document.createElement('div');
    const label = document.createElement('b');
    label.textContent = item.label;
    const content = document.createElement('span');
    content.textContent = item.content;
    row.append(label, content);
    track.appendChild(row);
  });
}

function formatDate(value) {
  if (!value) return 'undated';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10).replaceAll('-', '.');
}

function tagsFor(post) {
  return Array.isArray(post.tags) ? post.tags : [];
}

function postNode(post, archive = false) {
  const item = document.createElement(archive ? 'div' : 'article');
  item.className = archive ? 't-item' : 'post pixel-border';
  item.dataset.text = [post.title, post.description, post.category, ...tagsFor(post)].join(' ');
  if (archive) {
    const small = document.createElement('small');
    small.textContent = `${formatDate(post.published_at)} · #${post.category || 'misc'}`;
    const title = document.createElement('h3');
    title.textContent = post.title;
    const description = document.createElement('p');
    description.textContent = post.description || '';
    item.append(small, title, description);
    return item;
  }
  const date = document.createElement('div');
  date.className = 'date';
  date.textContent = formatDate(post.published_at);
  const body = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = post.title;
  const description = document.createElement('p');
  description.textContent = post.description || '';
  const tags = document.createElement('div');
  tags.className = 'tags';
  tagsFor(post).forEach(value => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = `#${value}`;
    tags.appendChild(tag);
  });
  body.append(title, description, tags);
  const arrow = document.createElement('div');
  arrow.className = 'arrow';
  arrow.textContent = '→';
  item.append(date, body, arrow);
  item.addEventListener('click', () => window.RemediosAPI?.trackEvent('post_click', { slug: post.slug }));
  return item;
}

function renderPosts(data) {
  const home = document.querySelector('.posts');
  const timeline = document.getElementById('timeline');
  home.replaceChildren();
  timeline.replaceChildren();
  if (!data.items.length) {
    setState(home, 'ARCHIVE EMPTY. nothing has been recorded yet.');
    setState(timeline, 'ARCHIVE EMPTY. nothing has been recorded yet.');
    return;
  }
  data.items.slice(0, 3).forEach(post => home.appendChild(postNode(post)));
  data.items.forEach(post => timeline.appendChild(postNode(post, true)));
  window.RemediosArchive?.refresh();
}

function renderFriends(items) {
  const grid = document.querySelector('.links-grid');
  grid.replaceChildren();
  if (items.length) {
    items.forEach((friend, index) => {
      const link = document.createElement('a');
      link.className = 'friend pixel-border';
      link.href = friend.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      const mini = document.createElement('div');
      mini.className = 'mini';
      mini.textContent = `FRIEND_${String(index + 1).padStart(3, '0')}`;
      const name = document.createElement('h3');
      name.textContent = friend.name;
      const description = document.createElement('p');
      description.textContent = friend.description || '';
      link.append(mini, name, description);
      link.addEventListener('click', () => window.RemediosAPI?.trackEvent('friend_click', { id: friend.id }));
      grid.appendChild(link);
    });
  } else {
    setState(grid, 'NO SIGNAL YET. waiting for new connections.');
  }
  addGuestbook(grid);
}

function addGuestbook(grid) {
  const section = document.createElement('form');
  section.className = 'guestbook pixel-border';
  const heading = document.createElement('h2');
  heading.textContent = 'GUESTBOOK';
  const nickname = document.createElement('input');
  nickname.name = 'nickname'; nickname.maxLength = 30; nickname.required = true; nickname.placeholder = 'nickname';
  const content = document.createElement('textarea');
  content.name = 'content'; content.maxLength = 200; content.required = true; content.placeholder = 'message';
  const submit = document.createElement('button');
  submit.type = 'submit'; submit.textContent = 'SEND';
  const feedback = document.createElement('div');
  feedback.className = 'guestbook-feedback';
  section.append(heading, nickname, content, submit, feedback);
  section.addEventListener('submit', async event => {
    event.preventDefault(); submit.disabled = true; submit.textContent = 'SENDING...';
    try {
      await window.RemediosAPI.submitGuestbook({ nickname: nickname.value, content: content.value });
      submit.textContent = 'SENT'; feedback.textContent = 'submitted for review'; section.reset();
      window.RemediosAPI.trackEvent('guestbook_submit');
    } catch {
      submit.textContent = 'SEND FAILED'; feedback.textContent = 'please try again later';
    } finally { setTimeout(() => { submit.disabled = false; submit.textContent = 'SEND'; }, 1800); }
  });
  grid.parentElement.appendChild(section);
}

async function loadDynamicContent() {
  const statusTrack = document.querySelector('.status-mini-track');
  setState(statusTrack, 'STATUS connecting...');
  try { renderStatus(await window.RemediosAPI.getStatus()); } catch { renderStatus([]); }
  try { renderComments(await window.RemediosAPI.getHomeComments(20)); } catch { document.querySelector('.danmaku-layer').replaceChildren(); }
  try { renderPosts(await window.RemediosAPI.getPosts({ limit: 50 })); } catch {
    setState(document.querySelector('.posts'), 'ARCHIVE EMPTY. nothing has been recorded yet.');
    setState(document.getElementById('timeline'), 'ARCHIVE EMPTY. nothing has been recorded yet.');
  }
  try { renderFriends(await window.RemediosAPI.getFriends()); } catch { renderFriends([]); }
  window.RemediosAPI.trackEvent('page_view');
}

const search = document.getElementById('archiveSearch');
const chips = [...document.querySelectorAll('.chip')];
let filter = 'all';
function applyFilter() {
  const query = search.value.trim().toLowerCase();
  document.querySelectorAll('.t-item').forEach(item => {
    const value = `${item.dataset.text} ${item.textContent}`.toLowerCase();
    item.style.display = (!query || value.includes(query)) && (filter === 'all' || value.includes(filter.toLowerCase())) ? 'block' : 'none';
  });
}
chips.forEach(chip => chip.addEventListener('click', () => {
  chips.forEach(item => item.classList.remove('active'));
  chip.classList.add('active'); filter = chip.dataset.filter; applyFilter();
}));
search.addEventListener('input', applyFilter);
window.RemediosArchive = { refresh: applyFilter };
loadDynamicContent();
