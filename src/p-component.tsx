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
      <div class="greeting">Hello {this.name ? this.name : "P-COMPONENT"}!</div>
    );
  };

  private onComponentClickHandler = () => {
    console.log("PComponentElement clicked");
  };

  connectedCallback() {
    this.addEventListener("click", this.onComponentClickHandler);
  }

  attributeChangedCallback(
    name: string,
    oldValue: string,
    newValue: string,
  ) {
    if (oldValue !== newValue) {
      this.name = newValue;
    }
  }
}
