import css from "./p-component.css";

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
    this.createProjector(rootElement, this.render);
  }

  static projectorMode = "replace";

  static observedAttributes = ["name"];

  @RenderOnSet
  public name: string;

  private render = () => {
    return (
      <div class="greeting-container">
        <div class="greeting-header">Header</div>
        <div class="greeting-aside">Aside</div>
        <div class="greeting-main">{this.#greeting}</div>
        <div class="greeting-footer">Footer</div>
      </div>
    );
  };

  get #greeting(): VNode[] {
    return [
      <span>Hello</span>,
      " ",
      <strong>{this.name ? this.name : "P-COMPONENT"}</strong>,
    ];
  }

  #onComponentClickHandler = () => {
    this.setAttribute("clicked", "");
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
