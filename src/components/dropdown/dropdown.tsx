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

  /** Reference to the trigger slot element for slotchange handling */
  private triggerSlot?: HTMLSlotElement | null;

  /** Reference to the menu's default slot for slotchange handling */
  private menuSlot?: HTMLSlotElement | null;
  private menuSlotHandler?: (e?: Event) => void;

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
    this.menuRef = this.menuElement || (this.shadowRoot?.querySelector("#menu") as HTMLDivElement) || null;

    // Watch for slot changes inside the menu so the focus controller can
    // refresh its element list when slotted content changes.
    this.menuSlot = (this.menuRef?.querySelector("slot") as HTMLSlotElement) || null;
    if (this.menuSlot) {
      this.menuSlotHandler = () => this.#focusGroupController.updateElements();
      this.menuSlot.addEventListener("slotchange", this.menuSlotHandler as EventListener);
    }

    // Initialize ARIA attributes on the trigger based on current state
    this.updateTriggerA11y(false);

    // Watch for changes to the trigger slot so we can apply ARIA attributes
    this.triggerSlot = this.shadowRoot?.querySelector('slot[name="trigger"]') as HTMLSlotElement;
    if (this.triggerSlot) {
      this.triggerSlot.addEventListener('slotchange', this.handleTriggerSlotChange as any);
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

    if (this.triggerSlot) this.triggerSlot.removeEventListener('slotchange', this.handleTriggerSlotChange as any);
    if (this.menuSlot && this.menuSlotHandler) {
      this.menuSlot.removeEventListener('slotchange', this.menuSlotHandler as EventListener);
    }

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
        // Use pointerdown for unified pointer support; add touchstart as a
        // fallback for older browsers. Use capture so we observe the event
        // before other handlers and can close reliably.
        try {
          document.addEventListener("pointerdown", this.outsideClickHandler!, true);
        } catch {
          /* ignore */
        }
        try {
          document.addEventListener("touchstart", this.outsideClickHandler!, {
            passive: true,
            capture: true,
          } as AddEventListenerOptions);
        } catch {
          /* ignore */
        }
      });
    });

    // Add keyboard handler to handle Escape key (FocusGroupController handles navigation)
    this.keyboardHandler = this.handleKeyDown.bind(this);
    this.addEventListener("keydown", this.keyboardHandler);

    // Use PopupController to open the menu (handles Popover API differences)
    this.popupController?.open(popupToOpen, trigger);

    // Ensure PopupController has a chance to reposition after any DOM moves it performs
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          this.popupController?.positionPopup();
        } catch {
          /* ignore */
        }
      });
    });

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
    // Use requestAnimationFrame to ensure slot has assigned elements deterministically
    requestAnimationFrame(() => {
      this.#focusGroupController.updateElements();
      const items = this.getMenuItems();
      if (items.length > 0) {
        this.#focusGroupController.focusElement();
      }
    });

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
        try {
          document.removeEventListener("pointerdown", this.outsideClickHandler, true);
        } catch {
          /* ignore */
        }
        try {
          document.removeEventListener("touchstart", this.outsideClickHandler as any, true);
        } catch {
          /* ignore */
        }
        try {
          document.removeEventListener("click", this.outsideClickHandler);
        } catch {
          /* ignore */
        }
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
    // Prefer the assigned trigger from the slot, but fall back to searching
    // the host's light DOM for an element with `slot="trigger"` so we
    // handle environments without a shadowRoot or timing issues where the
    // slot isn't yet available.
    let trigger = this.getTrigger();
    if (!trigger) {
      try {
        trigger = (this.querySelector('[slot="trigger"]') as HTMLElement) || null;
      } catch {
        trigger = null;
      }
    }
    if (!trigger) return;
    try {
      // Do not overwrite user-provided attributes. Set aria-haspopup and
      // aria-controls only when they are not already present on the trigger.
      if (!trigger.hasAttribute("aria-haspopup")) {
        trigger.setAttribute("aria-haspopup", "menu");
      }
      const expanded = typeof openState === "boolean" ? openState : !!this.open;
      // aria-expanded should reflect component state; keep it in sync.
      trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
      // Set aria-controls only when not provided by the consumer and we can
      // determine an id for the menu.
      if (!trigger.hasAttribute("aria-controls")) {
        const menuEl = this.menuElement || (this.shadowRoot?.querySelector("#menu") as HTMLElement) || null;
        if (menuEl && menuEl.id) {
          trigger.setAttribute("aria-controls", menuEl.id);
        }
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

    // Prefer measuring without changing `display` to avoid reflows, using
    // visibility + transform. However when the element is `display: none`
    // offsetWidth/offsetHeight will be zero, so fall back to temporarily
    // showing the element to measure.
    const computedDisplay = getComputedStyle(menu).display;
    const prevVisibility = menu.style.visibility;
    const prevTransform = menu.style.transform;
    const prevPointerEvents = menu.style.pointerEvents;
    const prevDisplay = menu.style.display;
    let usedTemporaryDisplay = false;
    try {
      if (computedDisplay === "none") {
        // Temporarily show for measurement
        menu.style.display = "block";
        usedTemporaryDisplay = true;
      } else {
        menu.style.visibility = "hidden";
        menu.style.pointerEvents = "none";
        menu.style.transform = "translate3d(-9999px,-9999px,0)";
      }

      const menuHeight = menu.offsetHeight;
      const menuWidth = menu.offsetWidth;

      const x = this.calculateMenuX(triggerRect, menuWidth);
      const y = this.calculateMenuY(triggerRect, menuHeight);

      Object.assign(menu.style, {
        left: `${x}px`,
        top: `${y}px`,
        maxWidth: `${globalThis.innerWidth - x - 16}px`,
        maxHeight: `${globalThis.innerHeight - y - 16}px`,
      });
    } finally {
      // Restore temporary styles
      try {
        if (usedTemporaryDisplay) {
          menu.style.display = prevDisplay || "";
        } else {
          menu.style.transform = prevTransform || "";
          menu.style.visibility = prevVisibility || "";
          menu.style.pointerEvents = prevPointerEvents || "";
        }
      } catch {
        /* ignore */
      }
    }
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

  @Bind
  private handleTriggerSlotChange(): void {
    try {
      this.updateTriggerA11y(false);
    } catch {
      /* ignore */
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
      requestAnimationFrame(() => {
        this.#focusGroupController.updateElements();
        this.#focusGroupController.focusElement();
      });
    } else if (key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      if (!this.open) {
        this.open = true;
      }
      requestAnimationFrame(() => {
        this.#focusGroupController.updateElements();
        const items = this.getMenuItems();
        if (items.length > 0) {
          this.#focusGroupController.focusElement(items[items.length - 1] as any);
        }
      });
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
        try {
          document.removeEventListener("pointerdown", this.outsideClickHandler, true);
        } catch {
          /* ignore */
        }
        try {
          document.removeEventListener("touchstart", this.outsideClickHandler as any, true);
        } catch {
          /* ignore */
        }
        try {
          document.removeEventListener("click", this.outsideClickHandler);
        } catch {
          /* ignore */
        }
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
    // Prevent ancestor dropdowns from also handling this selection
    try {
      event.stopPropagation();
    } catch {
      /* ignore */
    }

    // Re-emit a single selection event for consumers (legacy `dropdownSelect`)
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

    // Find slotted dropdown items. Use assignedNodes(flatten:true) to
    // collect nested nodes (wrapper elements) and also query within those
    // nodes for nested `pggm-dropdown-item` elements to support wrapped
    // submenu content.
    const slot = menu.querySelector("slot") as HTMLSlotElement;
    if (!slot) return [];

    const assigned = slot.assignedNodes({flatten: true}) as Node[];
    const items: HTMLElement[] = [];
    for (const node of assigned) {
      if (!(node instanceof HTMLElement)) continue;
      // If the assigned node itself is a dropdown item, include it.
      if (node.tagName === "PGGM-DROPDOWN-ITEM") {
        items.push(node as HTMLElement);
        continue;
      }
      // Otherwise, include only immediate child dropdown items (not deep descendants)
      // This prevents submenu items nested deeper (e.g. inside a submenu slot) from
      // being treated as top-level menu items.
      try {
        const directChildren = Array.from(
          (node as Element).querySelectorAll?.(':scope > pggm-dropdown-item') || [],
        ) as HTMLElement[];
        for (const child of directChildren) items.push(child);
      } catch {
        // If :scope isn't supported, fall back to shallow child iteration
        const fallback = Array.from((node as Element).children || []).filter(
          (c) => (c as HTMLElement).tagName === "PGGM-DROPDOWN-ITEM",
        ) as HTMLElement[];
        for (const child of fallback) items.push(child);
      }
    }

    return items.filter((el) => !el.hasAttribute("disabled"));
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
