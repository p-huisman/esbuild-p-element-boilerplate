import css from "./navigation-menu.css";

@CustomElementConfig({
    tagName: PageNavigationMenuElement.TAG_NAME
})
export class PageNavigationMenuElement extends CustomElement {
    static readonly TAG_NAME = "pggm-page-navigation-menu";
    static readonly style = css;

    render(): VNode {
        return (
            <nav class="navigation-menu" part="base">
                <slot name="header"></slot>
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
