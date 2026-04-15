const revealItems = document.querySelectorAll('.reveal');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const THEME_MODE_KEY = 'site_theme_mode';
const THEME_HUE_KEY = 'site_theme_hue';

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  },
  {
    threshold: 0.16,
    rootMargin: '0px 0px -6% 0px'
  }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 60, 300)}ms`;
  observer.observe(item);
});

const siteNav = document.querySelector('.site-nav');

if (siteNav) {
  const navLinks = Array.from(siteNav.querySelectorAll('.nav-link'));
  const navSlider = siteNav.querySelector('.nav-slider');
  const hashLinks = navLinks.filter((link) => link.getAttribute('href').startsWith('#'));
  const sectionLinks = hashLinks
    .map((link) => {
      const target = document.querySelector(link.getAttribute('href'));
      return target ? { link, target } : null;
    })
    .filter(Boolean);

  let activeLink = navLinks[0] || null;

  const moveSliderTo = (link) => {
    if (!navSlider || !link) return;

    const navRect = siteNav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    navSlider.style.width = `${linkRect.width}px`;
    navSlider.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
    navSlider.style.opacity = '1';
  };

  const setActiveLink = (link) => {
    if (!link) return;
    activeLink = link;
    navLinks.forEach((navLink) => {
      navLink.classList.toggle('is-active', navLink === link);
    });
    moveSliderTo(link);
  };

  navLinks.forEach((link) => {
    link.addEventListener('mouseenter', () => moveSliderTo(link));
    link.addEventListener('focus', () => moveSliderTo(link));
    link.addEventListener('click', () => setActiveLink(link));
  });

  siteNav.addEventListener('mouseleave', () => moveSliderTo(activeLink));
  siteNav.addEventListener('focusout', (event) => {
    if (!siteNav.contains(event.relatedTarget)) {
      moveSliderTo(activeLink);
    }
  });

  if (sectionLinks.length > 0) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const match = sectionLinks.find((item) => item.target === entry.target);
          if (match) setActiveLink(match.link);
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-20% 0px -45% 0px'
      }
    );

    sectionLinks.forEach((item) => sectionObserver.observe(item.target));
  }

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const pathLink = navLinks.find((link) => {
    const href = link.getAttribute('href');
    return href === currentPath || (href === 'index.html' && currentPath === '');
  });
  const hashLink = hashLinks.find((link) => link.getAttribute('href') === window.location.hash);
  setActiveLink(pathLink || hashLink || activeLink);
  window.addEventListener('resize', () => moveSliderTo(activeLink));
}

const pageFlow = [
  { name: 'Home', href: 'index.html', teaser: 'Landing page and quick links.' },
  { name: 'Projects', href: 'projects.html', teaser: 'Current work and recent builds.' },
  { name: 'About', href: 'about.html', teaser: 'Background, focus, and interests.' },
  { name: 'Contact', href: 'contact.html', teaser: 'Ways to reach and connect.' }
];

const resolveCurrentPageIndex = () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const index = pageFlow.findIndex((page) => page.href === path);
  return index >= 0 ? index : 0;
};

const navigateWithTransition = (targetHref) => {
  if (!targetHref) return;
  const current = window.location.pathname.split('/').pop() || 'index.html';
  if (targetHref === current) return;

  document.body.classList.add('page-exit');
  const delay = reduceMotion ? 0 : 250;
  window.setTimeout(() => {
    window.location.href = targetHref;
  }, delay);
};

const initPageSlider = () => {
  const currentIndex = resolveCurrentPageIndex();
  const header = document.querySelector('.site-header');
  if (!header) return;
  const rail = document.createElement('aside');
  rail.className = 'page-rail';
  rail.setAttribute('aria-label', 'Page flow slider');

  const stepLabels = pageFlow
    .map((page, index) => `<span class="page-step${index === currentIndex ? ' is-active' : ''}" data-step="${index}" style="--step: ${index};">${page.name}</span>`)
    .join('');

  rail.innerHTML = `
    <div class="page-rail-header">
      <span class="page-rail-status"><strong id="pageRailCurrent">${pageFlow[currentIndex].name}</strong></span>
      <span class="page-rail-value" id="pageRailValue">${currentIndex + 1} / ${pageFlow.length}</span>
    </div>
    <div class="page-rail-track">
      <input
        id="pageRailInput"
        class="page-rail-input"
        type="range"
        min="0"
        max="${pageFlow.length - 1}"
        step="0.01"
        value="${currentIndex}"
        aria-label="Slide to move between pages"
      >
    </div>
    <div class="page-rail-steps">${stepLabels}</div>
    <div class="page-preview" aria-live="polite">
      <span class="page-preview-current" id="pagePreviewCurrent"></span>
      <span class="page-preview-next" id="pagePreviewNext"></span>
    </div>
  `;

  header.appendChild(rail);

  const input = rail.querySelector('#pageRailInput');
  const track = rail.querySelector('.page-rail-track');
  const currentLabel = rail.querySelector('#pageRailCurrent');
  const currentValue = rail.querySelector('#pageRailValue');
  const previewCurrent = rail.querySelector('#pagePreviewCurrent');
  const previewNext = rail.querySelector('#pagePreviewNext');
  const stepRow = rail.querySelector('.page-rail-steps');
  const stepEls = Array.from(rail.querySelectorAll('.page-step'));

  const clampIndex = (value) => Math.max(0, Math.min(pageFlow.length - 1, value));

  const setVisualState = (rawValue) => {
    const value = clampIndex(rawValue);
    const lower = Math.floor(value);
    const upper = Math.ceil(value);
    const progress = value - lower;
    const currentPage = pageFlow[lower];
    const nextPage = pageFlow[upper] || currentPage;
    const snapped = Math.abs(value - Math.round(value)) < 0.02;
    const nearest = Math.round(value);

    stepEls.forEach((stepEl) => {
      const idx = Number(stepEl.dataset.step);
      const distance = Math.abs(value - idx);
      const opacity = Math.max(0.35, 1 - distance * 0.55);
      stepEl.style.opacity = `${opacity}`;
      stepEl.classList.toggle('is-active', idx === nearest);
    });
    currentLabel.textContent = snapped ? pageFlow[nearest].name : nextPage.name;
    currentValue.textContent = `${Math.round(value) + 1} / ${pageFlow.length}`;

    previewCurrent.textContent = `${currentPage.name}: ${currentPage.teaser}`;
    previewCurrent.style.opacity = `${upper === lower ? 1 : 1 - progress}`;

    if (upper === lower) {
      previewNext.textContent = '';
      previewNext.style.opacity = '0';
    } else {
      previewNext.textContent = `${nextPage.name}: ${nextPage.teaser}`;
      previewNext.style.opacity = `${progress}`;
    }
  };

  const commitNavigation = () => {
    const targetIndex = Math.round(clampIndex(Number(input.value)));
    input.value = `${targetIndex}`;
    setVisualState(targetIndex);
    navigateWithTransition(pageFlow[targetIndex].href);
  };

  let wheelCommitTimer = null;
  const applyScroll = (delta) => {
    const current = Number(input.value);
    const next = clampIndex(current + delta);
    input.value = `${next}`;
    setVisualState(next);

    if (wheelCommitTimer) window.clearTimeout(wheelCommitTimer);
    wheelCommitTimer = window.setTimeout(() => {
      commitNavigation();
      wheelCommitTimer = null;
    }, 140);
  };

  const positionSteps = () => {
    const min = Number(input.min);
    const max = Number(input.max);
    const span = max - min || 1;
    const width = input.clientWidth;
    const railStyles = window.getComputedStyle(rail);
    const thumbSizeRaw = railStyles.getPropertyValue('--rail-thumb-size').trim();
    const thumbSize = Number.parseFloat(thumbSizeRaw) || 0;
    stepRow.style.width = `${width}px`;

    stepEls.forEach((stepEl, index) => {
      const ratio = (index - min) / span;
      const x = ratio * (width - thumbSize) + thumbSize / 2;
      stepEl.style.left = `${x}px`;
    });
  };

  input.addEventListener('input', () => {
    setVisualState(Number(input.value));
  });

  input.addEventListener('change', commitNavigation);
  input.addEventListener('pointerup', commitNavigation);
  input.addEventListener('pointercancel', commitNavigation);
  input.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
      commitNavigation();
    }
  });
  input.addEventListener('touchend', commitNavigation, { passive: true });

  track.addEventListener('wheel', (event) => {
    event.preventDefault();
    const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const direction = dominantDelta > 0 ? 1 : -1;
    const stepSize = Math.min(Math.abs(dominantDelta) / 240, 0.28);
    applyScroll(direction * stepSize);
  }, { passive: false });

  stepEls.forEach((stepEl) => {
    stepEl.addEventListener('click', () => {
      const nextIndex = Number(stepEl.dataset.step);
      input.value = `${nextIndex}`;
      setVisualState(nextIndex);
      navigateWithTransition(pageFlow[nextIndex].href);
    });
  });

  positionSteps();
  window.addEventListener('resize', positionSteps);
  setVisualState(currentIndex);
};

const setThemeAccent = (hue) => {
  const root = document.documentElement;
  root.style.setProperty('--theme-accent', `hsl(${hue} 88% 68%)`);
  root.style.setProperty('--theme-accent-strong', `hsl(${hue} 88% 60%)`);
  root.style.setProperty('--theme-accent-glow', `hsla(${hue} 88% 68% / 0.2)`);
  root.style.setProperty('--theme-color-wash', `hsla(${hue} 78% 62% / 0.12)`);
};

const applyThemeMode = (mode, hue = 215) => {
  const normalized = mode === 'light' || mode === 'random' ? mode : 'dark';
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-random');
  document.body.classList.add(`theme-${normalized}`);

  if (normalized === 'random') {
    setThemeAccent(hue);
    localStorage.setItem(THEME_HUE_KEY, String(hue));
  } else {
    setThemeAccent(215);
  }

  localStorage.setItem(THEME_MODE_KEY, normalized);
};

const initThemeControls = () => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const controls = document.createElement('div');
  controls.className = 'theme-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Theme');
  controls.innerHTML = `
    <button type="button" class="theme-btn" data-theme="dark">Dark</button>
    <button type="button" class="theme-btn" data-theme="light">Light</button>
    <button type="button" class="theme-btn" data-theme="random">Random</button>
  `;

  const storedMode = localStorage.getItem(THEME_MODE_KEY) || 'dark';
  const storedHue = Number(localStorage.getItem(THEME_HUE_KEY));
  const initialHue = Number.isFinite(storedHue) ? storedHue : Math.floor(Math.random() * 360);
  applyThemeMode(storedMode, initialHue);

  const buttons = Array.from(controls.querySelectorAll('.theme-btn'));
  const syncActive = (mode) => {
    buttons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.theme === mode);
    });
  };
  syncActive(storedMode);

  controls.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const mode = target.dataset.theme;
    if (!mode) return;

    if (mode === 'random') {
      const nextHue = Math.floor(Math.random() * 360);
      applyThemeMode('random', nextHue);
      syncActive('random');
      return;
    }

    applyThemeMode(mode);
    syncActive(mode);
  });

  header.appendChild(controls);
};

const initDigitalDesk = () => {
  const items = Array.from(document.querySelectorAll('.desk-item[data-desk-target]'));
  const panels = Array.from(document.querySelectorAll('.desk-panel[data-desk-panel]'));
  if (items.length === 0 || panels.length === 0) return;

  const showPanel = (target) => {
    items.forEach((item) => {
      const isActive = item.dataset.deskTarget === target;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.deskPanel === target;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
  };

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.deskTarget;
      if (target) showPanel(target);
    });
  });
};

const initContactMessaging = () => {
  const messageForm = document.querySelector('#contactMessageForm');
  if (!(messageForm instanceof HTMLFormElement)) return;

  const senderNameInput = document.querySelector('#senderName');
  const senderEmailInput = document.querySelector('#senderEmail');
  const senderMessageInput = document.querySelector('#senderMessage');
  const messageFormStatus = document.querySelector('#messageFormStatus');

  const ownerUnlockForm = document.querySelector('#ownerUnlockForm');
  const ownerPasswordInput = document.querySelector('#ownerPassword');
  const ownerUnlockStatus = document.querySelector('#ownerUnlockStatus');
  const ownerInbox = document.querySelector('#ownerInbox');
  const ownerMessageList = document.querySelector('#ownerMessageList');
  const ownerCount = document.querySelector('#ownerCount');
  const clearMessagesBtn = document.querySelector('#clearMessagesBtn');

  if (!(senderNameInput instanceof HTMLInputElement)) return;
  if (!(senderEmailInput instanceof HTMLInputElement)) return;
  if (!(senderMessageInput instanceof HTMLTextAreaElement)) return;
  if (!(messageFormStatus instanceof HTMLElement)) return;
  if (!(ownerUnlockForm instanceof HTMLFormElement)) return;
  if (!(ownerPasswordInput instanceof HTMLInputElement)) return;
  if (!(ownerUnlockStatus instanceof HTMLElement)) return;
  if (!(ownerInbox instanceof HTMLElement)) return;
  if (!(ownerMessageList instanceof HTMLElement)) return;
  if (!(ownerCount instanceof HTMLElement)) return;
  if (!(clearMessagesBtn instanceof HTMLButtonElement)) return;

  const STORAGE_KEY = 'contact_private_messages_v1';
  const OWNER_PASSWORD_HASH = '58fba6470e0253ba412e5d59d26f21de61448bc21323b342dc60bef0ca20f682';
  const OWNER_PASSWORD_FALLBACK = 'owner-access-2026';

  const loadMessages = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveMessages = (messages) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessages = () => {
    const messages = loadMessages();
    ownerCount.textContent = `${messages.length} message${messages.length === 1 ? '' : 's'}`;
    ownerMessageList.innerHTML = '';

    if (messages.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'owner-empty';
      empty.textContent = 'No messages yet.';
      ownerMessageList.appendChild(empty);
      return;
    }

    const sorted = [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sorted.forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'owner-message-item';

      const title = document.createElement('h3');
      title.textContent = entry.name || 'Anonymous';

      const meta = document.createElement('p');
      const emailText = entry.email ? ` | ${entry.email}` : '';
      meta.className = 'owner-meta';
      meta.textContent = `${formatTimestamp(entry.createdAt)}${emailText}`;

      const body = document.createElement('p');
      body.className = 'owner-body';
      body.textContent = entry.message || '';

      item.append(title, meta, body);
      ownerMessageList.appendChild(item);
    });
  };

  const sha256 = async (value) => {
    if (!window.crypto || !window.crypto.subtle) return '';
    const encoded = new TextEncoder().encode(value);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  messageForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = senderNameInput.value.trim();
    const email = senderEmailInput.value.trim();
    const message = senderMessageInput.value.trim();

    if (!name || !message) {
      messageFormStatus.textContent = 'Please add your name and a message.';
      return;
    }

    const messages = loadMessages();
    messages.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    });

    saveMessages(messages);
    messageForm.reset();
    messageFormStatus.textContent = 'Message sent. Thank you for reaching out.';
  });

  ownerUnlockForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    ownerUnlockStatus.textContent = '';

    const candidate = ownerPasswordInput.value;
    if (!candidate) {
      ownerUnlockStatus.textContent = 'Enter the owner password.';
      return;
    }

    const candidateHash = await sha256(candidate);
    const isValidPassword = candidateHash
      ? candidateHash === OWNER_PASSWORD_HASH
      : candidate === OWNER_PASSWORD_FALLBACK;

    if (!isValidPassword) {
      ownerInbox.hidden = true;
      ownerUnlockStatus.textContent = 'Incorrect password.';
      return;
    }

    ownerUnlockStatus.textContent = 'Inbox unlocked.';
    ownerInbox.hidden = false;
    renderMessages();
    ownerInbox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  clearMessagesBtn.addEventListener('click', () => {
    const confirmed = window.confirm('Delete all saved messages? This cannot be undone.');
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    renderMessages();
  });
};

window.requestAnimationFrame(() => {
  document.body.classList.add('page-ready');
});
initDigitalDesk();
initThemeControls();
initPageSlider();
initContactMessaging();