export class FocusGroupController<
  T extends HTMLElement,
> extends CustomElementController {
  constructor(
    hostElement: CustomElement,
    private options: {
      direction: "horizontal" | "vertical" | "both";
      disableTabIndexManagement?: boolean;
      elements: () => T[];
      isFocusableElement: (el: T) => boolean;
      directionLength?: number;
    },
  ) {
    super(hostElement);
    if (this.options.directionLength) {
      this.#directionLength = this.options.directionLength;
    }
  }

  #currentFocused: T = null;

  #cachedElements: T[] = [];

  #directionLength = 1;

  #initElements(): void {
    this.#removeEventHandlers(this.#cachedElements);
    this.#cachedElements = [];
    const elements = this.options.elements();
    this.#addEventHandlers(elements);
    this.#currentFocused = null;
    this.#cachedElements = elements;
    this.#initTabIndexes(elements);
  }

  #initTabIndexes(elements: T[]): void {
    if (elements.length === 0) {
      return;
    }
    elements.forEach((element) => {
      element.dataset.focusGroup = true.toString();
      if (!this.options.disableTabIndexManagement) {
        element.tabIndex = -1;
      }
    });

    const allFocusable = elements.filter((el) =>
      this.options.isFocusableElement(el),
    );

    if (!this.#currentFocused) {
      this.#currentFocused = allFocusable[0]; //elements[0];
    }
    if (this.#currentFocused && !this.options.disableTabIndexManagement) {
      this.#currentFocused.tabIndex = 0;
    }
  }

  #addEventHandlers(elements: T[]): void {
    elements.forEach((element) => {
      element.addEventListener("focus", this.#onFocus);
      element.addEventListener("keydown", this.#onKeyDown);
    });
  }

  #removeEventHandlers(elements: T[]): void {
    elements.forEach((element) => {
      element?.removeEventListener("focus", this.#onFocus);
      element?.removeEventListener("keydown", this.#onKeyDown);
    });
  }

  pause() {
    this.#removeEventHandlers(this.#cachedElements);
  }

  resume() {
    this.#addEventHandlers(this.#cachedElements);
  }

  #onFocus = (event: FocusEvent): void => {
    if (!this.options.disableTabIndexManagement) {
      const target = event.target as T;
      this.#cachedElements.forEach((element) => {
        if (element !== target) {
          element.tabIndex = -1;
        } else {
          element.tabIndex = 0;
        }
      });
    }
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    // Ignore bubbled key events: only handle when the listener's element
    // is the current active/focused element. This prevents ancestor
    // focus controllers from responding to key events originating in
    // nested submenus.
    const listenerElement = event.currentTarget as T | null;
    const targetNode = event.target as Node | null;
    if (listenerElement) {
      const originatedInside = targetNode && listenerElement.contains(targetNode);
      if (!originatedInside && document && document.activeElement !== listenerElement && this.#currentFocused !== listenerElement) {
        return;
      }
    }
    const keys = ["End", "Home"];
    if (this.options.direction === "both") {
      keys.push("ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown");
    } else if (this.options.direction === "horizontal") {
      keys.push("ArrowLeft", "ArrowRight");
    } else if (this.options.direction === "vertical") {
      keys.push("ArrowUp", "ArrowDown");
    }
    if (keys.includes(event.key)) {
      event.preventDefault();
      try {
        event.stopPropagation();
      } catch {
        /* ignore */
      }
      if (event.key === "End") {
        this.#focusLast();
      } else if (event.key === "Home") {
        this.#focusFirst();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        let nrOfItems = 1;
        if (event.key === "ArrowUp") {
          nrOfItems = this.#directionLength;
        }
        this.#focusPrevious(nrOfItems);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        let nrOfItems = 1;
        if (event.key === "ArrowDown") {
          nrOfItems = this.#directionLength;
        }
        this.#focusNext(nrOfItems);
      }
    }
  };

  focusElement(element?: T, focusOptions?: FocusOptions): void {
    if (!element) {
      this.#focusFirst();
      return;
    }
    this.#currentFocused = element;
    element.focus(focusOptions);
  }

  #focusFirst(options?: FocusOptions): void {
    const elements = this.#cachedElements;
    const focusable = elements.filter((el) =>
      this.options.isFocusableElement(el),
    );
    const first = focusable[0];
    if (first) {
      this.#currentFocused = first;
      first.focus(options);
    }
  }

  #focusLast(options?: FocusOptions): void {
    const elements = this.#cachedElements;
    const focusable = elements.filter((el) =>
      this.options.isFocusableElement(el),
    );
    const last = focusable[focusable.length - 1];
    if (last) {
      this.#currentFocused = last;
      last.focus(options);
    }
  }

  #focusPrevious(nr: number, options?: FocusOptions): void {
    const elements = this.#cachedElements;
    const currentIndex = elements.indexOf(this.#currentFocused);
    const previous = elements[currentIndex - nr];
    if (!previous) {
      if (this.options.direction !== "both") {
        this.#focusLast();
      }
      return;
    }

    if (
      !this.options.isFocusableElement(previous) &&
      this.options.direction === "both"
    ) {
      return;
    }

    this.#currentFocused = previous;
    if (!this.options.isFocusableElement(previous)) {
      if (this.options.direction !== "both") {
        this.#focusPrevious(1);
      }
    } else {
      previous.focus(options);
    }
  }

  #focusNext(nr: number, options?: FocusOptions): void {
    const elements = this.#cachedElements;
    const currentIndex = elements.indexOf(this.#currentFocused);
    const next = elements[currentIndex + nr];
    if (!next) {
      if (this.options.direction !== "both") {
        this.#focusFirst(options);
      }
      return;
    }

    if (
      !this.options.isFocusableElement(next) &&
      this.options.direction === "both"
    ) {
      return;
    }

    this.#currentFocused = next;
    if (!this.options.isFocusableElement(next)) {
      if (this.options.direction !== "both") {
        this.#focusNext(1, options);
      }
    } else {
      next.focus(options);
    }
  }

  updateElements() {
    this.#initElements();
  }

  connected(): void {
    this.hostElement?.shadowRoot?.addEventListener("slotchange", () => {
      this.updateElements();
    });
    this.updateElements();
  }

  disconnected(): void {
    this.#removeEventHandlers(this.#cachedElements);
    this.#cachedElements = [];
  }
}
