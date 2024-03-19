import {PComponentElement} from "./p-component";

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
    expect(PComponentElement).toBeDefined();
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
      expect(greeting.textContent).toBe("Hello P-COMPONENT");
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
      expect(greeting.textContent).toBe("Hello TEST");
      element.remove();
    });
  });
  describe("when clicked", () => {
    it(" a clicked attribute is added", async () => {
      const element = document.createElement(pComponentTagName);
      document.body.appendChild(element);
      await customElements.whenDefined(pComponentTagName);
      element.click();
      expect(element.hasAttribute("clicked")).toBeTrue();
      element.remove();
    });
  });
});
