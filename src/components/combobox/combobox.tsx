import { FocusGroupController } from "../../helpers/focus-group-controller";
import { PopupController } from "../../helpers/popup-controller";
import css from "./combobox.css";

import { ComboBoxItemElement } from "./combobox-item";
export { ComboBoxItemElement } from "./combobox-item";

@CustomElementConfig({
    tagName: "pggm-combobox",
})
export class ComboBoxElement extends CustomElement {
    static readonly TAG_NAME = "pggm-combobox";
    static readonly style = css;
    static readonly formAssociated = true;

    private popupController?: PopupController;

    @Property({ type: "boolean", reflect: true })
    open = false;

    @Property({ type: "boolean", reflect: true })
    disabled = false;

    @Property({ type: "boolean", reflect: true })
    multiple = false;

    @Property({ type: "string", reflect: true })
    name = "";

    @Property({ attribute: "with-clear", type: "boolean", reflect: true })
    withClear = false;

    @Property({ attribute: "visible-items", type: "number" })
    visibleItems?: number;

    @Property({ type: "string" })
    placeholder = "";

    @Property()
    value: string | string[] = "";

    @Property({ type: "string" })
    inputValue = "";

    @Query("#text-box")
    private readonly textBox?: HTMLInputElement;

    @Query("#dropdown")
    private readonly dropdown?: HTMLDivElement;

    @Query("#visual-box")
    private readonly visualBox?: HTMLDivElement;

    private activeItem: ComboBoxItemElement | null = null;
    private filteredItems: ComboBoxItemElement[] = [];

