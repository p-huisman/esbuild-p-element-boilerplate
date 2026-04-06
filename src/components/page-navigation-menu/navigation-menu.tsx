import css from "./navigation-menu.css";

@CustomElementConfig({
    tagName: PageNavigationMenuElement.TAG_NAME
})
export class PageNavigationMenuElement extends CustomElement {
    static readonly TAG_NAME = "pggm-page-navigation-menu";
    static readonly style = css;

    private handleClose = () => {
        this.dispatchEvent(
            new CustomEvent("pageNavigationMenuClose", {
                bubbles: true,
                composed: true,
            })
        );
    };

    render(): VNode {
        return (
            <nav class="navigation-menu" part="base">
                <div class="header-container" part="header">
                    <slot name="header"></slot>
                    <button
                        class="close-button"
                        part="close-button"
                        aria-label="Close navigation"
                        onclick={this.handleClose}
                    >
                        <span style="font-family: 'Material Symbols Outlined', sans-serif; font-size: 1.25rem; line-height: 1;">
                            close
                        </span>
                    </button>
                </div>
                <slot></slot>
                <div class="actions-container"><slot name="actions"></slot>
                </div>
            </nav>
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        [PageNavigationMenuElement.TAG_NAME]: PageNavigationMenuElement;
    }
}
