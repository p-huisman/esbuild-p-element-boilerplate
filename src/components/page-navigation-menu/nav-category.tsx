import css from "./nav-category.css";

@CustomElementConfig({
    tagName: PageNavCategoryElement.TAG_NAME
})
export class PageNavCategoryElement extends CustomElement {
    static readonly TAG_NAME = "pggm-page-nav-category";
    static readonly style = css;

    @Property({ type: "string" })
    label: string = "";

    @Property({ type: "boolean", reflect: true })
    expanded: boolean = false;

    private toggleExpand = (event: Event) => {
        event.preventDefault();
        this.expanded = !this.expanded;
    };

    

    render(): VNode {
        return (
            <div class={`category-wrapper ${this.expanded ? "expanded" : ""}`} part="base">
                <a 
                    href="#"
                    role="button"
                    aria-expanded={this.expanded.toString()}
                    class="category-header" 
                    part="header"
                    onclick={this.toggleExpand}
                >
                    <span class="category-label" part="label">{this.label}</span>
                    <svg class="chevron" part="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </a>
                <div class="category-content" part="content">
                    <slot></slot>
                </div>
            </div>
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        [PageNavCategoryElement.TAG_NAME]: PageNavCategoryElement;
    }
}
