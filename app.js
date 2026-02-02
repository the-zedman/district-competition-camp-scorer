// Blue Mountains District Competition Camp Scorer
// Scoring logic and UI will be extended here.

document.addEventListener('DOMContentLoaded', function () {
  console.log('Competition Camp Scorer loaded.');

  // Burger menu toggle
  const burgerMenu = document.getElementById('burgerMenu');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  burgerMenu.addEventListener('click', function () {
    burgerMenu.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close menu when clicking a link (mobile)
  navLinks.forEach(link => {
    link.addEventListener('click', function () {
      if (window.innerWidth < 768) {
        burgerMenu.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  });

  // Smooth scroll to sections
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // ----- Admins (Settings) -----
  const apiBase = window.location.origin;
  const adminsLoading = document.getElementById('adminsLoading');
  const adminsError = document.getElementById('adminsError');
  const adminsListWrap = document.getElementById('adminsListWrap');
  const adminsTableBody = document.getElementById('adminsTableBody');
  const adminsForm = document.getElementById('adminsForm');
  const adminId = document.getElementById('adminId');
  const adminScoutName = document.getElementById('adminScoutName');
  const adminRealName = document.getElementById('adminRealName');
  const adminScoutGroup = document.getElementById('adminScoutGroup');
  const adminSubmitBtn = document.getElementById('adminSubmitBtn');
  const adminCancelBtn = document.getElementById('adminCancelBtn');
  const adminsFormTitle = document.getElementById('adminsFormTitle');

  function showAdminsError(msg) {
    adminsError.textContent = msg;
    adminsError.hidden = false;
  }

  function hideAdminsError() {
    adminsError.hidden = true;
    adminsError.textContent = '';
  }

  function setAdminsLoading(loading) {
    adminsLoading.hidden = !loading;
    if (loading) {
      adminsListWrap.hidden = true;
      hideAdminsError();
    }
  }

  function renderAdminsTable(admins) {
    adminsTableBody.innerHTML = '';
    admins.forEach((admin) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td>${escapeHtml(admin.scoutName)}</td>` +
        `<td>${escapeHtml(admin.realName)}</td>` +
        `<td>${escapeHtml(admin.scoutGroup)}</td>` +
        '<td class="th-actions">' +
        `<button type="button" class="btn btn-edit" data-id="${admin.id}" data-action="edit">Edit</button>` +
        `<button type="button" class="btn btn-danger" data-id="${admin.id}" data-action="delete">Remove</button>` +
        '</td>';
      adminsTableBody.appendChild(tr);
    });
    adminsListWrap.hidden = admins.length === 0;
    adminsTableBody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', () => startEditAdmin(parseInt(btn.dataset.id, 10)));
    });
    adminsTableBody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', () => removeAdmin(parseInt(btn.dataset.id, 10)));
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function loadAdmins() {
    setAdminsLoading(true);
    fetch(`${apiBase}/api/admins`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.message || d.error || res.statusText)));
        return res.json();
      })
      .then((admins) => {
        setAdminsLoading(false);
        renderAdminsTable(admins);
      })
      .catch((err) => {
        setAdminsLoading(false);
        showAdminsError(err.message || 'Failed to load admins.');
      });
  }

  function resetAdminsForm() {
    adminId.value = '';
    adminScoutName.value = '';
    adminRealName.value = '';
    adminScoutGroup.value = '';
    adminSubmitBtn.textContent = 'Add admin';
    adminsFormTitle.textContent = 'Add admin';
    adminCancelBtn.hidden = true;
  }

  function startEditAdmin(id) {
    const btn = adminsTableBody.querySelector(`[data-id="${id}"][data-action="edit"]`);
    const row = btn && btn.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    adminId.value = id;
    adminScoutName.value = cells[0].textContent;
    adminRealName.value = cells[1].textContent;
    adminScoutGroup.value = cells[2].textContent;
    adminSubmitBtn.textContent = 'Save changes';
    adminsFormTitle.textContent = 'Edit admin';
    adminCancelBtn.hidden = false;
  }

  function addOrUpdateAdmin(payload) {
    const isEdit = payload.id !== '' && payload.id !== undefined;
    const url = `${apiBase}/api/admins`;
    const options = {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? { id: parseInt(payload.id, 10), scoutName: payload.scoutName, realName: payload.realName, scoutGroup: payload.scoutGroup } : payload),
    };
    return fetch(url, options).then((res) => {
      if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.message || d.error || res.statusText)));
      return res.json();
    });
  }

  function removeAdmin(id) {
    if (!confirm('Remove this admin?')) return;
    fetch(`${apiBase}/api/admins?id=${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.message || d.error || res.statusText)));
        return res.json();
      })
      .then((admins) => {
        renderAdminsTable(admins);
        if (adminId.value === String(id)) resetAdminsForm();
      })
      .catch((err) => showAdminsError(err.message || 'Failed to remove admin.'));
  }

  adminsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideAdminsError();
    const scoutName = adminScoutName.value.trim();
    const realName = adminRealName.value.trim();
    const scoutGroup = adminScoutGroup.value.trim();
    if (!scoutName || !realName || !scoutGroup) {
      showAdminsError('Please fill in Scout name, Real name, and Scout Group.');
      return;
    }
    const payload = { scoutName, realName, scoutGroup };
    if (adminId.value !== '') payload.id = adminId.value;
    adminSubmitBtn.disabled = true;
    addOrUpdateAdmin(payload)
      .then((admins) => {
        renderAdminsTable(admins);
        resetAdminsForm();
        adminSubmitBtn.disabled = false;
      })
      .catch((err) => {
        showAdminsError(err.message || 'Failed to save admin.');
        adminSubmitBtn.disabled = false;
      });
  });

  adminCancelBtn.addEventListener('click', resetAdminsForm);

  loadAdmins();
});
