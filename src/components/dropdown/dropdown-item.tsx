import {FocusGroupController} from "@pggm/helpers/src/focus-group-controller";
import css from "./dropdown-item.css";

/**
 * Dropdown item component for use within dropdown menus.
 * Can be selected and supports icons, details, and submenus.
 *
 * @element pggm-dropdown-item
 * @extends {CustomElement}
 *
 * @attr {boolean} disabled - Whether the item is disabled
 * @attr {boolean} checked - Whether the item is checked (shows checkmark)
 * @attr {string} value - Value associated with the item
 *
 * @fires itemSelect - Dispatched when the item is selected
 *
 * @slot - Default slot for item label
 * @slot icon - Slot for icon at the start of the item
 * @slot details - Slot for details (e.g., keyboard shortcuts) at the end
 * @slot submenu - Slot for submenu items
 */
@CustomElementConfig({
  tagName: "pggm-dropdown-item",
})
export class DropdownItemElement extends CustomElement {
  static readonly TAG_NAME = "pggm-dropdown-item";
  static readonly observedAttributes = ["disabled", "checked", "value"];

  static readonly style = css;

  @Property({type: "boolean", reflect: true})
  disabled = false;

  @Property({type: "boolean", reflect: true})
  checked = false;

  @Property({type: "string"})
  value = "";

  @Query("#submenu")
  private readonly submenuElement?: HTMLElement;

  @Query('slot[name="submenu"]')
  private readonly submenuSlot?: HTMLSlotElement;

  @Property({type: "boolean"})
  private hasSubmenu = false;

  private isSubmenuOpen = false;

