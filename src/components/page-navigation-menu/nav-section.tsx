import css from "./nav-section.css";

@CustomElementConfig({
    tagName: PageNavSectionElement.TAG_NAME
})
export class PageNavSectionElement extends CustomElement {
    static readonly TAG_NAME = "pggm-page-nav-section";
    static readonly style = css;

    @Property({ type: "string" })
    label: string = "";

    @Property({ type: "string" })
    icon: string = "";

    render(): VNode {
        return (
            <div class="section" part="base">
                <div class="section-header" part="header">
                    <slot name="icon">
                        {this.icon && (
                            <span class="material-symbols-outlined section-icon" part="icon">
                                {this.icon}
                            </span>
                        )}
                    </slot>
                    <slot name="label">
                        <span class="section-label" part="label">{this.label}</span>
                    </slot>
                </div>
                <div class="section-content" part="content">
                    <slot></slot>
                </div>
            </div>
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        [PageNavSectionElement.TAG_NAME]: PageNavSectionElement;
    }
}
