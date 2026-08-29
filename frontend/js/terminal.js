const screens = [...document.querySelectorAll('[data-screen]')];
const toast = document.getElementById('toast');

function show(route, push = true) {
  if (!['home', 'archive', 'about', 'links'].includes(route)) route = 'home';
  screens.forEach(screen => screen.classList.toggle('active', screen.dataset.screen === route));
  if (push) history.replaceState(null, '', `#${route}`);
  toast.textContent = `OPEN: ${route.toUpperCase()}.EXE`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 800);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function appendTerminal(command, output = '') {
  const line = document.createElement('div');
  line.className = 'term-line';
  const prompt = document.createElement('span');
  prompt.className = 'prompt';
  prompt.textContent = 'guest@remedios:~$';
  line.append(prompt, ` ${command}`);
  terminalScreen.appendChild(line);
  if (output) {
    const out = document.createElement('div');
    out.className = 'term-output';
    out.textContent = output;
    terminalScreen.appendChild(out);
  }
  terminalScreen.scrollTop = terminalScreen.scrollHeight;
}

const terminalScreen = document.getElementById('terminalScreen');
const terminalInput = document.getElementById('terminalInput');
const terminalForm = document.getElementById('terminalForm');

function runCommand(raw) {
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return;
  const commands = {
    help: 'commands: archive / about / links / home / status / clear',
    status: 'homepage: online\ncarousel: running\ndanmaku: active\nmusic: kirby-controlled\nsignal: stable',
    home: 'opening HOME.EXE ...',
    archive: 'opening ARCHIVE.EXE ...',
    about: 'opening ABOUT.EXE ...',
    links: 'opening LINKS.EXE ...'
  };
  window.RemediosAPI?.trackEvent('cli_command', { command: cmd });
  if (['home', 'archive', 'about', 'links'].includes(cmd)) {
    appendTerminal(cmd, commands[cmd]);
    setTimeout(() => show(cmd), 180);
    return;
  }
  if (cmd === 'clear') {
    terminalScreen.replaceChildren();
    return;
  }
  appendTerminal(cmd, commands[cmd] || 'command not found. type help.');
}

document.querySelectorAll('[data-route-cli]').forEach(button => {
  button.addEventListener('click', () => show(button.dataset.routeCli));
});
window.addEventListener('hashchange', () => show(location.hash.slice(1), false));
show(location.hash.slice(1) || 'home', false);
document.addEventListener('keydown', event => {
  const map = { '1': 'home', '2': 'archive', '3': 'about', '4': 'links' };
  if (map[event.key] && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) show(map[event.key]);
});
terminalForm.addEventListener('submit', event => {
  event.preventDefault();
  const command = terminalInput.value;
  terminalInput.value = '';
  runCommand(command);
});
document.querySelectorAll('[data-cmd]').forEach(button => button.addEventListener('click', () => runCommand(button.dataset.cmd)));
document.addEventListener('pointermove', event => {
  if (Math.random() <= 0.965) return;
  const heart = document.createElement('span');
  heart.className = 'pixel-heart';
  heart.style.left = `${event.clientX}px`;
  heart.style.top = `${event.clientY}px`;
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 4200);
});

window.RemediosNavigation = { show };
