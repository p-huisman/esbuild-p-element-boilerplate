import { FocusGroupController } from "../../helpers/focus-group-controller";
import css from "./combobox-item.css";

@CustomElementConfig({
    tagName: "pggm-combobox-item"
})
/**
 * `<pggm-combobox-item>` — A single selectable option inside a `<pggm-combobox>`.
 *
 * @element pggm-combobox-item
 *
 * @slot         - The label text shown in the dropdown and in the selected tag.
 * @slot icon    - Optional icon shown to the left of the label.
 * @slot details - Optional secondary text shown to the right of the label.
 *                 Content in this slot is intentionally excluded from the tag label.
 *
 * @fires itemSelect - Bubbles up when the item is activated (click or Enter/Space).
 * @fires itemHover  - Bubbles up when the pointer enters the item.
 *
 * @attr {boolean} disabled - Prevents the item from being selected.
 * @attr {boolean} selected - Reflects whether this item is currently selected.
 * @attr {string}  value    - The value submitted to the form / stored in the combobox.
 *                            Defaults to the trimmed default-slot text when omitted.
 */
export class ComboBoxItemElement extends CustomElement {
    static readonly TAG_NAME = "pggm-combobox-item";
    static readonly observedAttributes = ["disabled", "selected", "value"];

    static readonly style = css;

    /** When `true`, the item cannot be focused or selected. */
    @Property({ type: "boolean", reflect: true })
    disabled = false;

    /** When `true`, the item is visually marked as selected and carries `aria-selected="true"`. */
    @Property({ type: "boolean", reflect: true })
    selected = false;

    /**
     * The value that is stored in the parent combobox when this item is selected.
     * Falls back to the trimmed default-slot text when left empty.
     */
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

    /**
     * Returns the visible label text of this item, derived solely from the
     * default (unnamed) slot. Named-slot content (e.g. `slot="details"`) is
     * intentionally excluded so that tags and `inputValue` only reflect the
     * primary label.
     */
    getLabelText(): string {
        // Only collect text from nodes assigned to the default (unnamed) slot,
        // excluding named slots such as "detail".
        const defaultSlotNodes = Array.from(this.childNodes).filter(
            node => !(node instanceof Element && node.hasAttribute("slot"))
        );
        return defaultSlotNodes.map(n => n.textContent).join("").trim() || "";
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
