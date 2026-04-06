import css from "./p-component.css";

import "./components/dropdown/dropdown";
import "./components/dropdown/dropdown-item";
import "./components/combobox/combobox";
import "./components/combobox/combobox-item";
import "./components/page/page";
import "./components/page-navigation-menu/navigation-menu";
import "./components/page-navigation-menu/nav-section";
import "./components/page-navigation-menu/nav-category";
import "./components/page-navigation-menu/nav-item";
import "./components/page-header/page-header";

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

  static projectorMode = "replace";

  static observedAttributes = ["name"];

  @RenderOnSet
  public name: string;

  private handleSubmit = (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    console.log(formData.getAll("test"));
  };

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

          <form onsubmit={this.handleSubmit}>
            <p>
              <pggm-combobox multiple name="test" value="banana" required="required" min="2">
                <pggm-combobox-item value="apple">Apple
                  <span slot="details">Apple details</span>
                </pggm-combobox-item>
                <pggm-combobox-item value="banana">Banana
                  <span slot="details">Banana details</span>
                </pggm-combobox-item>
                <pggm-combobox-item value="orange">Orange
                  <span slot="details">Orange details</span>
                </pggm-combobox-item>
              </pggm-combobox>
            </p>
            <p>
              <pggm-combobox name="test2" value="banana">
                <pggm-combobox-item value="apple">Apple</pggm-combobox-item>
                <pggm-combobox-item value="banana">Banana</pggm-combobox-item>
                <pggm-combobox-item value="orange">Orange</pggm-combobox-item>
              </pggm-combobox>
            </p>
            <button type="submit">Submit</button>
          </form>

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
    this.hasAttribute("clicked")
      ? this.removeAttribute("clicked")
      : this.setAttribute("clicked", "");
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
