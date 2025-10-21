import css from "./p-component.css";

/**
 * @attr {boolean} name - sets the name to be greeted
 * @attribute {boolean} name - sets the name to be greeted
 *
 * @csspart bar - Styles the color of bar
 *
 * @slot - This is a default/unnamed slot
 * @slot footer - You can put some elements here
 *
 * @cssprop --greeting-clicked-background-color - Controls the color of the background when clicked
 * @cssproperty --greeting-background-color - Controls the color the background
 *
 * @prop {string} greetingPrefix - some description
 * @property {string} name - sets the name to be greeted
 *
 * @fires custom-event - some description for custom-event
 * @fires {Event} typed-event - some description for typed-event
 * @event {CustomEvent} typed-custom-event - some description for typed-custom-event
 *
 * @summary Boilerplate for creating a custom p-elements using esbuild
 *
 * @tag p-component
 * @tagname p-component
 */

@CustomElementConfig({
  tagName: "p-component",
})
export class PComponentElement extends CustomElement {
  constructor() {
    super();
    const template = this.templateFromString(
      `<style>${css}</style><div></div>`,
      true,
    );
    this.shadowRoot.appendChild(template);
    const rootElement = this.shadowRoot.querySelector("div");
    this.#getGreetingPrefix().then((greeting) => {
      this.#greetingPrefix = greeting;
      this.createProjector(rootElement, this.render);
    });
  }

  async #getGreetingPrefix() {
    const response = await fetch("/api/greet")
      .then((response) => response.json())
      .catch((e) => e);
    return response instanceof Error ? "Hello" : response.message;
  }

  #greetingPrefix: string;

  static readonly projectorMode = "replace";

  static readonly observedAttributes = ["name"];

  @RenderOnSet
  public name: string;

  private render = () => {
    return (
      <div class="greeting-container">
        <div class="greeting-header">
          <slot name="header"></slot>
        </div>
        <div class="greeting-aside">
          <slot name="aside"></slot>
        </div>
        <div class="greeting-main">
          <div class="greeting">{this.#greeting}</div>
          <slot></slot>
        </div>
        <div class="greeting-footer">
          <div>
            <span>© {new Date().getFullYear()}</span>
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    );
  };

  get #greeting(): VNode[] {
    return [
      <span>{this.#greetingPrefix}</span>,
      " ",
      <strong>{this.name ? this.name : "P-COMPONENT"}</strong>,
    ];
  }

  #onComponentClickHandler = () => {
    if (this.hasAttribute("clicked")) {
      this.removeAttribute("clicked");
    } else {
      this.setAttribute("clicked", "");
    }
  };

  connectedCallback() {
    this.addEventListener("click", this.#onComponentClickHandler);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#onComponentClickHandler);
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.name = newValue;
    }
  }
}
