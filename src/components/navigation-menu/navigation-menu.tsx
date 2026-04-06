import css from "./navigation-menu.css";

@CustomElementConfig({
    tagName: "pggm-navigation-menu"
})
export class NavigationMenuElement extends CustomElement {
    static readonly TAG_NAME = "pggm-navigation-menu";
    static readonly style = css;

    render(): VNode {
        return (
            <nav class="navigation-menu" part="base">
                <slot></slot>
            </nav>
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "pggm-navigation-menu": NavigationMenuElement;
    }
}