  readonly #submenuFocusController = new FocusGroupController<HTMLElement>(
    this,
    {
      direction: "vertical",
      elements: () => {
        if (!this.submenuSlot) return [];
        const assigned = this.submenuSlot.assignedNodes({flatten: true});
        const items: HTMLElement[] = [];
        for (const node of assigned) {
          if (node instanceof HTMLElement) {
            if (node.tagName === "PGGM-DROPDOWN-ITEM") {
              items.push(node);
            }
            const nested = Array.from(node.querySelectorAll?.("pggm-dropdown-item") || []);
            for (const n of nested) items.push(n);
          }
        }
        return items.filter((el) => !el.hasAttribute("disabled"));
      },
      isFocusableElement: (el) => !el.hasAttribute("disabled"),
    },
  );

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", "menuitem");
    this.setAttribute("tabindex", "-1");

    if (this.disabled) {
      this.setAttribute("aria-disabled", "true");
    }

    this.addEventListener("click", this.handleClick);
    this.addEventListener("keydown", this.handleKeyDown);
    this.addEventListener("mouseenter", this.handleMouseEnter);
    this.addEventListener("mouseleave", this.handleMouseLeave);
    this.addEventListener("touchstart", this.handleTouchStart, {passive: true} as AddEventListenerOptions);
    this.addEventListener("closeSubmenu" as any, this.handleCloseSubmenu as any);
    this.#submenuFocusController.connected();

    requestAnimationFrame(() => this.updateSubmenuState());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("click", this.handleClick);
    this.removeEventListener("keydown", this.handleKeyDown);
    this.removeEventListener("mouseenter", this.handleMouseEnter);
    this.removeEventListener("mouseleave", this.handleMouseLeave);
    this.removeEventListener("touchstart", this.handleTouchStart as any);
    this.removeEventListener("closeSubmenu" as any, this.handleCloseSubmenu as any);
    this.#submenuFocusController.disconnected();
  }

  @Bind
  private handleClick(event: MouseEvent): void {
    if (this.disabled) return;

    if (this.hasSubmenuContent()) {
      if (!this.isSubmenuOpen) {
        event.preventDefault();
        event.stopPropagation();
        this.showSubmenu();
      }
      return;
    }

    this.dispatchEvent(
      new CustomEvent("itemSelect", {
        bubbles: true,
        composed: true,
        detail: {item: this},
      }),
    );
  }

  @Bind
  private handleTouchStart(): void {
    if (this.disabled || !this.hasSubmenuContent()) return;
    this.showSubmenu();
  }

  @Bind
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      if (this.isSubmenuOpen) {
        event.preventDefault();
        event.stopPropagation();
        this.hideSubmenu();
        this.focus();
        return;
      }
      return;
    }

    if (event.key === "ArrowRight") {
      if (this.hasSubmenuContent()) {
        event.preventDefault();
        event.stopPropagation();
        this.showSubmenu(true);
        return;
      }
    }

    if (event.key === "ArrowLeft") {
      const closeEvt = new CustomEvent("closeSubmenu", {bubbles: true, composed: true});
      this.dispatchEvent(closeEvt);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (this.disabled) return;

      if (this.hasSubmenuContent()) {
        event.stopPropagation();
        this.showSubmenu(true);
        return;
      }

      this.dispatchEvent(
        new CustomEvent("itemSelect", {
          bubbles: true,
          composed: true,
          detail: {item: this},
        }),
      );
    }
  }

  @Bind
  private handleCloseSubmenu(event: CustomEvent): void {
    if (!this.isSubmenuOpen || !this.submenuElement) return;
    const target = event.target as Node;
    if (this.submenuElement.contains(target)) {
      this.hideSubmenu();
      requestAnimationFrame(() => this.focus());
      event.stopPropagation();
    }
  }

  @Bind
  private handleMouseEnter(): void {
    if (!this.submenuElement || !this.hasSubmenuContent()) return;
    this.showSubmenu();
  }

  @Bind
  private handleMouseLeave(event: MouseEvent): void {
    if (!this.submenuElement) return;
    const relatedTarget = event.relatedTarget as Node;
    if (relatedTarget && this.submenuElement.contains(relatedTarget)) return;
    this.hideSubmenu();
  }

  private showSubmenu(focusFirst = false): void {
    if (!this.submenuElement || this.isSubmenuOpen) return;

    Object.assign(this.submenuElement.style, {
      minWidth: "180px",
      width: "max-content",
    });

    try {
      this.submenuElement.showPopover();
    } catch {
      // ignore
    }
    this.isSubmenuOpen = true;

    const closeSubmenuHandler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!this.submenuElement?.contains(target) && !this.contains(target)) {
        this.hideSubmenu();
        document.removeEventListener("click", closeSubmenuHandler);
      }
    };

    requestAnimationFrame(() => {
      document.addEventListener("click", closeSubmenuHandler);
    });

    requestAnimationFrame(() => {
      if (!this.submenuElement) return;

      const rect = this.getBoundingClientRect();
      const submenuWidth = this.submenuElement.offsetWidth;
      const spaceOnRight = window.innerWidth - rect.right;
      const spaceOnLeft = rect.left;

      if (spaceOnRight < submenuWidth && spaceOnLeft > submenuWidth) {
        this.submenuElement.style.left = `${rect.left - submenuWidth}px`;
      } else {
        this.submenuElement.style.left = `${rect.right}px`;
      }

      const submenuHeight = this.submenuElement.offsetHeight;
      let left: number;
      if (spaceOnRight < submenuWidth && spaceOnLeft > submenuWidth) {
        left = rect.left - submenuWidth;
      } else {
        left = rect.right;
      }

      let top = rect.top;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      left = Math.min(Math.max(8, left), Math.max(8, viewportWidth - submenuWidth - 8));

      if (top + submenuHeight + 8 > viewportHeight) {
        top = Math.max(8, viewportHeight - submenuHeight - 8);
      }
      top = Math.max(8, top);

      this.submenuElement.style.left = `${left}px`;
      this.submenuElement.style.top = `${top}px`;

      if (focusFirst) {
        this.#submenuFocusController.updateElements();
        this.#submenuFocusController.focusElement();
      }
    });
  }

  private hideSubmenu(): void {
    if (!this.submenuElement || !this.isSubmenuOpen) return;
    try {
      this.submenuElement.hidePopover();
      this.isSubmenuOpen = false;
    } catch {
      // ignore
    }
  }

  @Bind
  private updateSubmenuState(): void {
    this.hasSubmenu = this.hasSubmenuContent();
    this.scheduleRender();
  }

  private hasSubmenuContent(): boolean {
    return (this.submenuSlot?.assignedNodes({flatten: true}).length ?? 0) > 0;
  }

  render(): VNode {
    return (
      <div classes={{
        "dropdown-item": true,
        "checked": this.checked,
        "disabled": this.disabled,
      }}>
        {this.checked && (
          <span class="icon">
            <svg
              fill="currentColor"
              viewBox="0 0 1920 1920"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1827.701 303.065 698.835 1431.801 92.299 825.266 0 917.564 698.835 1616.4 1919.869 395.234z"
                fill-rule="evenodd"
              />
            </svg>
          </span>
        )}
        <span key="icon" class="icon">
          <slot name="icon" id="icon"></slot>
        </span>
        <span key="label" class="label" id="label">
          <slot></slot>
        </span>
        <span key="details" class="details" id="details">
          <slot name="details"></slot>
        </span>
        {this.hasSubmenu && (
          <span key="submenuIndicator" class="submenuIndicator">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 3l5 5-5 5V3z" />
            </svg>
          </span>
        )}
        <div class="submenu" id="submenu" popover="manual">
          <slot
            name="submenu"
            on={{slotchange: this.updateSubmenuState}}
          ></slot>
        </div>
      </div>
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pggm-dropdown-item": DropdownItemElement;
  }
}
