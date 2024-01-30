import {PComponentElement} from "./p-component";
import {waitForSelector} from "@pggm/test-helpers";
describe("p-component custom element", () => {
  it("is defined", async () => {
    expect(PComponentElement).toBeDefined();
    await customElements.whenDefined("p-component");
  });
  describe("when no name attribute is set", () => {
    it("renders the default name", async () => {
      const element = document.createElement("p-component");
      document.body.appendChild(element);
      await customElements.whenDefined("p-component");
      const greeting = await waitForSelector(element.shadowRoot, ".greeting") as HTMLDivElement;
      expect(greeting.textContent).toBe("Hello P-COMPONENT!");
      element.remove();
    });
  });
  describe("when a name attribute is set", () => {
    it("renders the provided name", async () => {
      const element = document.createElement("p-component");
      element.setAttribute("name", "TEST");
      document.body.appendChild(element);
      await customElements.whenDefined("p-component");
      const greeting = await waitForSelector(element.shadowRoot, ".greeting") as HTMLDivElement;
      expect(greeting.textContent).toBe("Hello TEST!");
      element.remove();
    });
  });
});
