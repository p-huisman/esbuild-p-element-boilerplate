import {FocusGroupController} from "../../helpers/focus-group-controller";
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
  /** The custom element tag name */
  static readonly TAG_NAME = "pggm-dropdown-item";

  /** List of attributes to observe for changes */
  static readonly observedAttributes = ["disabled", "checked", "value"];

  
  static readonly style = css;

  /**
   * Whether the dropdown item is disabled.
   * @type {boolean}
   */
  @Property({type: Boolean, reflect: true})
  disabled = false;

  /**
   * Whether the dropdown item is checked (shows checkmark).
   * @type {boolean}
   */
  @Property({type: Boolean, reflect: true})
  checked = false;

  /**
   * The value associated with the dropdown item.
   * @type {string}
   */
  @Property({type: String})
  value = "";

  /** Reference to the submenu popover element */
  @Query("#submenu")
  private readonly submenuElement?: HTMLElement;

  /** Reference to the submenu slot */
  @Query('slot[name="submenu"]')
  private readonly submenuSlot?: HTMLSlotElement;

  /** Track if submenu has content */
  @Property({type: Boolean})
  private hasSubmenu = false;

  /** Track if submenu is currently open */
  private isSubmenuOpen = false;

  /** Focus group controller for submenu keyboard navigation */
  readonly #submenuFocusController = new FocusGroupController<HTMLElement>(
    this,
    {
      direction: "vertical",
      // Collect submenu items from the assigned slot nodes. We accept direct
      // `pggm-dropdown-item` children as well as nested ones inside wrapper
      // elements (e.g. a `div` used as a container), since the demo uses a
      // wrapper for the submenu content.
      elements: () => {
        if (!this.submenuSlot) return [];
        const assigned = this.submenuSlot.assignedNodes({flatten: true}) as Node[];
        const items: HTMLElement[] = [];
        for (const node of assigned) {
          if (node instanceof HTMLElement) {
            if (node.tagName === "PGGM-DROPDOWN-ITEM") {
              items.push(node as HTMLElement);
            }
            // Also include any nested pggm-dropdown-item elements inside wrapper nodes
            const nested = Array.from(node.querySelectorAll?.("pggm-dropdown-item") || []);
            for (const n of nested) items.push(n as HTMLElement);
          }
        }
        return items.filter((el) => !el.hasAttribute("disabled"));
      },
      isFocusableElement: (el) => !el.hasAttribute("disabled"),
    },
  );

  /**
   * Lifecycle callback invoked when the element is added to the DOM.
   * Sets up event listeners and accessibility attributes.
   */
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
    this.addEventListener("touchstart", this.handleTouchStart, {passive: true});
    this.#submenuFocusController.connected();

    // Check for submenu content after initial render
    requestAnimationFrame(() => {
      this.updateSubmenuState();
    });
  }

  /**
   * Lifecycle callback invoked when the element is removed from the DOM.
   * Cleans up event listeners.
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("click", this.handleClick);
    this.removeEventListener("keydown", this.handleKeyDown);
    this.removeEventListener("mouseenter", this.handleMouseEnter);
    this.removeEventListener("mouseleave", this.handleMouseLeave);
    this.removeEventListener("touchstart", this.handleTouchStart);
    this.#submenuFocusController.disconnected();
  }

  /**
   * Handles click events on the dropdown item.
   * On touch devices with submenus, first click opens submenu, not select.
   * Dispatches select event if not disabled and no submenu or submenu already open.
   */
  @Bind
  private handleClick(event: MouseEvent): void {
    if (this.disabled) return;

    // If this item has a submenu
    if (this.hasSubmenuContent()) {
      // Items with submenus should never dispatch itemSelect
      // They only toggle the submenu visibility
      if (!this.isSubmenuOpen) {
        event.preventDefault();
        event.stopPropagation();
        this.showSubmenu();
      }
      // If submenu already open, just ignore the click
      return;
    }

    // No submenu, proceed with selection
    this.dispatchEvent(
      new CustomEvent("itemSelect", {
        bubbles: true,
        composed: true,
        detail: {item: this},
      }),
    );
  }

  /**
   * Handles touch start events to open submenu on touch devices.
   */
  @Bind
  private handleTouchStart(): void {
    if (this.disabled || !this.hasSubmenuContent()) return;

    // Show submenu on touch
    this.showSubmenu();
  }

  /**
   * Handles keyboard events on the dropdown item.
   * Supports Enter and Space keys for selection or opening submenus, and Escape to close submenu.
   */
  @Bind
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      // Close submenu if open
      if (this.isSubmenuOpen) {
        event.preventDefault();
        event.stopPropagation();
        this.hideSubmenu();
        // Return focus to this item
        this.focus();
        return;
      }
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (this.disabled) return;

      // If item has submenu, open it instead of selecting
      if (this.hasSubmenuContent()) {
        event.stopPropagation();
        this.showSubmenu(true);
        return;
      }

      // No submenu, dispatch select event
      this.dispatchEvent(
        new CustomEvent("itemSelect", {
          bubbles: true,
          composed: true,
          detail: {item: this},
        }),
      );
    }
  }

  /**
   * Handles mouse enter events to show submenu.
   */
  @Bind
  private handleMouseEnter(): void {
    if (!this.submenuElement || !this.hasSubmenuContent()) return;

    this.showSubmenu();
  }

  /**
   * Handles mouse leave events to hide submenu.
   */
  @Bind
  private handleMouseLeave(event: MouseEvent): void {
    if (!this.submenuElement) return;

    const relatedTarget = event.relatedTarget as Node;

    // Don't hide if moving to the submenu
    if (relatedTarget && this.submenuElement.contains(relatedTarget)) {
      return;
    }

    this.hideSubmenu();
  }

  /**
   * Shows the submenu popover and positions it.
   *
   * Note: focusing the first submenu item is opt-in. When the submenu is
   * opened via keyboard navigation callers should pass `focusFirst = true` so
   * the submenu receives keyboard focus. The default (`false`) preserves
   * pointer/hover behavior and avoids unexpectedly moving focus on mouse open.
   *
   * @param {boolean} focusFirst - Whether to focus the first item in the submenu (default: false)
   */
  private showSubmenu(focusFirst = false): void {
    if (!this.submenuElement || this.isSubmenuOpen) return;

    try {
      // Apply critical styles before showing
      Object.assign(this.submenuElement.style, {
        minWidth: "180px",
        width: "max-content",
      });

      this.submenuElement.showPopover();
      this.isSubmenuOpen = true;

      // Add click listener to close submenu when clicking outside
      const closeSubmenuHandler = (event: MouseEvent) => {
        const target = event.target as Node;
        if (!this.submenuElement?.contains(target) && !this.contains(target)) {
          this.hideSubmenu();
          document.removeEventListener("click", closeSubmenuHandler);
        }
      };

      // Delay adding the listener to avoid immediately closing
      requestAnimationFrame(() => {
        document.addEventListener("click", closeSubmenuHandler);
      });

      // Wait for layout to settle before positioning
      requestAnimationFrame(() => {
        if (!this.submenuElement) return;

        // Position submenu - check if there's space on the right
        const rect = this.getBoundingClientRect();
        const submenuWidth = this.submenuElement.offsetWidth;
        const spaceOnRight = window.innerWidth - rect.right;
        const spaceOnLeft = rect.left;

        // Position on the left if not enough space for submenu on the right
        if (spaceOnRight < submenuWidth && spaceOnLeft > submenuWidth) {
          this.submenuElement.style.left = `${rect.left - submenuWidth}px`;
        } else {
          this.submenuElement.style.left = `${rect.right}px`;
        }

        this.submenuElement.style.top = `${rect.top}px`;

        // Focus first item when opening the submenu
        if (focusFirst) {
          this.#submenuFocusController.updateElements();
          this.#submenuFocusController.focusElement();
        }
      });
    } catch{
      /* ignore */
    }
  }

  /**
   * Hides the submenu popover.
   */
  private hideSubmenu(): void {
    if (!this.submenuElement || !this.isSubmenuOpen) return;

    try {
      this.submenuElement.hidePopover();
      this.isSubmenuOpen = false;
    } catch {
      // Popover may already be hidden
    }
  }

  /**
   * Update submenu state based on slot content
   */
  @Bind
  private updateSubmenuState(): void {
    this.hasSubmenu = this.hasSubmenuContent();
    this.scheduleRender();
  }

  /**
   * Check if submenu slot has content
   */
  private hasSubmenuContent(): boolean {
    return (this.submenuSlot?.assignedNodes({flatten: true}).length ?? 0) > 0;
  }

  /**
   * Renders the dropdown item.
   */
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

// TypeScript module augmentation for customized built-in elements
declare global {
  interface HTMLElementTagNameMap {
    "pggm-dropdown-item": DropdownItemElement;
  }
}
