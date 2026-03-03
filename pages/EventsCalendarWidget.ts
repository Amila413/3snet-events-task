import { type Page } from '@playwright/test';

/**
 * Page Object for the 3SNET live Events Calendar Widget.
 * Standalone URL: https://3snet.info/widget-active-events/
 *
 * The widget is a scrollable list of affiliate industry events grouped
 * by month. Each row contains the event name (link), date range,
 * location, price category, and topic tags.
 *
 * This POM is used by navigating directly to the widget URL, bypassing
 * the constructor-page iframe (which is cross-origin and cannot be
 * inspected by Playwright).
 *
 * NOTE: Assertions belong in the test specs.
 * This class provides locators and data-returning methods only.
 */
export class EventsCalendarWidget {
    readonly page: Page;

    // Default widget URL with a known-good configuration for testing.
    static readonly WIDGET_URL =
        'https://3snet.info/widget-active-events/?theme=turquoise&event_group=10622&event_type=&event_country=';

    // --- Locators ---
    // Direct links to event detail pages — the primary event items.
    readonly eventLinks = () =>
        this.page.locator('a[href*="/activity/"]');

    // Clickable date ranges that open a calendar export dialog.
    readonly dateTriggers = () =>
        this.page.locator('a.calendar-export-trigger');

    // "Recommended by 3SNET" badge links on featured events.
    readonly recommendedBadges = () =>
        this.page.locator('a[href*="event_favorite=1"]');

    // Clickable topic tags (e.g., #Affiliate, #iGaming).
    readonly tagLinks = () =>
        this.page.locator('a[href*="event_type="]');

    // Country/location filter links on each event row.
    readonly locationLinks = () =>
        this.page.locator('a[href*="event_country="]');

    // Price category filter links (e.g., Free, Paid).
    readonly priceLabels = () =>
        this.page.locator('a[href*="event_price="]');

    constructor(page: Page) {
        this.page = page;
    }

    /** Navigates directly to the widget standalone URL. */
    async goto(): Promise<void> {
        await this.page.goto(EventsCalendarWidget.WIDGET_URL);
    }

    /** Returns the count of event links currently rendered in the widget. */
    async getEventCount(): Promise<number> {
        return this.eventLinks().count();
    }

    /** Returns the text content of the first event link (event title). */
    async getFirstEventTitle(): Promise<string | null> {
        return this.eventLinks().first().textContent();
    }

    /**
     * Returns an array of href attribute values for all rendered event links.
     * Useful for verifying that links point to valid activity pages.
     */
    async getAllEventHrefs(): Promise<string[]> {
        const hrefs: string[] = [];
        const count = await this.eventLinks().count();
        for (let i = 0; i < count; i++) {
            const href = await this.eventLinks().nth(i).getAttribute('href');
            if (href) hrefs.push(href);
        }
        return hrefs;
    }
}
