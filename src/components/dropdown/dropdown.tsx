import {FocusGroupController} from "../../helpers/focus-group-controller";
import {PopupController} from "../../helpers/popup-controller";
import css from "./dropdown.css";

/**
 * Dropdown component that displays a menu of options when triggered.
 * Supports positioning and keyboard navigation.
 *
 * @element pggm-dropdown
 * @extends {CustomElement}
 *
 * @attr {boolean} open - Whether the dropdown is open
 * @attr {number} distance - Distance from trigger
 * @attr {number} offset - Offset along the trigger
 *
 * @fires dropdownOpen - Dispatched when the dropdown opens
 * @fires dropdownClose - Dispatched when the dropdown closes
 * @fires dropdownSelect - Dispatched when an item is selected
 *
 * @slot - Default slot for menu items
 * @slot trigger - Slot for the trigger element
 */
@CustomElementConfig({
  tagName: "pggm-dropdown",
})
export class DropdownElement extends CustomElement {
  /** The custom element tag name */
  static readonly TAG_NAME = "pggm-dropdown";

  
  static readonly style =  css;

  /** Global list of open dropdowns */
  private static openDropdowns: DropdownElement[] = [];

  /** Cleanup function for floating-ui */
  private readonly cleanup: (() => void) | undefined;

  /** Scroll event handler cleanup */
  private removeScrollListeners?: () => void;

  /** Popup controller for managing popover lifecycle/positioning */
  private popupController?: PopupController;

  /**
   * Whether the dropdown is currently open.
   * @type {boolean}
   */
  @Property({type: Boolean, reflect: true})
  open = false;

  /**
   * The distance of the dropdown menu from its trigger.
   * @type {number}
   */
  @Property({type: Number})
  distance = 0;

  /**
   * The offset of the dropdown menu along its trigger.
   * @type {number}
   */
  @Property({type: Number})
  offset = 0;

  /** Horizontal alignment preference for the popup: auto|left|right|center */
  @Property({type: String, reflect: true})
  align: "auto" | "left" | "right" | "center" = "auto";

  /** Reference to the menu element */
  @Query("#menu")
  private readonly menuElement?: HTMLDivElement;

  /** Stable reference to the menu element captured at connect time */
  private menuRef?: HTMLDivElement | null;

  /** Reference to the popover element */
  @Query("[popover]")
  private readonly popoverElement?: HTMLElement;

  /** Handler for outside clicks */
  private outsideClickHandler?: (event: Event) => void;

  /** Millisecond timestamp when dropdown was opened; used to ignore
   * near-simultaneous outside events caused by the same user action. */
  private openedAtMs?: number;

  /** Handler for keyboard events */
  private keyboardHandler?: (event: KeyboardEvent) => void;

  /** Reference to the trigger element for focus restoration */
  private triggerElement?: HTMLElement;

  /** Element we attach the native popover 'toggle' listener to (if any) */
  private attachedToggleElement?: HTMLElement | null;

