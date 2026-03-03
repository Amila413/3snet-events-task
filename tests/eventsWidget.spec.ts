import { test, expect } from '@playwright/test';
import { EventsWidgetPage } from '../pages/EventsWidgetPage';
import { EventsCalendarWidget } from '../pages/EventsCalendarWidget';

/**
 * Test suite for the 3SNET Events Widget.
 * Covers two distinct URLs:
 *  1. Constructor page: https://dev.3snet.info/eventswidget/
 *     - Config form, theme selection, embed code generation
 *  2. Standalone widget: https://3snet.info/widget-active-events/
 *     - Live event data, calendar rows, interactive filters
 *
 * NOTE on cross-origin iframe: The constructor page embeds the widget in an
 * iframe across origins (dev.3snet.info → 3snet.info). Playwright cannot
 * pierce cross-origin iframes. Widget content is therefore tested by
 * navigating directly to the standalone widget URL.
 *
 * Known page observation: The constructor page generates Mixed Content
 * warnings (HTTP image URLs on an HTTPS page). These are documented but
 * excluded from the JS error assertion — they are not JavaScript errors.
 */

// ---------------------------------------------------------------------------
// Suite 1: Constructor Page — Basic Health Checks
// ---------------------------------------------------------------------------
test.describe('Constructor Page — Basic Health Checks', () => {
  let eventsPage: EventsWidgetPage;

  test.beforeEach(async ({ page }) => {
    eventsPage = new EventsWidgetPage(page);
    await eventsPage.goto();
  });

  test('should respond with HTTP 200', async ({ page }) => {
    // Navigate fresh and assert the HTTP response status.
    const response = await page.goto('/eventswidget/');
    expect(response?.status()).toBe(200);
  });

  test('should display the correct page title', async ({ page }) => {
    // Web-first assertion — Playwright auto-retries until the title matches.
    await expect(page).toHaveTitle(/3Snet/i);
  });

  test('should display the "Generate preview" button', async () => {
    // The primary CTA must be present and visible for the page to be functional.
    await expect(eventsPage.generatePreviewButton()).toBeVisible();
  });

  test('should display the embed code textarea', async () => {
    // The embed snippet textarea must be available so users can copy the widget code.
    await expect(eventsPage.embedCodeTextarea()).toBeVisible();
  });

  test('should display the "Copy code" button', async () => {
    // The stable id '#code-copy-button' ensures this selector survives text changes.
    await expect(eventsPage.copyCodeButton()).toBeVisible();
  });

  test('should have no critical JS errors on page load', async ({ page }) => {
    const jsErrors: string[] = [];

    // Register listeners BEFORE navigation to capture all events from the start.
    // Attaching after goto() creates a race condition and misses early errors.
    page.on('pageerror', (error) => jsErrors.push(error.message));
    page.on('console', (msg) => {
      // Exclude known Mixed Content browser warnings — these are a documented
      // upstream issue (HTTP images on HTTPS origin) and are not JS errors.
      if (msg.type() === 'error' && !msg.text().includes('Mixed Content')) {
        jsErrors.push(msg.text());
      }
    });

    await page.goto('/eventswidget/');

    expect(
      jsErrors,
      `Unexpected JS errors found on page load:\n${jsErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  test('should render the embedded widget iframe element after preview generation', async () => {
    // The iframe only appears after the user clicks "Generate preview".
    // The button temporarily shows "Загрузка..." while the iframe loads.
    test.setTimeout(45000);
    await eventsPage.clickGeneratePreview();
    // Wait for the iframe to become visible — it loads asynchronously.
    await expect(eventsPage.widgetIframe()).toBeVisible({ timeout: 30000 });
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Widget Content — Standalone URL Verification
// ---------------------------------------------------------------------------
test.describe('Widget Content — Live Data Verification', () => {
  // The standalone widget URL can be slow to fully render; increase timeout.
  test.describe.configure({ timeout: 60000 });

  let widget: EventsCalendarWidget;

  test.beforeEach(async ({ page }) => {
    widget = new EventsCalendarWidget(page);
    // Navigate directly to the standalone widget URL to bypass cross-origin restriction.
    await widget.goto();
  });

  test('should render at least one event', async () => {
    // The widget must contain real event data.
    // An empty widget signals a data feed or API failure.
    const count = await widget.getEventCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should display event links pointing to activity pages', async () => {
    // Every event link must point to a /activity/ detail page.
    // A wrong href pattern indicates a broken DOM structure.
    const hrefs = await widget.getAllEventHrefs();
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toMatch(/\/activity\//);
    }
  });

  test('should display interactive date trigger links', async () => {
    // Date links allow users to export events to personal calendars.
    const count = await widget.dateTriggers().count();
    expect(count).toBeGreaterThan(0);
    await expect(widget.dateTriggers().first()).toBeVisible();
  });

  test('should display topic tag filter links', async () => {
    // Tags (#Affiliate, #iGaming) are clickable filters for navigating events by topic.
    const count = await widget.tagLinks().count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display location filter links', async () => {
    // Country links allow filtering by event location.
    const count = await widget.locationLinks().count();
    expect(count).toBeGreaterThan(0);
  });

  test('should capture a visual screenshot of the widget', async ({ page }) => {
    // Verify events are loaded, then save a full-page screenshot as evidence.
    const count = await widget.getEventCount();
    expect(count, 'Widget must be loaded before taking a screenshot').toBeGreaterThan(0);
    await page.screenshot({
      path: 'test-results/screenshots/events-widget-loaded.png',
      fullPage: true,
    });
  });
});