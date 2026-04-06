import css from "./page.css";

@CustomElementConfig({
    tagName: "pggm-page"
})
/**
 * `<pggm-page>` — A layout component following 'The Sustainable Architect' design system.
 *
 * @element pggm-page
 *
 * @slot (default) - The page's main content area.
 * @slot banner     - Displayed at the very top, above the header.
 * @slot header     - The top header of the page (appears below the banner).
 * @slot subheader  - Displayed below the header (ideal for breadcrumbs).
 * @slot navigation - Content for the left side of the page. Sticks to the top on scroll.
 * @slot menu       - Content for the left side of the page. Overrides the default `navigation` slot and disables automatic navigation handling.
 * @slot main-header - Inline header displayed directly above the main content.
 * @slot main-footer - Inline footer displayed directly below the main content.
 * @slot aside      - Content on the right side (e.g., table of contents, ads). Sticks to the top on scroll.
 * @slot footer     - The main page footer, always displayed at the bottom of the content.
 *
 * @attr {boolean} nav-open - Controls the visibility of the mobile navigation drawer.
 * @attr {string} mobile-breakpoint - Viewport width at which navigation collapses (default: '768px').
 */
export class PageElement extends CustomElement {
    static readonly TAG_NAME = "pggm-page";
    static readonly style = css;

    /** Controls whether the mobile navigation drawer is open. */
    @Property({ attribute: "nav-open", type: "boolean", reflect: true })
    navOpen = false;

    /** Mobile breakpoint where navigation becomes a drawer. */
    @Property({ attribute: "mobile-breakpoint", type: "string" })
    mobileBreakpoint = "768px";

    connectedCallback(): void {
        super.connectedCallback();
        this.updateViewMode();
        window.addEventListener("resize", this.handleResize);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        window.removeEventListener("resize", this.handleResize);
    }

    @Bind
    private handleResize() {
        this.updateViewMode();
    }

    private updateViewMode() {
        const mq = window.matchMedia(`(max-width: ${this.mobileBreakpoint})`);
        if (mq.matches) {
            this.setAttribute("view", "mobile");
        } else {
            this.setAttribute("view", "desktop");
            if (this.navOpen) this.navOpen = false;
        }
        if (!this.isMobile && this.navOpen) {
            this.navOpen = false;
        }
        this.scheduleRender();
    }

    /** Opens the mobile navigation drawer. */
    public showNavigation() {
        this.navOpen = true;
    }

    /** Closes the mobile navigation drawer. */
    public hideNavigation() {
        this.navOpen = false;
    }

    /** Toggles the mobile navigation drawer. */
    public toggleNavigation() {
        this.navOpen = !this.navOpen;
    }

    get isMobile() {
        return this.getAttribute("view") === "mobile";
    }

    render(): VNode {

        return (
            <div class="base">
                <div class="banner" part="banner">
                    <slot name="banner"></slot>
                </div>

                <header class="header" part="header">
                    <slot name="header"></slot>
                </header>

                <div class="subheader" part="subheader">
                    <slot name="subheader"></slot>
                </div>

                <div class="body" part="body">
                    <nav class="navigation" part="navigation">
                        {!this.isMobile && <slot name="navigation" key="nav-desktop"></slot>}
                        {!this.isMobile && <slot name="menu" key="menu-desktop"></slot>}
                    </nav>

                    <div class="main-container" part="main-container">
                        <div class="main-header" part="main-header">
                            <slot name="main-header"></slot>
                        </div>

                        <main class="main" part="main">
                            <slot></slot>
                        </main>

                        <div class="main-footer" part="main-footer">
                            <slot name="main-footer"></slot>
                        </div>
                    </div>

                    <aside class="aside" part="aside">
                        <slot name="aside"></slot>
                    </aside>
                </div>

                <footer class="footer" part="footer">
                    <slot name="footer"></slot>
                </footer>

                {/* Mobile Drawer */}
                <div
                    class="navigation-drawer"
                    data-open={this.navOpen ? "true" : "false"}
                    part="navigation-drawer"
                >
                    <div class="drawer-header">
                        <slot name="navigation-header"></slot>
                    </div>
                    <div class="drawer-body" part="drawer-body">
                        {this.isMobile && <slot name="navigation" key="nav-mobile"></slot>}
                        {this.isMobile && <slot name="menu" key="menu-mobile"></slot>}
                    </div>
                    <div class="drawer-footer">
                        <slot name="navigation-footer"></slot>
                    </div>
                </div>
            </div>
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "pggm-page": PageElement;
    }
}