  /** Focus group controller for keyboard navigation */
  readonly #focusGroupController = new FocusGroupController<HTMLElement>(this, {
    direction: "vertical",
    elements: () => this.getMenuItems(),
    isFocusableElement: (el) => !el.hasAttribute("disabled"),
  });

  /**
   * Lifecycle callback invoked when the element is added to the DOM.
   * Sets up event listeners.
   */
  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.handleDocumentClick);
    this.addEventListener("itemSelect" as any, this.handleItemSelect as any);

    // Listen for clicks on the trigger slot content
    this.addEventListener("click", this.handleClick);
    // Listen for key events coming from the trigger (open menu with keyboard)
    this.addEventListener("keydown", this.handleTriggerKeyDown as any);
    this.#focusGroupController.connected();
    // Initialize popup controller but keep dropdown's custom outside
    // handling by disabling the controller's auto outside handler.
    this.popupController = new PopupController(this, {
      disableAutoOutsideHandler: true,
      horizontalAlign: this.align || "auto",
      onShown: (popupEl) => {
        // Attach to the real element if the UA wrapped/replaced our node.
        try {
          const pid = popupEl?.dataset.pggmPopupId;
          const container = (this as any).shadowRoot || document.body;
          const realEl =
            pid && container?.querySelector
              ? container.querySelector(`[data-pggm-popup-id="${pid}"]`) ||
                popupEl
              : popupEl;
          if (realEl && realEl instanceof HTMLElement) {
            this.attachedToggleElement = realEl;
            this.attachedToggleElement.addEventListener(
              "toggle",
              this.handlePopoverToggle as EventListener,
            );
          }
        } catch {
          /* ignore */
        }
        requestAnimationFrame(() => this.updateMenuPosition());
      },
      onClose: (_popup) => {
        // remove any attached toggle listener
        try {
          if (this.attachedToggleElement) {
            this.attachedToggleElement.removeEventListener(
              "toggle",
              this.handlePopoverToggle as EventListener,
            );
            this.attachedToggleElement = null;
          }
        } catch {
          /* ignore */
        }
        if (this.open) this.open = false;
      },
    });

    // Capture a stable reference to the menu element before PopupController
    // may move or remove it from the shadow DOM so we can re-open later.
    try {
      this.menuRef =
        this.menuElement ||
        (this.shadowRoot?.querySelector("#menu") as HTMLDivElement) ||
        null;
    } catch {
      this.menuRef = null;
    }
  }

  /**
   * Lifecycle callback invoked when the element is removed from the DOM.
   * Cleans up event listeners and positioning.
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("click", this.handleDocumentClick);
    this.removeEventListener("itemSelect" as any, this.handleItemSelect as any);

    this.removeEventListener("keydown", this.handleTriggerKeyDown as any);

    this.cleanup?.();
    this.popupController?.disconnected();
    this.#focusGroupController.disconnected();
  }

  /**
   * Handles property changes.
   */
  updated(propertyName: string, oldValue: unknown, newValue: unknown): void {
    if (propertyName === "open" && oldValue !== newValue) {
      if (newValue) {
        this.setupOpen();
      } else {
        this.setupClosed();
      }
    }

    if (propertyName === "align" && oldValue !== newValue) {
      try {
        this.popupController?.setHorizontalAlign((this.align as any) || "auto");
      } catch {
        /* ignore */
      }
      if (this.open) {
        requestAnimationFrame(() => {
          this.updateMenuPosition();
          this.popupController?.positionPopup();
        });
      }
    }
  }

  /**
   * Sets up the open state of the dropdown.
   */
  private setupOpen(): void {
    this.showMenu();
  }

  /**
   * Sets up the closed state of the dropdown.
   */
  private setupClosed(): void {
    this.hideMenu();
  }

  /**
   * Checks if the click event occurred inside this dropdown or its trigger.
   */
  private isClickInsideDropdownOrTrigger(
    path: EventTarget[],
    trigger: HTMLElement | null,
  ): boolean {
    for (const element of path) {
      if (element === this || element === trigger) {
        return true;
      }
      if (
        element instanceof HTMLElement &&
        element.tagName === "PGGM-DROPDOWN-ITEM" &&
        this.contains(element)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if the click event occurred inside any open submenu belonging to this dropdown.
   */
  private isClickInsideOpenSubmenu(path: EventTarget[]): boolean {
    const allDropdownItems = Array.from(
      document.querySelectorAll("pggm-dropdown-item"),
    );
    const dropdownItems = allDropdownItems.filter((item) =>
      this.contains(item as HTMLElement),
    );

    for (const item of dropdownItems) {
      const itemElement = item as any;
      const submenu = itemElement.shadowRoot?.querySelector("[popover]");

      if (submenu?.matches(":popover-open")) {
        for (const element of path) {
          if (element === submenu) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Shows the dropdown menu using the Popover API.
   */
  private showMenu(): void {
    // popoverElement may be undefined if PopupController moved the node out
    // of our shadowRoot. Prefer the directly queried element, falling back
    // to the captured `menuRef` we stored at connect time.
    const popupToOpen =
      this.popoverElement ||
      this.menuRef ||
      (this.shadowRoot?.querySelector("#menu") as HTMLDivElement) ||
      null;
    if (!popupToOpen) return;

    const trigger = this.getTrigger();
    if (!trigger) return;

    // Close all other open dropdowns
    DropdownElement.openDropdowns.forEach((dropdown) => {
      if (dropdown !== this && dropdown.open) {
        dropdown.open = false;
      }
    });

    // Add this dropdown to the list of open dropdowns
    if (!DropdownElement.openDropdowns.includes(this)) {
      DropdownElement.openDropdowns.push(this);
    }

    // Store the trigger element for focus restoration
    this.triggerElement = trigger;

    // Position the menu before showing
    requestAnimationFrame(() => this.updateMenuPosition());

    // Add scroll and resize listeners to reposition on scroll/resize
    this.addPositionListeners(trigger);

    // Popover lifecycle is managed by PopupController; no direct toggle listener needed.

    // Add outside click handler with a small delay to allow submenu interactions
    // Record open timestamp and ignore outside events that happen within
    // a short window (e.g. 200ms) of opening — these typically originate
    // from the same pointer interaction that opened the menu.
    this.openedAtMs = Date.now();

    this.outsideClickHandler = (event: Event) => {
      if (this.openedAtMs && Date.now() - this.openedAtMs < 200) return;
      const mouseEvent = event as MouseEvent;
      const path = mouseEvent.composedPath();
      const trigger = this.getTrigger();

      if (this.isClickInsideDropdownOrTrigger(path, trigger)) {
        return;
      }

      if (this.isClickInsideOpenSubmenu(path)) {
        return;
      }

      // Click is truly outside
      this.open = false;
    };

    // Add handler on next event cycle to avoid closing from the same click that opened
    // Use mousedown/touchstart instead of click to detect before click events fire
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.addEventListener("mousedown", this.outsideClickHandler!);
        document.addEventListener("touchstart", this.outsideClickHandler!, {
          passive: true,
        });
      });
    });

    // Add keyboard handler to handle Escape key (FocusGroupController handles navigation)
    this.keyboardHandler = this.handleKeyDown.bind(this);
    this.addEventListener("keydown", this.keyboardHandler);

    // Use PopupController to open the menu (handles Popover API differences)
    this.popupController?.open(popupToOpen, trigger);

    // Update ARIA on trigger and popup
    try {
      this.updateTriggerA11y(true);
      (popupToOpen as HTMLElement).setAttribute("aria-hidden", "false");
    } catch {
      /* ignore */
    }

    // Log popup state after opening to help diagnose visibility issues
    setTimeout(() => {
      try {
        const el = popupToOpen as HTMLElement;
        const style = globalThis.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
      } catch{
        /* ignore */
      }
    }, 50);

    // Update focus group controller with new items and focus the first one
    // Use setTimeout to ensure slot has assigned elements
    setTimeout(() => {
      this.#focusGroupController.updateElements();
      const items = this.getMenuItems();
      if (items.length > 0) {
        this.#focusGroupController.focusElement();
      }
    }, 0);

    this.dispatchEvent(
      new CustomEvent("dropdownOpen", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Hides the dropdown menu using the Popover API.
   */
  private hideMenu(): void {
    // Always perform cleanup regardless of whether `popoverElement`
    // still points to an element (PopupController may have moved/removed
    // the node). This ensures listeners and shared state are cleared
    // so the dropdown can be reopened later.

    // Remove from the list of open dropdowns
    DropdownElement.openDropdowns = DropdownElement.openDropdowns.filter(
      (dropdown) => dropdown !== this,
    );

    // Remove outside click handler (remove the event types that may have
    // been attached). Be tolerant if some were never added.
    if (this.outsideClickHandler) {
      try {
        document.removeEventListener("mousedown", this.outsideClickHandler);
        document.removeEventListener("touchstart", this.outsideClickHandler);
        document.removeEventListener("click", this.outsideClickHandler);
      } catch {
        /* ignore */
      }
      this.outsideClickHandler = undefined;
    }

    // Remove keyboard handler
    if (this.keyboardHandler) {
      try {
        this.removeEventListener("keydown", this.keyboardHandler);
      } catch {
        /* ignore */
      }
      this.keyboardHandler = undefined;
    }

    // Remove scroll listeners
    if (this.removeScrollListeners) {
      try {
        this.removeScrollListeners();
      } catch {
        /* ignore */
      }
      this.removeScrollListeners = undefined;
    }

    // Ensure popup controller is asked to close so it can clean up any
    // appended nodes or internal state.
    try {
      this.popupController?.close();
    } catch {
      /* ignore */
    }

    // If PopupController removed the menu element from the DOM when closing
    // (it removes only when it appended the node), restore the original
    // menu node back into our shadowRoot so the component template remains
    // intact and the dropdown can be reopened later.
    try {
      if (this.menuRef && !this.menuRef.isConnected && this.shadowRoot) {
        this.shadowRoot.appendChild(this.menuRef);
      }
    } catch {
      /* ignore */
    }

    // Restore focus to the trigger element
    if (this.triggerElement) {
      requestAnimationFrame(() => {
        this.triggerElement?.focus();
        this.updateTriggerA11y(false);
      });
    }
  }

  /**
   * Ensure the trigger element exposes ARIA attributes expected for a
   * menu button. If `openState` is provided it will set `aria-expanded` to
   * that value; otherwise it uses the current `this.open`.
   */
  private updateTriggerA11y(openState?: boolean): void {
    const trigger = this.getTrigger();
    if (!trigger) return;
    try {
      trigger.setAttribute("aria-haspopup", "menu");
      const expanded = typeof openState === "boolean" ? openState : !!this.open;
      trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
      // Attempt to set aria-controls to the menu id so assistive tech can relate them.
      const menuEl = this.menuElement || (this.shadowRoot?.querySelector("#menu") as HTMLElement) || null;
      if (menuEl && menuEl.id) {
        trigger.setAttribute("aria-controls", menuEl.id);
      }
    } catch {
      /* ignore */
    }
  }

  /**
   * Adds scroll event listeners to all scrollable ancestors and window.
   * Calls updateMenuPosition on scroll.
   */
  private addPositionListeners(trigger: HTMLElement): void {
    const scrollableAncestors: (Element | Window)[] = [];
    let node: HTMLElement | null = trigger;
    while (node) {
      if (
        node.scrollHeight > node.clientHeight ||
        node.scrollWidth > node.clientWidth
      ) {
        scrollableAncestors.push(node);
      }
      node = node.parentElement;
    }

    scrollableAncestors.push(window);

    const handler = () => this.updateMenuPosition();
    for (const ancestor of scrollableAncestors) {
      ancestor.addEventListener("scroll", handler, {passive: true});
    }
    window.addEventListener("resize", handler, {passive: true});
    this.removeScrollListeners = () => {
      for (const ancestor of scrollableAncestors) {
        ancestor.removeEventListener("scroll", handler);
      }
      window.removeEventListener("resize", handler);
    };
  }

  // end of addPositionListeners

  /**
   * Updates the menu position using Floating UI.
   */
  private updateMenuPosition(): void {
    if (!this.menuElement) return;

    const trigger = this.getTrigger();
    if (!trigger) return;

    const menu = this.menuElement;
    const triggerRect = trigger.getBoundingClientRect();

    // Temporarily show menu to measure dimensions if hidden
    const prevDisplay = menu.style.display;
    if (getComputedStyle(menu).display === "none") {
      menu.style.display = "block";
    }
    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;
    if (prevDisplay) menu.style.display = prevDisplay;

    const x = this.calculateMenuX(triggerRect, menuWidth);
    const y = this.calculateMenuY(triggerRect, menuHeight);

    Object.assign(menu.style, {
      left: `${x}px`,
      top: `${y}px`,
      maxWidth: `${globalThis.innerWidth - x - 16}px`,
      maxHeight: `${globalThis.innerHeight - y - 16}px`,
    });
  }

  /**
   * Calculates the horizontal position for the menu.
   */
  private calculateMenuX(triggerRect: DOMRect, menuWidth: number): number {
    const align = this.align || "auto";
    const offset = this.offset || 0;
    const spaceOnRight = globalThis.innerWidth - triggerRect.left;
    const spaceOnLeft = triggerRect.right;

    if (align === "left") {
      return triggerRect.left + offset;
    }
    if (align === "right") {
      return triggerRect.right - menuWidth + offset;
    }
    if (align === "center") {
      return triggerRect.left + (triggerRect.width - menuWidth) / 2 + offset;
    }
    // auto: prefer left but use right if not enough space on right
    if (spaceOnRight < menuWidth && spaceOnLeft > menuWidth) {
      return triggerRect.right - menuWidth + offset;
    }
    return triggerRect.left + offset;
  }

  /**
   * Calculates the vertical position for the menu.
   */
  private calculateMenuY(triggerRect: DOMRect, menuHeight: number): number {
    const distance = this.distance || 0;
    const spaceBelow = globalThis.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      let y = triggerRect.top - menuHeight - distance;
      if (y < 0) y = 0;
      return y;
    }
    return triggerRect.bottom + distance;
  }

  /**
   * Gets the trigger element from the trigger slot.
   */
  private getTrigger(): HTMLElement | null {
    const triggerSlot = this.shadowRoot?.querySelector(
      'slot[name="trigger"]',
    ) as HTMLSlotElement;
    if (!triggerSlot) return null;

    const assignedElements = triggerSlot.assignedElements();
    return (assignedElements[0] as HTMLElement) || null;
  }

  /**
   * Handles click events on the dropdown element.
   * Checks if the click was on the trigger slot content.
   */
  @Bind
  private handleClick(event: MouseEvent): void {
    const trigger = this.getTrigger();
    if (trigger?.contains(event.target as Node)) {
      event.stopPropagation();
      this.toggle();
    }
  }

  /**
   * Toggles the dropdown open/closed state.
   */
  private toggle(): void {
    const next = !this.open;
    this.open = next;
  }

  /**
   * Handles document click events to close dropdown when clicking outside.
   */
  @Bind
  private handleDocumentClick(event: MouseEvent): void {
    if (!this.popoverElement?.hasAttribute("open")) return;

    const target = event.target as Node;
    if (!this.contains(target)) {
      this.open = false;
    }
  }

  /**
   * Handles keyboard events for accessibility.
   */
  @Bind
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      this.open = false;
      event.stopPropagation();
    }
  }

  /**
   * Handle keydown events originating from the trigger content.
   * Open the menu and move focus into the first/last item depending on key.
   */
  @Bind
  private handleTriggerKeyDown(event: KeyboardEvent): void {
    const trigger = this.getTrigger();
    if (!trigger) return;
    const target = event.target as Node;
    if (!trigger.contains(target)) return;

    const key = event.key;
    if (key === "Enter" || key === " " || key === "Spacebar" || key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      if (!this.open) {
        this.open = true;
      }
      // Defer to ensure slotted items are available
      setTimeout(() => {
        this.#focusGroupController.updateElements();
        this.#focusGroupController.focusElement();
      }, 0);
    } else if (key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      if (!this.open) {
        this.open = true;
      }
      setTimeout(() => {
        this.#focusGroupController.updateElements();
        const items = this.getMenuItems();
        if (items.length > 0) {
          this.#focusGroupController.focusElement(items[items.length - 1] as any);
        }
      }, 0);
    }
  }

  /**
   * Handles popover toggle events to sync component state.
   */
  @Bind
  private handlePopoverToggle(event: Event): void {
    const toggleEvent = event as any;
    if (toggleEvent.newState === "closed") {
      // Clean up when popover closes
      if (this.outsideClickHandler) {
        document.removeEventListener("click", this.outsideClickHandler);
        this.outsideClickHandler = undefined;
      }
      this.open = false;
    }
  }

  /**
   * Handles item selection events.
   */
  @Bind
  private handleItemSelect(event: CustomEvent): void {
    this.dispatchEvent(
      new CustomEvent("dropdownSelect", {
        bubbles: true,
        composed: true,
        detail: event.detail,
      }),
    );
    this.open = false;
  }

  /**
   * Gets all focusable menu items.
   */
  private getMenuItems(): HTMLElement[] {
    const menu = this.menuElement;
    if (!menu) return [];

    // Find slotted dropdown items
    const slot = menu.querySelector("slot") as HTMLSlotElement;
    if (!slot) return [];

    const assignedElements = slot.assignedElements();
    return assignedElements.filter(
      (el) =>
        el.tagName === "PGGM-DROPDOWN-ITEM" && !el.hasAttribute("disabled"),
    ) as HTMLElement[];
  }

  /**
   * Renders the dropdown.
   */
  render(): VNode {
    return <div class="base">
      <slot name="trigger"></slot>
      <div id="menu" class="menu" popover="manual" role="menu" aria-orientation="vertical" aria-hidden="true">
        <slot></slot>
      </div>
    </div>
  }
}

// TypeScript module augmentation for customized built-in elements
declare global {
  interface HTMLElementTagNameMap {
    "pggm-dropdown": DropdownElement;
  }
}
