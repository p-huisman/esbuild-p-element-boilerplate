
export type PopupControllerOptions = {
  // Called after the popup is attached to the document but before showPopover()
  onAttach?: (popup: HTMLElement) => void;
  // Called after the popup is shown (popover opened or manually positioned)
  onShown?: (popup: HTMLElement) => void;
  // Called when the popup is closed
  onClose?: (popup?: HTMLElement | null) => void;
  // Optional selector used when detecting clicks inside popup (defaults to popup element)
  insideSelector?: string;
  // When true, the controller will NOT attach its default outside/cancel
  // handlers. Useful when a consumer (like date-input) needs custom
  // outside-click semantics (e.g. ignore mousedown on calendar days).
  disableAutoOutsideHandler?: boolean;
  // Horizontal alignment of the popup relative to the anchor/host.
  // - 'auto': prefer left edge, but use right edge if not enough space on right
  // - 'left': align popup left to anchor left
  // - 'right': align popup right to anchor right
  // - 'center': horizontally center popup on anchor
  horizontalAlign?: "auto" | "left" | "right" | "center";
};

/**
 * Generic popup controller that provides Popover-API-first behavior and
 * basic positioning, outside-click handling, Escape handling and
 * reposition-on-resize/scroll. Designed to be reused by multiple
 * components (date-input, dropdown, etc.).
 */
export class PopupController {
  readonly #host: CustomElement;
  #popup?: HTMLElement | null;
  #anchor?: HTMLElement | null;
  #outsideHandler?: (e: Event) => void;
  #keydownHandler?: (e: KeyboardEvent) => void;
  #repositionHandler?: () => void;
  readonly #options: PopupControllerOptions;
  #popupWasAppended = false;

  constructor(host: CustomElement, options: PopupControllerOptions = {}) {
    this.#host = host;
    this.#options = options;
  }

  private updatePopupAfterShow(
    el: HTMLElement,
    pid: string,
    container: HTMLElement | Document,
  ) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.positionPopup();
        this.#options.onShown?.(el);

