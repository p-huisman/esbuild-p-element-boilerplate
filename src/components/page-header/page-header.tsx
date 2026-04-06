import css from "./page-header.css";

/**
 * `<pggm-page-header>` — Global Application Experience header bar for PGGM applications.
 *
 * Provides a consistent top-level header with a brand/title area, search slot,
 * icon action buttons, and a user profile area.
 *
 * @element pggm-page-header
 *
 * @attr {string}  heading      - Application title displayed when the `brand` slot is empty.
 * @attr {boolean} show-divider - Show a vertical divider between actions and profile. Defaults to true.
 *
 * @slot brand   - Logo or branded content on the left. When filled, the `heading` attribute is hidden.
 * @slot search  - Search input field placed to the right of the brand area.
 * @slot actions - Icon buttons (e.g. notifications, help) to the left of the profile area.
 * @slot profile - User avatar / profile summary on the far right.
 * @slot menu-toggle - Override the default hamburger button for mobile navigation.
 *
 * @fires navigationMenuToggle - Dispatched when the mobile menu button is clicked.
 *                                 `detail: { open: boolean }` — current open state after the toggle.
 */
@CustomElementConfig({
    tagName: PageHeaderElement.TAG_NAME,
})
export class PageHeaderElement extends CustomElement {
    static readonly TAG_NAME = "pggm-page-header";
    static readonly style = css;

    /** Application title shown when the `brand` slot is not used. */
    @Property({ type: "string", reflect: true })
    heading = "";

    /** Show a divider between the actions and profile areas. */
    @Property({ attribute: "show-divider", type: "boolean", reflect: true })
    showDivider = true;

    /** Tracks whether the mobile navigation is currently open. */
    @Property({ attribute: "menu-open", type: "boolean", reflect: true })
    menuOpen = false;

    private handleMenuToggle = () => {
        this.menuOpen = !this.menuOpen;
        this.dispatchEvent(
            new CustomEvent("pageNavigationMenuToggle", {
                bubbles: true,
                composed: true,
                detail: { open: this.menuOpen },
            })
        );
    };

    render(): VNode {
        return (
            <div class="base" part="base">

                {/* Mobile hamburger */}
                <button
                    class="menu-toggle"
                    part="menu-toggle"
                    aria-label="Toggle navigation menu"
                    onclick={this.handleMenuToggle}
                >
                    <slot name="menu-toggle">
                        <span style="font-size: 1.5rem; font-family: 'Material Symbols Outlined', sans-serif;">
                            menu
                        </span>
                    </slot>
                </button>

                {/* Left: brand + search */}
                <div class="start" part="start">
                    <div class="brand" part="brand">
                        <slot name="brand">
                            {this.heading && <span class="heading">{this.heading}</span>}
                        </slot>
                    </div>

                    <div class="search" part="search">
                        <slot name="search"></slot>
                    </div>
                </div>

                {/* Right: actions + optional divider + profile */}
                <div class="end" part="end">
                    <div class="actions" part="actions">
                        <slot name="actions"></slot>
                    </div>

                    {this.showDivider && <div class="divider" part="divider"></div>}

                    <div class="profile" part="profile">
                        <slot name="profile"></slot>
                    </div>
                </div>
            </div>
        );
    }

}

declare global {
    interface HTMLElementTagNameMap {
        [PageHeaderElement.TAG_NAME]: PageHeaderElement;
    }
}
