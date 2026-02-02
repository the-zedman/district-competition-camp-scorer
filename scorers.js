// Scorers management page functionality
document.addEventListener('DOMContentLoaded', function () {
  const apiBase = window.location.origin;
  const scorersLoading = document.getElementById('scorersLoading');
  const scorersError = document.getElementById('scorersError');
  const scorersListWrap = document.getElementById('scorersListWrap');
  const scorersTableBody = document.getElementById('scorersTableBody');
  const scorersForm = document.getElementById('scorersForm');
  const scorerId = document.getElementById('scorerId');
  const scorerScoutName = document.getElementById('scorerScoutName');
  const scorerRealName = document.getElementById('scorerRealName');
  const scorerScoutGroup = document.getElementById('scorerScoutGroup');
  const scorerPassword = document.getElementById('scorerPassword');
  const scorerSubmitBtn = document.getElementById('scorerSubmitBtn');
  const scorerCancelBtn = document.getElementById('scorerCancelBtn');
  const scorersFormTitle = document.getElementById('scorersFormTitle');

  if (!scorersForm) return; // Not on scorers page

  function showScorersError(msg) {
    scorersError.textContent = msg;
    scorersError.hidden = false;
  }

  function hideScorersError() {
    scorersError.hidden = true;
    scorersError.textContent = '';
  }

  function setScorersLoading(loading) {
    scorersLoading.hidden = !loading;
    if (loading) {
      scorersListWrap.hidden = true;
      hideScorersError();
    }
  }

  function renderScorersTable(scorers) {
    scorersTableBody.innerHTML = '';
    scorers.forEach((scorer) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td>${escapeHtml(scorer.scoutName)}</td>` +
        `<td>${escapeHtml(scorer.realName)}</td>` +
        `<td>${escapeHtml(scorer.scoutGroup)}</td>` +
        '<td class="th-actions">' +
        `<button type="button" class="btn btn-edit" data-id="${scorer.id}" data-action="edit">Edit</button>` +
        `<button type="button" class="btn btn-danger" data-id="${scorer.id}" data-action="delete">Remove</button>` +
        '</td>';
      scorersTableBody.appendChild(tr);
    });
    scorersListWrap.hidden = scorers.length === 0;
    scorersTableBody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', () => startEditScorer(parseInt(btn.dataset.id, 10)));
    });
    scorersTableBody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', () => removeScorer(parseInt(btn.dataset.id, 10)));
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function loadScorers() {
    setScorersLoading(true);
    fetch(`${apiBase}/api/scorers`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.message || d.error || res.statusText)));
        return res.json();
      })
      .then((scorers) => {
        setScorersLoading(false);
        renderScorersTable(scorers);
      })
      .catch((err) => {
        setScorersLoading(false);
        showScorersError(err.message || 'Failed to load scorers.');
      });
  }

  function resetScorersForm() {
    scorerId.value = '';
    scorerScoutName.value = '';
    scorerRealName.value = '';
    scorerScoutGroup.value = '';
    scorerPassword.value = '';
    scorerPassword.required = true;
    scorerSubmitBtn.textContent = 'Add scorer';
    scorersFormTitle.textContent = 'Add scorer';
    scorerCancelBtn.hidden = true;
  }

  function startEditScorer(id) {
    const btn = scorersTableBody.querySelector(`[data-id="${id}"][data-action="edit"]`);
    const row = btn && btn.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    scorerId.value = id;
    scorerScoutName.value = cells[0].textContent;
    scorerRealName.value = cells[1].textContent;
    scorerScoutGroup.value = cells[2].textContent;
    scorerPassword.value = '';
    scorerPassword.required = false; // Password optional when editing
    scorerSubmitBtn.textContent = 'Save changes';
    scorersFormTitle.textContent = 'Edit scorer';
    scorerCancelBtn.hidden = false;
  }

  function addOrUpdateScorer(payload) {
    const isEdit = payload.id !== '' && payload.id !== undefined;
    const url = `${apiBase}/api/scorers`;
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

  function removeScorer(id) {
    if (!confirm('Remove this scorer?')) return;
    fetch(`${apiBase}/api/scorers?id=${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.message || d.error || res.statusText)));
        return res.json();
      })
      .then((scorers) => {
        renderScorersTable(scorers);
        if (scorerId.value === String(id)) resetScorersForm();
      })
      .catch((err) => showScorersError(err.message || 'Failed to remove scorer.'));
  }

  scorersForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideScorersError();
    const scoutName = scorerScoutName.value.trim();
    const realName = scorerRealName.value.trim();
    const scoutGroup = scorerScoutGroup.value.trim();
    const password = scorerPassword.value.trim();
    if (!scoutName || !realName || !scoutGroup) {
      showScorersError('Please fill in Scout name, Real name, and Scout Group.');
      return;
    }
    const isEdit = scorerId.value !== '';
    if (!isEdit && !password) {
      showScorersError('Password is required when adding a new scorer.');
      return;
    }
    const payload = { scoutName, realName, scoutGroup };
    if (password) payload.password = password;
    if (isEdit) payload.id = scorerId.value;
    scorerSubmitBtn.disabled = true;
    addOrUpdateScorer(payload)
      .then((scorers) => {
        renderScorersTable(scorers);
        resetScorersForm();
        scorerSubmitBtn.disabled = false;
      })
      .catch((err) => {
        showScorersError(err.message || 'Failed to save scorer.');
        scorerSubmitBtn.disabled = false;
      });
  });

  scorerCancelBtn.addEventListener('click', resetScorersForm);

  loadScorers();
});