    readonly #focusGroupController = new FocusGroupController<HTMLElement>(this, {
        direction: "vertical",
        elements: () => this.filteredItems,
        isFocusableElement: (el) => !el.hasAttribute("disabled"),
    });

    connectedCallback(): void {
        super.connectedCallback();
        
        // Run initial coercion if HTML value attribute is set before JS connection
        if (this.multiple && typeof this.value === "string" && this.value.length > 0) {
            this.value = this.value.split(',').map(v => v.trim());
        }

        this.addEventListener("itemSelect" as any, this.handleItemSelect as EventListener);
        this.addEventListener("itemHover" as any, this.handleItemHover as EventListener);
        document.addEventListener("pointerdown", this.handleOutsideEvent);
        document.addEventListener("touchstart", this.handleOutsideEvent as EventListener, { passive: true });

        this.popupController = new PopupController(this, {
            disableAutoOutsideHandler: true,
            onShown: () => {
                this.updateMenuPosition();
            },
            onClose: () => {
                if (this.open) this.open = false;
            }
        });

        this.#focusGroupController.connected();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener("itemSelect" as any, this.handleItemSelect as EventListener);
        this.removeEventListener("itemHover" as any, this.handleItemHover as EventListener);
        document.removeEventListener("pointerdown", this.handleOutsideEvent);
        document.removeEventListener("touchstart", this.handleOutsideEvent as EventListener);
        this.popupController?.disconnected();
        this.#focusGroupController.disconnected();
    }

    updated(propertyName: string, oldValue: unknown, newValue: unknown): void {
        if (propertyName === "open" && oldValue !== newValue) {
            if (newValue) {
                this.showDropdown();
            } else {
                this.hideDropdown();
            }
        }

        if (propertyName === "value" && oldValue !== newValue) {
            // Coerce string arrays dynamically set via JS property assignments
            if (this.multiple && typeof this.value === "string" && this.value.length > 0) {
                this.value = this.value.split(',').map(v => v.trim());
                return; // Will re-trigger updated() with the new array
            }
            this.syncSelectedItems();
            this.updateFormValue();
        }
        
        if (propertyName === "multiple" && oldValue !== newValue) {
            if (this.multiple && typeof this.value === "string" && this.value.length > 0) {
                this.value = this.value.split(',').map(v => v.trim());
            }
        }
        
        if (propertyName === "name" && oldValue !== newValue) {
            this.updateFormValue();
        }
    }

    private getItems(): ComboBoxItemElement[] {
        const dropdown = this.dropdown;
        if (!dropdown) return [];
        const slot = dropdown.querySelector('slot');
        if (!slot) return [];
        const assigned = slot.assignedNodes({ flatten: true });
        const items: ComboBoxItemElement[] = [];
        for (const node of assigned) {
            if (node instanceof HTMLElement && node.tagName === "PGGM-COMBOBOX-ITEM") {
                items.push(node as ComboBoxItemElement);
            }
        }
        return items;
    }

    private updateFormValue() {
        const internals = (this as any).internals as ElementInternals | undefined;
        if (!internals) return;

        if (this.multiple && Array.isArray(this.value)) {
            const formData = new FormData();
            for (const val of this.value) {
                formData.append(this.name, String(val));
            }
            internals.setFormValue(formData);
        } else {
            internals.setFormValue(this.value ? String(this.value) : "");
        }
    }

    formResetCallback() {
        this.value = this.multiple ? [] : "";
        this.inputValue = "";
        this.filterItems("");
        this.updateFormValue();
        this.scheduleRender();
    }

    formDisabledCallback(disabled: boolean) {
        this.disabled = disabled;
    }

    public get form() { return (this as any).internals?.form; }
    public get type() { return this.localName; }
    public get validity() { return (this as any).internals?.validity; }
    public get validationMessage() { return (this as any).internals?.validationMessage; }
    public get willValidate() { return (this as any).internals?.willValidate; }
    public checkValidity() { return (this as any).internals?.checkValidity(); }
    public reportValidity() { return (this as any).internals?.reportValidity(); }

    private syncSelectedItems() {
        const items = this.getItems();
        const values = Array.isArray(this.value) ? this.value : [this.value].filter(Boolean);

        let foundSelected = false;
        items.forEach(item => {
            const itemValue = item.value || item.textContent?.trim() || "";
            item.selected = values.includes(itemValue);
            if (item.selected && !this.multiple && !foundSelected) {
                this.inputValue = item.getLabelText();
                foundSelected = true;
            }
        });

        if (!foundSelected && !this.multiple) {
            this.inputValue = "";
        }
        this.scheduleRender();
    }

    private filterItems(query: string) {
        const items = this.getItems();
        if (!query) {
            this.filteredItems = items;
            items.forEach(item => item.style.display = "");
        } else {
            this.filteredItems = [];
            const lowerQuery = query.toLowerCase();
            items.forEach(item => {
                const text = item.getLabelText().toLowerCase();
                if (text.includes(lowerQuery)) {
                    item.style.display = "";
                    this.filteredItems.push(item);
                } else {
                    item.style.display = "none";
                }
            });
        }

        this.#focusGroupController.updateElements();

        if (this.filteredItems.length === 0 && this.open) {
            this.open = false;
        } else if (this.filteredItems.length > 0 && this.visualBox?.matches(':focus-within') && !this.open) {
            this.open = true;
        }
    }

    private isFocused = false;

    @Bind
    private handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        this.inputValue = target.value;
        if (!this.multiple && !this.inputValue) {
            this.value = "";
        }
        this.filterItems(this.inputValue);
        if (!this.open && this.filteredItems.length > 0) {
            this.open = true;
        }
        this.scheduleRender();
    }

    @Bind
    private handleFocus() {
        this.isFocused = true;
        this.filterItems(this.inputValue);
        if (!this.open && this.filteredItems.length > 0) {
            this.open = true;
        }
    }

    @Bind
    private handleBlur(event: Event) {
        this.isFocused = false;

        // Let handleOutsideEvent manage closing the popup to avoid race conditions 
        // with blur when clicking elements inside the component.

        if (!this.multiple) {
            const items = this.getItems();
            const selectedItem = items.find(i => i.selected);
            if (selectedItem) {
                this.inputValue = selectedItem.getLabelText();
            } else {
                this.inputValue = "";
            }
            this.scheduleRender();
        }
    }

    @Bind
    private handleVisualBoxClick(event: Event) {
        if (this.disabled) return;

        const target = event.target as HTMLElement;
        if (target.closest('.tag-remove') || target.closest('.clear-button')) {
            return;
        }

        // Delay checking state to ensure native focus/blur events have completed
        setTimeout(() => {
            if ((this.isFocused && target === this.visualBox) || target.closest('.chevron')) {
                this.open = !this.open;
            } else if (!this.open) {
                this.open = true;
                this.filterItems(this.inputValue);
            }

            if (this.textBox && document.activeElement !== this.textBox) {
                this.textBox.focus();
            }
        }, 0);
    }

    @Bind
    private handleOutsideEvent(event: Event) {
        if (!this.open) return;
        const target = event.composedPath ? event.composedPath()[0] : event.target;

        let isInside = false;
        if (this.contains(target as Node) || this.dropdown?.contains(target as Node)) {
            isInside = true;
        } else if (event.composedPath) {
            const path = event.composedPath();
            for (const el of path) {
                if (el === this || el === this.dropdown) {
                    isInside = true;
                    break;
                }
            }
        }

        if (!isInside) {
            this.open = false;
        }
    }

    @Bind
    private handleKeyDown(event: Event) {
        if (this.disabled) return;

        const keyboardEvent = event as KeyboardEvent;

        if (keyboardEvent.key === 'Escape') {
            this.open = false;
            keyboardEvent.stopPropagation();
            return;
        }

        if (keyboardEvent.key === 'Backspace' && !this.inputValue && this.multiple) {
            const values = Array.isArray(this.value) ? this.value : [];
            if (values.length > 0) {
                const lastValue = values[values.length - 1];
                this.removeTag(lastValue, keyboardEvent);
            }
            return;
        }

        if (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp') {
            if (!this.open) {
                this.open = true;
                keyboardEvent.preventDefault();
                return;
            }

            keyboardEvent.preventDefault();
            if (this.filteredItems.length === 0) return;

            let currentIndex = this.activeItem ? this.filteredItems.indexOf(this.activeItem) : -1;

            if (keyboardEvent.key === 'ArrowDown') {
                currentIndex = currentIndex < this.filteredItems.length - 1 ? currentIndex + 1 : 0;
            } else {
                currentIndex = currentIndex > 0 ? currentIndex - 1 : this.filteredItems.length - 1;
            }

            this.setActiveItem(this.filteredItems[currentIndex]);
            return;
        }

        if (keyboardEvent.key === 'Enter') {
            if (this.open && this.activeItem) {
                keyboardEvent.preventDefault();
                this.selectItem(this.activeItem);
            } else if (this.open && this.filteredItems.length > 0) {
                keyboardEvent.preventDefault();
                this.selectItem(this.filteredItems[0]);
            }
        }
    }

    private setActiveItem(item: ComboBoxItemElement | null) {
        if (this.activeItem) {
            this.activeItem.removeAttribute('data-active');
        }
        this.activeItem = item;
        if (item) {
            item.setAttribute('data-active', 'true');
            item.scrollIntoView({ block: 'nearest' });
        }
    }

    @Bind
    private handleItemHover(event: CustomEvent) {
        const item = event.detail.item as ComboBoxItemElement;
        this.setActiveItem(item);
    }

    @Bind
    private handleItemSelect(event: CustomEvent) {
        event.stopPropagation();
        const item = event.detail.item as ComboBoxItemElement;
        this.selectItem(item);
    }

    private selectItem(item: ComboBoxItemElement) {
        if (item.disabled) return;

        const itemValue = item.value || item.textContent?.trim() || "";

        if (this.multiple) {
            const values = Array.isArray(this.value) ? [...this.value] : [];
            const index = values.indexOf(itemValue);
            if (index > -1) {
                values.splice(index, 1);
            } else {
                values.push(itemValue);
            }
            this.value = values;
            this.inputValue = "";
            this.filterItems("");
            this.textBox?.focus();
        } else {
            this.value = itemValue;
            this.inputValue = item.getLabelText();
            this.open = false;
        }

        this.syncSelectedItems();
        this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true }));
        this.scheduleRender();
    }

    private isBlank(): boolean {
        if (this.multiple) {
            return Array.isArray(this.value) ? this.value.length === 0 : !this.value;
        }
        return !this.value && !this.inputValue;
    }

    @Bind
    private handleClear(event: Event) {
        event.stopPropagation();
        this.value = this.multiple ? [] : "";
        this.inputValue = "";
        this.filterItems("");
        this.syncSelectedItems();
        this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true }));
        this.textBox?.focus();
        this.scheduleRender();
    }

    @Bind
    private removeTag(valueToRemove: string, event: Event) {
        event.stopPropagation();
        if (this.multiple && Array.isArray(this.value)) {
            this.value = this.value.filter(v => v !== valueToRemove);
            this.syncSelectedItems();
            this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true }));
            this.scheduleRender();
        }
    }

    @Bind
    private handleSlotChange() {
        this.#focusGroupController.updateElements();
        this.syncSelectedItems();
        this.filterItems(this.inputValue);
    }

    private patchedDropdown = false;

    private showDropdown() {
        if (!this.dropdown || !this.visualBox) return;

        // Prevent PopupController from forcing popover="" (which implies auto, causing native light dismiss issues)
        if (!this.patchedDropdown) {
            const dropdownEl = this.dropdown;
            const originalSetAttribute = dropdownEl.setAttribute.bind(dropdownEl);
            dropdownEl.setAttribute = (name: string, value: string) => {
                if (name === 'popover' && value === '') {
                    originalSetAttribute('popover', 'manual');
                } else {
                    originalSetAttribute(name, value);
                }
            };
            this.patchedDropdown = true;
        }

        this.popupController?.open(this.dropdown, this.visualBox);
        this.updateMenuPosition();
        this.filterItems(this.inputValue);

        const onScrollOrResize = () => this.updateMenuPosition();
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        (this as any)._cleanupListeners = () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }

    private hideDropdown() {
        this.popupController?.close();
        if (this.activeItem) {
            this.activeItem.removeAttribute('data-active');
            this.activeItem = null;
        }
        if ((this as any)._cleanupListeners) {
            (this as any)._cleanupListeners();
        }
    }

    private updateMenuPosition(): void {
        if (!this.dropdown || !this.visualBox) return;
        const triggerRect = this.visualBox.getBoundingClientRect();

        let itemsMaxHeight = Infinity;
        if (this.visibleItems && this.visibleItems > 0 && this.filteredItems.length > 0) {
            const itemHeight = this.filteredItems[0].offsetHeight || 36;
            itemsMaxHeight = (itemHeight * this.visibleItems) + 8; // 8px for padding/borders
        }

        const desiredHeight = this.dropdown.scrollHeight;
        const expectedHeight = Math.min(desiredHeight, itemsMaxHeight);

        const spaceBelow = globalThis.innerHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;

        let y = triggerRect.bottom;
        if (spaceBelow < expectedHeight && spaceAbove > spaceBelow) {
            y = triggerRect.top - expectedHeight;
            if (y < 0) y = 0;
        }

        const availableSpace = y === triggerRect.bottom
            ? globalThis.innerHeight - y - 16
            : triggerRect.top - 16;

        const finalMaxHeight = Math.min(availableSpace, itemsMaxHeight);

        if (y !== triggerRect.bottom) {
            const actualRenderedHeight = Math.min(desiredHeight, finalMaxHeight);
            y = triggerRect.top - actualRenderedHeight;
            if (y < 0) y = 0;
        }

        Object.assign(this.dropdown.style, {
            left: `${triggerRect.left}px`,
            top: `${y}px`,
            minWidth: `${triggerRect.width}px`,
            maxWidth: `${globalThis.innerWidth - triggerRect.left - 16}px`
        });

        this.dropdown.style.setProperty('max-height', `${finalMaxHeight}px`, 'important');
    }

    render(): VNode {
        const selectedItemsModels = [];
        if (this.multiple && Array.isArray(this.value)) {
            const items = this.getItems();
            for (const val of this.value) {
                const item = items.find(i => (i.value || i.textContent?.trim()) === val);
                if (item) {
                    selectedItemsModels.push({ value: val, label: item.getLabelText() });
                } else {
                    selectedItemsModels.push({ value: val, label: val }); // fallback
                }
            }
        }

        return (
            <div classes={{ "combobox": true, "disabled": this.disabled, "multiple": this.multiple }}>
                <div
                    key="visual-box"
                    id="visual-box"
                    classes={{ "visual-box": true, "disabled": this.disabled }}
                    on={{ click: this.handleVisualBoxClick }}
                >
                    <slot name="start"></slot>
                    <div key="input-area" class="input-area">
                        {this.multiple && selectedItemsModels.map((model, modelIndex) => (
                            <span key={`tag-${modelIndex}`} class="tag" on={{ pointerdown: (e: Event) => e.preventDefault() }}>
                                {model.label}
                                <button
                                    key={`tag-remove-${modelIndex}`}
                                    class="tag-remove"
                                    type="button"
                                    on={{ click: (event: Event) => this.removeTag(model.value, event) }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </span>
                        ))}
                        <input
                            id="text-box"
                            type="text"
                            role="combobox"
                            aria-expanded={this.open ? "true" : "false"}
                            aria-autocomplete="list"
                            aria-controls="dropdown"
                            disabled={this.disabled}
                            placeholder={this.placeholder}
                            value={this.inputValue}
                            autocomplete="off"
                            on={{
                                input: this.handleInput,
                                focus: this.handleFocus,
                                blur: this.handleBlur,
                                keydown: this.handleKeyDown
                            }}
                        />
                    </div>
                    {this.withClear && !this.isBlank() && !this.disabled && (
                        <button
                            key="clear-button"
                            class="clear-button"
                            type="button"
                            tabindex="-1"
                            aria-label="Clear"
                            on={{
                                click: this.handleClear,
                                pointerdown: (e: Event) => e.preventDefault()
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                    <div key="chevron" class="chevron">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
                <div
                    key="dropdown"
                    id="dropdown"
                    class="dropdown"
                    role="listbox"
                    popover="manual"
                    hidden
                    on={{ pointerdown: (e: Event) => e.preventDefault() }}
                >
                    <slot on={{ slotchange: this.handleSlotChange }}></slot>
                </div>
            </div>
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "pggm-combobox": ComboBoxElement;
    }
}
