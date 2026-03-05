'use strict';

const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { default: open } = require('open');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Directories ─────────────────────────────────────────────────────────────
const UI_DATA_DIR = path.join(__dirname, '.ui-data');
const HISTORY_FILE = path.join(UI_DATA_DIR, 'history.json');
const REPORTS_DIR = path.join(UI_DATA_DIR, 'reports');
const PLAYWRIGHT_REPORT_DIR = path.join(__dirname, 'playwright-report');
const PLAYWRIGHT_JSON_REPORT = path.join(__dirname, 'test-results', 'report.json');

fs.mkdirSync(REPORTS_DIR, { recursive: true });
if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, '[]', 'utf8');
}

// ── In-memory concurrency flag ───────────────────────────────────────────────
let isRunning = false;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/reports', express.static(REPORTS_DIR, { index: 'index.html' }));

// ── Helpers ──────────────────────────────────────────────────────────────────
function readHistory() {
    try {
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function writeHistory(records) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(records, null, 2), 'utf8');
}

function parsePlaywrightReport() {
    try {
        const raw = JSON.parse(fs.readFileSync(PLAYWRIGHT_JSON_REPORT, 'utf8'));
        let passed = 0;
        let failed = 0;
        const countSpec = (specs) => {
            for (const spec of specs || []) {
                for (const test of spec.tests || []) {
                    const last = test.results?.[test.results.length - 1];
                    if (last) {
                        if (last.status === 'passed') passed++;
                        else failed++;
                    }
                }
            }
        };
        const walkSuite = (suite) => {
            countSpec(suite.specs);
            for (const child of suite.suites || []) walkSuite(child);
        };
        for (const suite of raw.suites || []) walkSuite(suite);
        const duration = typeof raw.stats?.duration === 'number'
            ? Math.round(raw.stats.duration / 100) / 10
            : null;
        return { passed, failed, duration };
    } catch {
        return null;
    }
}

function archiveReport(id) {
    if (!fs.existsSync(PLAYWRIGHT_REPORT_DIR)) return;
    const dest = path.join(REPORTS_DIR, id);
    fs.mkdirSync(dest, { recursive: true });
    copyDirSync(PLAYWRIGHT_REPORT_DIR, dest);
}

function copyDirSync(src, dest) {
    for (const entry of fs.readdirSync(src)) {
        const s = path.join(src, entry);
        const d = path.join(dest, entry);
        if (fs.statSync(s).isDirectory()) {
            fs.mkdirSync(d, { recursive: true });
            copyDirSync(s, d);
        } else {
            fs.copyFileSync(s, d);
        }
    }
}

/**
 * Build a Playwright --grep flag value from an array of selected test titles.
 * Escapes regex special characters in each name and joins with |.
 */
function buildGrepPattern(selectedTests) {
    if (!selectedTests || selectedTests.length === 0) return null;
    const escaped = selectedTests.map((t) =>
        t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );
    return escaped.join('|');
}

// ── API Routes ───────────────────────────────────────────────────────────────

app.get('/api/status', (_req, res) => {
    res.json({ running: isRunning });
});

app.get('/api/history', (_req, res) => {
    const history = readHistory();
    res.json(history.slice().reverse());
});

// POST /api/run
// Body: { selectedTests: string[] }  (empty array means "run all")
app.post('/api/run', (req, res) => {
    if (isRunning) {
        return res.status(409).json({ error: 'A run is already in progress.' });
    }

    isRunning = true;

    const { selectedTests } = req.body || {};
    const grepPattern = buildGrepPattern(selectedTests);

    const args = ['playwright', 'test', 'tests/eventsWidget.spec.ts', '--project=chromium'];
    if (grepPattern) {
        args.push('--grep', grepPattern);
    }

    const start = Date.now();
    const id = new Date().toISOString().replace(/[:.]/g, '-');

    execFile('npx', args, { cwd: __dirname }, (error, _stdout, _stderr) => {
        const elapsed = Math.round((Date.now() - start) / 100) / 10;
        const reportData = parsePlaywrightReport();

        const passed = reportData?.passed ?? (error ? 0 : '?');
        const failed = reportData?.failed ?? (error ? '?' : 0);
        const duration = reportData?.duration ?? elapsed;
        const status = failed === 0 && !error ? 'PASSED' : 'FAILED';

        archiveReport(id);

        const record = {
            id,
            timestamp: new Date().toISOString(),
            passed,
            failed,
            duration,
            status,
            selectedTests: selectedTests && selectedTests.length > 0 ? selectedTests : null,
            reportPath: `/api/reports/${id}/index.html`,
        };

        const history = readHistory();
        history.push(record);
        writeHistory(history);

        isRunning = false;
        res.json(record);
    });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  3SNET Test Runner  →  ${url}\n`);
    if (!process.env.CI && !process.env.NO_OPEN) {
        open(url).catch(() => { });
    }
});
