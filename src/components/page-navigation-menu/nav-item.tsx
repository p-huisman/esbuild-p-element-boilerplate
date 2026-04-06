import css from "./nav-item.css";

@CustomElementConfig({
    tagName: PageNavItemElement.TAG_NAME
})
export class PageNavItemElement extends CustomElement {
    static readonly TAG_NAME = "pggm-page-nav-item";
    static readonly style = css;

    @Property({ type: "string" })
    href: string = "#";

    @Property({ type: "boolean", reflect: true })
    active: boolean = false;

    render(): VNode {
        return (
            <a 
                href={this.href} 
                class={`item-link ${this.active ? 'active' : ''}`} 
                part="base"
            >
                <slot></slot>
            </a>
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        [PageNavItemElement.TAG_NAME]: PageNavItemElement;
    }
}
