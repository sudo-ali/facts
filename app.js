// Facts-only SPA state
const state = {
  facts: [],
  factTopic: 'random',
  searchQuery: '',
  isSearching: false,
};

// IntersectionObserver instance (declared early to avoid TDZ)
let observer = null;

const topics = [
  { id: 'random', name: 'Random Facts' },
  { id: 'space', name: 'Space & Astronomy' },
  { id: 'history', name: 'History' },
  { id: 'science', name: 'Science & Technology' },
  { id: 'nature', name: 'Nature & Animals' },
  { id: 'geography', name: 'Geography' },
  { id: 'art', name: 'Art & Culture' },
  { id: 'sports', name: 'Sports' },
  { id: 'inventions', name: 'Inventions' },
  { id: 'human-body', name: 'Human Body' },
];

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'onclick') el.addEventListener('click', v);
    else if (k === 'oninput') el.addEventListener('input', v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else el.appendChild(child);
  }
  return el;
}

// No tabs in facts-only mode

async function loadFacts(topic = state.factTopic, count = 12) {
  try {
    let pages = [];
    if (topic === 'random') {
      const resp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&generator=random&grnnamespace=0&prop=extracts&exintro&explaintext&origin=*&grnlimit=${count}`);
      const data = await resp.json();
      pages = Object.values(data.query?.pages ?? {});
    } else {
      const search = encodeURIComponent(topic);
      const resp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${search}&origin=*&srlimit=${count}`);
      const data = await resp.json();
      pages = (data.query?.search ?? []).map((s) => ({ title: s.title, extract: s.snippet?.replace(/<[^>]*>/g, '') }));
    }
    const newItems = pages.map((p, i) => ({ id: `fact-${Date.now()}-${i}`, text: truncate(p.extract || p.title || '', 55), topic }));
    // Append for infinite scroll
    if (state._appending) state.facts = [...state.facts, ...newItems]; else state.facts = newItems;
  } catch (e) {
    const fallbacks = Array.from({ length: count }).map((_, i) => ({ id: `fallback-${Date.now()}-${i}`, text: `Fallback Fact #${i + 1}` }));
    state.facts = state._appending ? [...state.facts, ...fallbacks] : fallbacks;
  }
  render();
}

function truncate(text, maxWords) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  const t = words.slice(0, maxWords).join(' ');
  return t.endsWith('.') ? t : t + '...';
}

async function searchFacts(query) {
  if (!query.trim()) return;
  state.isSearching = true;
  render();
  try {
    const q = encodeURIComponent(query.trim());
    const resp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${q}&origin=*&srlimit=10`);
    const data = await resp.json();
    state.facts = (data.query?.search ?? []).map((s, i) => ({ id: `search-${Date.now()}-${i}`, text: truncate((s.snippet || s.title).replace(/<[^>]*>/g, ''), 55), topic: query }));
  } catch (e) {
    // ignore
  } finally {
    state.isSearching = false;
    render();
  }
}

function ensureDemoSets() {
  if (state.sets.length) return;
  state.sets = [
    {
      id: 'demo-1',
      title: 'Sample Set 1',
      flashcards: [
        { id: '1', question: 'What is 2 + 2?', answer: '4' },
        { id: '2', question: 'Capital of France?', answer: 'Paris' },
      ],
    },
    {
      id: 'demo-2',
      title: 'Space Basics',
      flashcards: [
        { id: '3', question: 'Nearest star to Earth?', answer: 'The Sun' },
      ],
    },
  ];
}

function TopBar() {
  const factsBtn = h('button', { class: 'pill active' }, 'Facts');
  return h('div', { class: 'topbar' }, factsBtn);
}

// No auth bar
function AuthBar() { return h('div'); }

function Feed() {
  const searchInput = h('input', {
    class: 'input',
    placeholder: 'Search Wikipedia for facts...',
    value: state.searchQuery,
    oninput: (e) => (state.searchQuery = e.target.value),
  });
  const searchBtn = h('button', { class: 'btn', disabled: !state.searchQuery.trim() || state.isSearching, onclick: () => searchFacts(state.searchQuery) }, state.isSearching ? 'Searching...' : 'Search');
  const bar = h('div', { class: 'bar' }, searchInput, searchBtn);

  const topicText = state.searchQuery && state.facts.length ? `Search Results: "${state.searchQuery}"` : (topics.find(t => t.id === state.factTopic)?.name || 'Random Facts');
  const topicBar = h('div', { class: 'topicbar' }, h('span', { class: 'muted' }, topicText), TopicSelector());

  const list = h('div', { class: 'list' }, ...state.facts.map((f, i) => Card('Fact', f.text, i)));
  // Infinite scroll sentinel
  const sentinel = h('div');
  list.appendChild(sentinel);
  setupInfiniteScroll(sentinel);
  return h('div', null, bar, topicBar, list);
}

function TopicSelector() {
  const select = h('select', { class: 'input', onchange: (e) => { state.factTopic = e.target.value; loadFacts(e.target.value); } },
    ...topics.map(t => h('option', { value: t.id, selected: t.id === state.factTopic ? 'selected' : null }, t.name))
  );
  return select;
}

function Card(title, text, index = 0) {
  const el = h('div', { class: 'card' }, h('h3', null, title), h('p', null, text));
  // Heart overlay
  const heart = h('div', { class: 'heart', style: `top: 40%;` }, '❤');
  el.style.position = 'relative';
  el.appendChild(heart);

  // Double-click like
  let lastTap = 0;
  const like = () => {
    heart.classList.remove('like-burst');
    // trigger reflow to restart animation
    void heart.offsetWidth;
    heart.classList.add('like-burst');
  };
  el.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      like();
      lastTap = 0;
    } else {
      lastTap = now;
    }
  });

  // Touch double-tap
  el.addEventListener('touchend', () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      like();
      lastTap = 0;
    } else {
      lastTap = now;
    }
  });

  // Basic swipe detection (left/right)
  let startX = 0, startY = 0, swiping = false;
  el.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!t) return;
    startX = t.pageX; startY = t.pageY; swiping = false;
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    const dx = Math.abs(t.pageX - startX);
    const dy = Math.abs(t.pageY - startY);
    if (!swiping && dx > 50 && dx > dy * 2) swiping = true;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (!swiping) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const deltaX = t.pageX - startX;
    if (deltaX < -120) like(); // left like
    // right swipe could dismiss; keep as like for now to keep UX simple
    swiping = false;
  });

  requestAnimationFrame(() => {
    el.style.animation = `fadeInUp .5s ease forwards ${index * 60}ms, popIn .5s ease forwards ${index * 60 + 120}ms`;
  });
  return el;
}

// Removed Flashcards/Library/Tabs

function Content() { return Feed(); }

function App() { return h('div', null, TopBar(), Content()); }

function render() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  root.appendChild(App());
}

// Initial render and data
render();
loadFacts();

// Removed bounce(); tabs are gone

// Infinite scroll handler
function setupInfiniteScroll(el) {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        observer.disconnect();
        state._appending = true;
        loadFacts(state.factTopic, 8).then(() => {
          state._appending = false;
        });
      }
    }
  }, { rootMargin: '200px' });
  observer.observe(el);
}


