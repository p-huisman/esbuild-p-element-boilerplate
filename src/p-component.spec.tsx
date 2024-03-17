import {PComponentElement} from "./p-component";
import {expect} from "chai";

const waitForSelector = async (root: ShadowRoot, selector: string) => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const element = root.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 100);
  });
};

const pComponentTagName = "p-component";

describe("p-component custom element", () => {
  it("is defined", async () => {
    expect(PComponentElement).to.be.instanceof(Function);
    await customElements.whenDefined(pComponentTagName);
  });
  describe("when no name attribute is set", () => {
    it("renders the default name", async () => {
      const element = document.createElement(pComponentTagName);
      document.body.appendChild(element);
      await customElements.whenDefined(pComponentTagName);
      const greeting = (await waitForSelector(
        element.shadowRoot,
        ".greeting",
      )) as HTMLDivElement;
      expect(greeting.textContent).to.be.equal("Hello P-COMPONENT");
      element.remove();
    });
  });
  describe("when a name attribute is set", () => {
    it("renders the provided name", async () => {
      const element = document.createElement(pComponentTagName);
      element.setAttribute("name", "TEST");
      document.body.appendChild(element);
      await customElements.whenDefined(pComponentTagName);
      const greeting = (await waitForSelector(
        element.shadowRoot,
        ".greeting",
      )) as HTMLDivElement;
      expect(greeting.textContent).to.be.equal("Hello TEST");
      element.remove();
    });
  });
});
