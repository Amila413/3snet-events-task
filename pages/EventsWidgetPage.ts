import { type Page, type Response, type FrameLocator } from '@playwright/test';

/**
 * Page Object for the 3SNET Events Widget Constructor page.
 * URL: https://dev.3snet.info/eventswidget/
 *
 * This page allows users to configure and generate an embeddable
 * events calendar widget for their own website.
 *
 * NOTE: All assertions belong in the test specs. This class only
 * provides navigation helpers, locators, and data-returning methods.
 */
export class EventsWidgetPage {
  readonly page: Page;

  // --- Locators ---
  // The main CTA button that triggers widget preview generation.
  // Located partway down the page — may require scrolling into view.
  readonly generatePreviewButton = () =>
    this.page.locator('button.green-bg').filter({ hasText: /Сгенерировать превью/ });

  // The iframe that embeds the live events widget preview.
  // The iframe is injected into the DOM dynamically after "Generate preview" is clicked.
  // ID is '3snet-frame' (confirmed by DOM inspection). Since the ID starts with a digit,
  // standard CSS #id syntax is invalid — the attribute selector form must be used.
  readonly widgetIframe = () =>
    this.page.locator('[id="3snet-frame"]');

  // The textarea containing the generated embed code snippet.
  // Note: use .inputValue() to read its text, not .textContent()
  readonly embedCodeTextarea = () =>
    this.page.locator('textarea');

  // The "Copy code" button — has a stable id='code-copy-button'
  readonly copyCodeButton = () =>
    this.page.locator('#code-copy-button');

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to the Events Widget constructor page.
   * Uses baseURL from playwright.config.ts + '/eventswidget/' path.
   * Returns the HTTP response so callers can assert the status code.
   */
  async goto(): Promise<Response | null> {
    return this.page.goto('/eventswidget/');
  }

  /**
   * Returns the FrameLocator for the embedded events widget iframe.
   * Use this to interact with or query content inside the widget.
   * Note: The iframe origin (3snet.info) is cross-origin from the constructor
   * page (dev.3snet.info), so Playwright cannot pierce its DOM security sandbox.
   */
  getWidgetFrame(): FrameLocator {
    return this.page.frameLocator('[id="3snet-frame"]');
  }

  /**
   * Clicks the "Generate preview" button to load the widget.
   * The button temporarily shows "Загрузка..." while the iframe loads.
   */
  async clickGeneratePreview(): Promise<void> {
    await this.generatePreviewButton().click();
  }

  /**
   * Returns the current value of the embed code textarea.
   * Uses inputValue() instead of textContent() since textarea content
   * is stored as a form control value, not as inner text.
   */
  async getEmbedCode(): Promise<string> {
    return this.embedCodeTextarea().inputValue();
  }

  /**
   * Saves a full-page screenshot to the test-results/screenshots directory.
   * This is a utility method — prefer `expect(page).toHaveScreenshot()` for
   * regression testing; use this only for non-comparative evidence capture.
   */
  async captureScreenshot(fileName: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${fileName}.png`,
      fullPage: true,
    });
  }
}