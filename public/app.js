// ── State ─────────────────────────────────────────────────────────────────────
let history = [];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const runBtn = document.getElementById('run-btn');
const progressBanner = document.getElementById('progress-banner');
const latestCard = document.getElementById('latest-card');
const historyTbody = document.getElementById('history-tbody');
const historyCards = document.getElementById('history-cards');
const emptyHistory = document.getElementById('empty-history');
const selectAll = document.getElementById('select-all');
const selectedCount = document.getElementById('selected-count');
const runHint = document.getElementById('run-hint');
const testCbs = Array.from(document.querySelectorAll('.test-cb'));

// ── Checkbox logic ────────────────────────────────────────────────────────────
function getSelectedTests() {
  return testCbs
    .filter((cb) => cb.checked)
    .map((cb) => cb.dataset.name);
}

function updateSelectAllState() {
  const checked = testCbs.filter((cb) => cb.checked).length;
  const total = testCbs.length;
  selectAll.indeterminate = checked > 0 && checked < total;
  selectAll.checked = checked === total;
  const hint = `${checked} of ${total} tests selected`;
  selectedCount.textContent = hint;
  runHint.textContent = hint;
  runBtn.disabled = checked === 0;
}

selectAll.addEventListener('change', () => {
  testCbs.forEach((cb) => { cb.checked = selectAll.checked; });
  updateSelectAllState();
});

testCbs.forEach((cb) => {
  cb.addEventListener('change', updateSelectAllState);
});

// Init checkbox UI state
updateSelectAllState();

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(s) {
  if (s == null) return '—';
  if (s >= 60) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  return `${s.toFixed(1)}s`;
}

function statusClass(status) {
  return status === 'PASSED' ? 'passed' : 'failed';
}

// ── Render: Latest Card ───────────────────────────────────────────────────────
function renderLatest(run) {
  if (!run) {
    latestCard.className = 'latest-card empty-state';
    latestCard.innerHTML = '<p class="empty-text">No runs yet. Select tests above and click <strong>Run Tests</strong>.</p>';
    return;
  }
  const cls = statusClass(run.status);
  const selectedNote = run.selectedTests
    ? `<span class="latest-date">(${run.selectedTests.length} of 13 tests selected)</span>`
    : '';
  latestCard.className = `latest-card ${cls}`;
  latestCard.innerHTML = `
    <div class="latest-meta">
      <span class="badge ${cls}">${run.status}</span>
      <span class="latest-date">${formatDate(run.timestamp)}</span>
      ${selectedNote}
    </div>
    <div class="latest-stats">
      <div class="stat-box pass">
        <span class="stat-value">${run.passed}</span>
        <span class="stat-label">Passed</span>
      </div>
      <div class="stat-box fail">
        <span class="stat-value">${run.failed}</span>
        <span class="stat-label">Failed</span>
      </div>
      <div class="stat-box time">
        <span class="stat-value">${formatDuration(run.duration)}</span>
        <span class="stat-label">Duration</span>
      </div>
    </div>
    <div class="latest-footer">
      <a class="report-link" href="${run.reportPath}" target="_blank" rel="noopener">View Full Report →</a>
    </div>
  `;
}

// ── Render: History ───────────────────────────────────────────────────────────
function renderHistory(runs) {
  const hasRuns = runs.length > 0;
  emptyHistory.style.display = hasRuns ? 'none' : 'block';
  historyTbody.innerHTML = '';
  historyCards.innerHTML = '';

  runs.forEach((run, idx) => {
    const num = runs.length - idx;
    const cls = statusClass(run.status);

    // Desktop row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${num}</td>
      <td>${formatDate(run.timestamp)}</td>
      <td class="pass-count">${run.passed}</td>
      <td class="fail-count">${run.failed}</td>
      <td class="duration-val">${formatDuration(run.duration)}</td>
      <td><span class="badge ${cls}">${run.status}</span></td>
      <td><a href="${run.reportPath}" target="_blank" rel="noopener">Report →</a></td>
    `;
    historyTbody.appendChild(tr);

    // Mobile card
    const li = document.createElement('li');
    li.className = `hcard ${cls}`;
    li.innerHTML = `
      <span class="hcard-num">Run #${num}</span>
      <span class="hcard-date">${formatDate(run.timestamp)}</span>
      <span class="hcard-stats">
        <span class="pass-count">✅ ${run.passed}</span>&nbsp;
        <span class="fail-count">❌ ${run.failed}</span>&nbsp;
        ⏱ ${formatDuration(run.duration)}
      </span>
      <div class="hcard-footer">
        <span class="badge ${cls}">${run.status}</span>
        <a href="${run.reportPath}" target="_blank" rel="noopener" class="report-link">Report →</a>
      </div>
    `;
    historyCards.appendChild(li);
  });
}

// ── Load history on start ─────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    history = await res.json();
    renderLatest(history[0] ?? null);
    renderHistory(history);
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

// ── Run Tests ─────────────────────────────────────────────────────────────────
runBtn.addEventListener('click', async () => {
  if (runBtn.disabled) return;

  const selectedTests = getSelectedTests();
  if (selectedTests.length === 0) {
    alert('Please select at least one test to run.');
    return;
  }

  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span class="btn-label">Running…</span>';
  progressBanner.classList.remove('hidden');

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedTests }),
    });

    if (res.status === 409) {
      alert('A test run is already in progress. Please wait.');
      return;
    }

    const record = await res.json();
    history.unshift(record);
    renderLatest(history[0]);
    renderHistory(history);
  } catch (err) {
    console.error('Run failed:', err);
    alert('An error occurred while running the tests. Check the server logs.');
  } finally {
    progressBanner.classList.add('hidden');
    runBtn.disabled = false;
    runBtn.innerHTML = '<span class="btn-icon" aria-hidden="true">▶</span><span class="btn-label">Run Tests</span>';
    updateSelectAllState(); // restore disabled state based on selection
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadHistory();
