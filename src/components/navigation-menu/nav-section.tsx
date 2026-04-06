import css from "./nav-section.css";

@CustomElementConfig({
    tagName: "pggm-nav-section"
})
export class NavSectionElement extends CustomElement {
    static readonly TAG_NAME = "pggm-nav-section";
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
        "pggm-nav-section": NavSectionElement;
    }
}
