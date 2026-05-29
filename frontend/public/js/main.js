'use strict';

const header = document.querySelector('.site-header');
if (header) {
  const onScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
      header.classList.remove('transparent');
    } else {
      header.classList.remove('scrolled');
      if (header.dataset.transparent) header.classList.add('transparent');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav  = document.querySelector('.mobile-nav');
if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menuToggle.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
}

const sidebarToggle = document.querySelector('.sidebar-toggle');
const sidebar = document.querySelector('.dashboard-sidebar');
const sidebarOverlay = document.querySelector('.sidebar-overlay');

if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay?.classList.toggle('open');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    sidebarOverlay.classList.remove('open');
    document.body.style.overflow = '';
  });
}

const animatedEls = document.querySelectorAll('.fade-up, .fade-in');
if (animatedEls.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -20px 0px' });

  animatedEls.forEach(el => observer.observe(el));

  setTimeout(() => {
    animatedEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add('visible');
      }
    });
  }, 100);
} else {
  animatedEls.forEach(el => el.classList.add('visible'));
}

document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

const flash = document.querySelector('.flash-message');
if (flash) {
  setTimeout(() => {
    flash.style.opacity = '0';
    flash.style.transform = 'translateY(-10px)';
    setTimeout(() => flash.remove(), 400);
  }, 5000);
}

document.querySelectorAll('.upload-zone').forEach(zone => {
  const input = zone.querySelector('input[type="file"]');

  zone.addEventListener('click', () => input?.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length && input) {
      input.files = files;
      updateFileDisplay(zone, files[0]);
    }
  });

  input?.addEventListener('change', () => {
    if (input.files[0]) updateFileDisplay(zone, input.files[0]);
  });

  function updateFileDisplay(zone, file) {
    const display = zone.querySelector('.upload-file-name');
    if (display) {
      display.textContent = file.name;
      display.style.display = 'block';
    }
    zone.querySelector('.upload-prompt')?.classList.add('hidden');
    zone.querySelector('.upload-success')?.classList.remove('hidden');
  }
});

document.querySelectorAll('form[data-validate]').forEach(form => {
  form.addEventListener('submit', e => {
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('error');
        valid = false;
      } else {
        field.classList.remove('error');
      }
    });

    const pass = form.querySelector('[name="password"]');
    const confirm = form.querySelector('[name="confirmPassword"]');
    if (pass && confirm && pass.value !== confirm.value) {
      confirm.classList.add('error');
      showFieldError(confirm, 'Passwords do not match');
      valid = false;
    }

    if (!valid) e.preventDefault();
  });

  form.querySelectorAll('.form-control').forEach(field => {
    field.addEventListener('input', () => field.classList.remove('error'));
  });
});

function showFieldError(field, message) {
  let err = field.parentElement.querySelector('.form-error');
  if (!err) {
    err = document.createElement('p');
    err.className = 'form-error';
    field.parentElement.appendChild(err);
  }
  err.textContent = message;
}

document.querySelectorAll('[data-status-update]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const url = btn.dataset.url;
    const status = btn.dataset.status;
    const note = document.querySelector('[data-note-field]')?.value || '';

    if (!confirm(`Update status to "${status}"?`)) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setTimeout(() => location.reload(), 1200);
      } else {
        showToast(data.error || 'Update failed', 'error');
        btn.disabled = false;
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
      btn.disabled = false;
    }
  });
});

document.querySelectorAll('[data-verify-payment]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const url = btn.dataset.url;
    const action = btn.dataset.action;
    let rejectionReason = '';

    if (action === 'reject') {
      rejectionReason = prompt('Reason for rejection:');
      if (!rejectionReason) return;
    }

    if (!confirm(`${action === 'verify' ? 'Verify' : 'Reject'} this payment?`)) return;

    btn.disabled = true;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setTimeout(() => location.reload(), 1200);
      } else {
        showToast(data.error || 'Failed', 'error');
        btn.disabled = false;
      }
    } catch {
      showToast('Network error', 'error');
      btn.disabled = false;
    }
  });
});

const issueOfferBtn = document.querySelector('[data-issue-offer]');
if (issueOfferBtn) {
  issueOfferBtn.addEventListener('click', async () => {
    const url = issueOfferBtn.dataset.url;
    const form = document.querySelector('#issue-offer-form');
    const data = form ? Object.fromEntries(new FormData(form)) : {};

    issueOfferBtn.disabled = true;
    issueOfferBtn.innerHTML = '<span class="spinner"></span> Issuing...';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        showToast('Offer letter issued!', 'success');
        closeModal('offer-modal');
        setTimeout(() => location.reload(), 1500);
      } else {
        showToast(result.error || 'Failed', 'error');
        issueOfferBtn.disabled = false;
        issueOfferBtn.textContent = 'Issue Offer';
      }
    } catch {
      showToast('Network error', 'error');
      issueOfferBtn.disabled = false;
    }
  });
}

function openModal(id) {
  const overlay = document.querySelector(`#${id}`);
  if (overlay) {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const overlay = document.querySelector(`#${id}`);
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

document.querySelectorAll('[data-open-modal]').forEach(btn => {
  btn.addEventListener('click', () => openModal(btn.dataset.openModal));
});

document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
});

function showToast(message, type = 'info') {
  const container = document.querySelector('#toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  document.body.appendChild(div);
  return div;
}

const refreshInterval = 12 * 60 * 1000;
if (document.querySelector('[data-authenticated]')) {
  setInterval(async () => {
    try {
      await fetch('/auth/refresh', { method: 'POST' });
    } catch {}
  }, refreshInterval);
}

document.querySelectorAll('[data-count]').forEach(el => {
  const target = parseInt(el.dataset.count);
  const duration = 1800;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString() + (el.dataset.suffix || '');
    if (progress < 1) requestAnimationFrame(update);
  };

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      requestAnimationFrame(update);
      observer.unobserve(el);
    }
  });
  observer.observe(el);
});

const countrySelect = document.querySelector('[name="country"]');
const phoneInput = document.querySelector('[name="phone"]');
if (countrySelect && phoneInput) {
  countrySelect.addEventListener('change', () => {
    phoneInput.placeholder = 'Enter your phone number';
  });
}

window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;