# 3SNET Events Widget — Automated Test Suite

Automated end-to-end tests for the [3SNET Events Widget Constructor](https://dev.3snet.info/eventswidget/) page, built with **Playwright** and **TypeScript**.

## Technology Stack

| Tool | Purpose |
|---|---|
| [Playwright](https://playwright.dev/) | Browser automation & test runner |
| TypeScript | Strongly typed test code |
| Page Object Model | Scalable test architecture |
| HTML + JSON Reporter | Visual and machine-readable test results |
| Express.js | Local web UI server |
| GitHub Actions | CI/CD pipeline |

---

## Project Structure

```
3snet-events-task/
├── pages/
│   ├── EventsWidgetPage.ts      # POM: constructor page (buttons, iframe, embed code)
│   └── EventsCalendarWidget.ts  # POM: standalone widget page content
├── tests/
│   └── eventsWidget.spec.ts     # Widget tests (2 suites, 13 tests)
├── public/
│   ├── index.html               # Web UI single-page frontend
│   ├── style.css                # Dark theme, responsive layout
│   └── app.js                   # Fetch-based state management
├── .github/
│   └── workflows/
│       └── playwright.yml       # GitHub Actions CI configuration
├── server.js                    # Express server — runs tests, stores history
├── playwright.config.ts         # Playwright configuration (baseURL, reporters)
├── tsconfig.json                # TypeScript compiler configuration
└── package.json                 # Dependencies and npm run scripts
```

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Amila413/3snet-events-task.git
cd 3snet-events-task

# 2. Install Node.js dependencies
npm install

# 3. Install Playwright browser binaries
npx playwright install chromium
```

## Running Tests

### Command Line

```bash
npm test                  # Run all tests
npm run report            # Open the HTML report
```

### Web UI (recommended)

```bash
npm run ui
```

Opens `http://localhost:3000` automatically. From there you can:
- **Run tests** with a single click
- **View results** — pass/fail counts, duration, and status per run
- **Browse history** — every run is saved; click **Report →** to open the full Playwright HTML report
- Works on desktop, tablet, and mobile browsers

**All commands:**

| Command | Description |
|---|---|
| `npm test` | Run all widget tests in the terminal |
| `npm run test:headed` | Run with a visible browser window |
| `npm run test:chromium` | Run the Chromium project only |
| `npm run report` | Open the last HTML report in the browser |
| `npm run ui` | Launch the web interface at `http://localhost:3000` |

---

## Test Coverage

### Widget Tests — `eventsWidget.spec.ts` (13 tests)

| # | Suite | Test | What it verifies |
|---|---|---|---|
| 1 | Constructor Page | Should respond with HTTP 200 | Page is reachable; HTTP response status is OK |
| 2 | Constructor Page | Should display the correct page title | `<title>` contains "3Snet" |
| 3 | Constructor Page | Should display the "Generate preview" button | Primary CTA is visible and interactable |
| 4 | Constructor Page | Should display the embed code textarea | Textarea with the embeddable iframe snippet is present |
| 5 | Constructor Page | Should display the "Copy code" button | Copy button (`#code-copy-button`) is visible |
| 6 | Constructor Page | Should have no critical JS errors on page load | No JavaScript errors emitted during load (Mixed Content warnings are excluded) |
| 7 | Constructor Page | Should render the embedded widget iframe after preview generation | Clicking "Generate preview" dynamically injects the iframe and it becomes visible |
| 8 | Widget Content | Should render at least one event | Widget contains real event data (count > 0) |
| 9 | Widget Content | Should display event links pointing to activity pages | All event `<a>` tags have valid `/activity/` hrefs |
| 10 | Widget Content | Should display interactive date trigger links | `.calendar-export-trigger` elements are present and visible |
| 11 | Widget Content | Should display topic tag filter links | Tag links (`event_type=`) are rendered |
| 12 | Widget Content | Should display location filter links | Country links (`event_country=`) are rendered |
| 13 | Widget Content | Should capture a visual screenshot of the widget | Full-page screenshot saved to `test-results/screenshots/` |

---

## Architecture Notes

The project uses the **Page Object Model (POM)** pattern with a clear separation of concerns:

- **`EventsWidgetPage`** — models the constructor page (`dev.3snet.info/eventswidget/`). Contains locators for page-level elements and navigation methods. Zero assertions.
- **`EventsCalendarWidget`** — models the standalone widget page (`3snet.info/widget-active-events/`). Widget content tests navigate here directly to bypass the cross-origin iframe restriction. Zero assertions.
- **Test specs** — the only place where `expect()` assertions are written. This makes POMs reusable across multiple test scenarios.

---

## Known Page Observations

The following non-standard behaviors were identified during exploratory testing:

- **Mixed Content warnings:** The constructor page (`https://dev.3snet.info`) loads event images over `http://` instead of `https://`. This generates browser Mixed Content warnings in the console. These are not JavaScript errors and are excluded from the JS error check (Test #5). This is a known upstream issue with image CDN configuration.
- **No `data-testid` attributes:** The widget does not use `data-testid` or `aria-label` attributes on event rows. Locators rely on stable URL-pattern attributes (`href*="/activity/"`, `href*="event_country="`) which are closely tied to the application's routing logic and should remain stable.
- **Cross-origin iframe:** The widget is embedded via an iframe injected dynamically after clicking "Generate preview". Because the iframe origin (`3snet.info`) differs from the constructor page origin (`dev.3snet.info`), Playwright cannot pierce the iframe DOM. Widget content tests therefore navigate directly to the standalone widget URL.