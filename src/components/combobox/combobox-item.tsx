import { FocusGroupController } from "../../helpers/focus-group-controller";
import css from "./combobox-item.css";

@CustomElementConfig({
    tagName: "pggm-combobox-item"
})
export class ComboBoxItemElement extends CustomElement {
    static readonly TAG_NAME = "pggm-combobox-item";
    static readonly observedAttributes = ["disabled", "selected", "value"];

    static readonly style = css;

    @Property({ type: "boolean", reflect: true })
    disabled = false;

    @Property({ type: "boolean", reflect: true })
    selected = false;

    @Property({ type: "string" })
    value = "";

    connectedCallback(): void {
        super.connectedCallback();
        this.setAttribute("role", "option");
        this.setAttribute("tabindex", "-1");

        this.addEventListener("click", this.handleClick);
        this.addEventListener("keydown", this.handleKeyDown);
        this.addEventListener("mouseenter", this.handleMouseEnter);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener("click", this.handleClick);
        this.removeEventListener("keydown", this.handleKeyDown);
        this.removeEventListener("mouseenter", this.handleMouseEnter);
    }

    updated(propertyName: string, oldValue: unknown, newValue: unknown): void {
        if (propertyName === "selected") {
            this.setAttribute("aria-selected", this.selected ? "true" : "false");
        }
        if (propertyName === "disabled") {
            this.setAttribute("aria-disabled", this.disabled ? "true" : "false");
        }
    }

    @Bind
    private handleClick(event: MouseEvent): void {
        if (this.disabled) return;
        event.stopPropagation();
        this.selectItem();
    }

    @Bind
    private handleKeyDown(event: KeyboardEvent): void {
        if (this.disabled) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            this.selectItem();
        }
    }

    @Bind
    private handleMouseEnter(): void {
        if (this.disabled) return;
        this.dispatchEvent(new CustomEvent("itemHover", {
            bubbles: true,
            composed: true,
            detail: { item: this }
        }));
    }

    private selectItem() {
        this.dispatchEvent(
            new CustomEvent("itemSelect", {
                bubbles: true,
                composed: true,
                detail: { item: this },
            })
        );
    }

    getLabelText(): string {
        return this.textContent?.trim() || "";
    }

    render(): VNode {
        return (
            <div classes={{
                "combobox-item": true,
                "selected": this.selected,
                "disabled": this.disabled,
            }}>
                {this.selected && (
                    <span key="checkmark" class="checkmark">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </span>
                )}
                <span key="icon" class="icon">
                    <slot name="icon"></slot>
                </span>
                <span key="label" class="label">
                    <slot></slot>
                </span>
                <span key="details" class="details">
                    <slot name="details"></slot>
                </span>
            </div>
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "pggm-combobox-item": ComboBoxItemElement;
    }
}