        const selector = `[data-pggm-popup-id="${pid}"]`;
        const realEl = container.querySelector
          ? container.querySelector(selector)
          : document.querySelector(selector);
        if (realEl && realEl instanceof HTMLElement && realEl !== el) {
          this.applyPopupPosition(realEl);
          this.#popup = realEl;
        }
      });
    });
  }

  private applyPopupPosition(realEl: HTMLElement) {
    const hostRect = (this.#host as any as HTMLElement).getBoundingClientRect();
    const popupWidth = realEl.offsetWidth || Math.max(100, hostRect.width);
    const popupHeight = realEl.offsetHeight || 200;

    const align = this.#options.horizontalAlign || "left";
    const spaceOnRight = globalThis.innerWidth - hostRect.left;
    const spaceOnLeft = hostRect.right;

    let x: number;
    if (align === "right") {
      x = hostRect.right - popupWidth;
    } else if (align === "center") {
      x = hostRect.left + (hostRect.width - popupWidth) / 2;
    } else if (align === "auto") {
      if (spaceOnRight < popupWidth && spaceOnLeft > popupWidth) {
        x = hostRect.right - popupWidth;
      } else {
        x = hostRect.left;
      }
    } else {
      x = hostRect.left;
    }

    const spaceBelow = globalThis.innerHeight - hostRect.bottom;
    const spaceAbove = hostRect.top;
    let y: number;
    x = Math.min(
      Math.max(8, x),
      Math.max(8, globalThis.innerWidth - popupWidth - 8),
    );
    if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
      y = hostRect.top - popupHeight - 4;
    } else {
      y = hostRect.bottom + 4;
    }
    y = Math.min(
      Math.max(8, y),
      Math.max(8, globalThis.innerHeight - popupHeight - 8),
    );

    realEl.style.position = "fixed";
    realEl.style.left = `${x}px`;
    realEl.style.top = `${y}px`;
    realEl.style.margin = "0";
  }

  open(popup: HTMLElement, anchor?: HTMLElement) {
    // If same popup and already visible, nothing to do
    if (this.#popup === popup && this.isPopupVisible(popup)) {
      return;
    }
    this.close();
    this.#popup = popup;
    this.#anchor = anchor ?? null;

    // Give the popup a stable id so we can find it even if the UA wraps
    // or replaces the node during `showPopover()`.
    const pid = `pggm-popup-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    if (this.#popup && typeof (this.#popup as any).dataset === "object") {
      (this.#popup as any).dataset.pggmPopupId = pid;
    }

    // Check if popup is already in the host's container (part of template).
    // Use getRootNode() when available to correctly detect ShadowRoot owners
    // (parentNode may be null for nodes inside a shadow DOM
    // `DocumentFragment`). Falling back to parentNode equality for older UAs.
    const container = (this.#host as any).shadowRoot || document.body;
    let wasAlreadyInContainer = false;
    const popupRoot = (this.#popup as any).getRootNode
      ? (this.#popup as any).getRootNode()
      : this.#popup.parentNode;
    wasAlreadyInContainer = popupRoot === container || this.#popup.parentNode === container;

    // Attach to the host's shadow root so the popup stays scoped to the
    // component. Fall back to `document.body` only when the host has no
    // shadowRoot (rare in our components).
    if (wasAlreadyInContainer) {
      this.#popupWasAppended = false;
    } else {
      container.appendChild(this.#popup);
      this.#popupWasAppended = true;
    }

    // Reset popover state - remove and re-add the attribute to clear any stale state
    if (this.#popup && typeof this.#popup.removeAttribute === "function") {
      this.#popup.removeAttribute("popover");
    }
    if (this.#popup && typeof this.#popup.setAttribute === "function") {
      this.#popup.setAttribute("popover", "");
    }

    // basic inline style defaults
    const el = this.#popup;
    el.style.position = "fixed";
    el.style.margin = "0";
    el.style.zIndex = "1000";

    // Inform optional hook before showing
    this.#options.onAttach?.(el);

    // Position before showing so left/top are present for styles
    this.positionPopup();

    // Use Popover API if available
    const anyPop = el as any;
    if (anyPop && typeof anyPop.showPopover === "function") {
      try {
        anyPop.showPopover();
      } catch {
        // ignore showPopover errors from UA
      }
    }

    // After show, ensure positioning again (double frame to allow reflow).
    // Also handle UAs that wrap/replace the element during showPopover.
    this.updatePopupAfterShow(el, pid, container);

    if (!this.#options.disableAutoOutsideHandler) {
      this.attachOutsideListeners();
    }
    this.addRepositionListeners();
  }

  toggle(popup: HTMLElement, anchor?: HTMLElement) {
    // Check if the popup is actually open/visible, not just if we have a reference
    const isOpen = this.#popup && this.isPopupVisible(this.#popup);
    if (isOpen) {
      this.close();
    } else {
      this.open(popup, anchor);
    }
  }

  private isPopupVisible(popup: HTMLElement): boolean {
    // Check if popup has 'open' attribute (Popover API)
    if (popup.hasAttribute("open")) return true;
    // Check if popup is in the DOM and visible
    if (!popup.isConnected) return false;
    // Check computed display style
    try {
      const style = globalThis.getComputedStyle(popup);
      return style.display !== "none" && style.visibility !== "hidden";
    } catch {
      return false;
    }
  }

  close() {
    if (!this.#popup) {
      return;
    }
    const p = this.#popup as any;
    if (p && typeof p.hidePopover === "function") {
      try {
        p.hidePopover();
      } catch {
        // ignore
      }
    }

    // Only remove element if it was dynamically appended by this controller
    // Don't remove if it's part of the shadow DOM template
    if (this.#popupWasAppended) {
      this.#popup.remove();
    }

    this.#options.onClose?.(this.#popup);

    this.#popup = null;
    this.#popupWasAppended = false;

    if (this.#outsideHandler) {
      if (typeof document?.removeEventListener === "function") {
        document.removeEventListener("pointerdown", this.#outsideHandler, true);
        document.removeEventListener("touchstart", this.#outsideHandler as any, true);
      }
      this.#outsideHandler = undefined;
    }
    if (this.#keydownHandler) {
      globalThis.removeEventListener("keydown", this.#keydownHandler, true);
      this.#keydownHandler = undefined;
    }

    this.removeRepositionListeners();
  }

  private attachOutsideListeners() {
    if (this.#outsideHandler) return;

    this.#outsideHandler = (e: Event) => {
      if (!this.#popup) return;
      const path = (e as MouseEvent).composedPath?.() as any[] | undefined;
      const nodes = Array.isArray(path) ? path : [e.target];

      const inside = nodes.some((n) => n === this.#popup || n === this.#host);

      if (inside) return;

      // Allow components to provide an insideSelector to treat more nodes as inside
      if (this.#options.insideSelector) {
        const found = nodes.some((n) => {
          if (!(n instanceof Element)) return false;
          const closest = (n as Element).closest;
          if (typeof closest !== "function") return false;
          try {
            return Boolean((n as Element).closest(this.#options.insideSelector!));
          } catch {
            return false;
          }
        });
        if (found) return;
      }

      // Click is outside -> close
      if (e.type === "mousedown") {
        // ignore mousedown if inside calendar-day selection semantics; leave
        // higher-level components to handle that via onClose hook if needed
      }

      this.close();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Use pointerdown (covers mouse/touch/pen) with capture to observe
        // the event before other handlers. Add touchstart as a fallback for
        // environments without pointer events.
        if (typeof document?.addEventListener === "function") {
          document.addEventListener("pointerdown", this.#outsideHandler!, true);
          document.addEventListener(
            "touchstart",
            this.#outsideHandler!,
            {passive: true, capture: true} as AddEventListenerOptions,
          );
        }
      });
    });

    this.#keydownHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        this.close();
      }
    };
    globalThis.addEventListener("keydown", this.#keydownHandler, true);
  }

  positionPopup() {
    if (!this.#popup) return;
    const anchorEl =
      (this.#anchor as HTMLElement) || (this.#host as any as HTMLElement);
    const hostRect = anchorEl.getBoundingClientRect();
    const popup = this.#popup;
    popup.style.position = "fixed";
    popup.style.zIndex = "1000";

    const prevVisibility = popup.style.visibility;
    popup.style.visibility = "hidden";

    const popupWidth = popup.offsetWidth || Math.max(100, hostRect.width);
    const popupHeight = popup.offsetHeight || 200;

    // Horizontal placement: respect configured horizontalAlign when
    // available. Mirror logic from applyPopupPosition to ensure consistent
    // placement between manual and replaced popup nodes.
    const align = this.#options.horizontalAlign || "left";
    const spaceOnRight = globalThis.innerWidth - hostRect.left;
    const spaceOnLeft = hostRect.right;

    let x: number;
    if (align === "right") {
      x = hostRect.right - popupWidth;
    } else if (align === "center") {
      x = hostRect.left + (hostRect.width - popupWidth) / 2;
    } else if (align === "auto") {
      if (spaceOnRight < popupWidth && spaceOnLeft > popupWidth) {
        x = hostRect.right - popupWidth;
      } else {
        x = hostRect.left;
      }
    } else {
      x = hostRect.left;
    }

    const spaceBelow = globalThis.innerHeight - hostRect.bottom;
    const spaceAbove = hostRect.top;
    let y: number;
    if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
      y = hostRect.top - popupHeight - 4;
    } else {
      y = hostRect.bottom + 4;
    }

    x = Math.min(
      Math.max(8, x),
      Math.max(8, globalThis.innerWidth - popupWidth - 8),
    );
    y = Math.min(
      Math.max(8, y),
      Math.max(8, globalThis.innerHeight - popupHeight - 8),
    );

    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.maxWidth = `${Math.max(100, globalThis.innerWidth - 16)}px`;
    popup.style.maxHeight = `${Math.max(100, globalThis.innerHeight - 16)}px`;

    popup.style.visibility = prevVisibility || "";
  }

  setHorizontalAlign(align: "auto" | "left" | "right" | "center") {
    this.#options.horizontalAlign = align;
  }

  private addRepositionListeners() {
    if (this.#repositionHandler) return;
    // Throttle reposition calls using requestAnimationFrame so rapid scroll
    // or resize events don't cause repeated layout work. We schedule a
    // single rAF per animation frame and call positionPopup once.
    let scheduled = false;
    const runner = () => {
      scheduled = false;
      this.positionPopup();
    };
    this.#repositionHandler = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(runner);
      }
    };
    globalThis.addEventListener("resize", this.#repositionHandler, {
      passive: true,
    });
    globalThis.addEventListener("scroll", this.#repositionHandler, {
      passive: true,
      capture: true,
    });
  }

  private removeRepositionListeners() {
    if (!this.#repositionHandler) return;
    globalThis.removeEventListener("resize", this.#repositionHandler as any);
    globalThis.removeEventListener(
      "scroll",
      this.#repositionHandler as any,
      true,
    );
    this.#repositionHandler = undefined;
  }

  disconnected() {
    this.close();
  }
}
