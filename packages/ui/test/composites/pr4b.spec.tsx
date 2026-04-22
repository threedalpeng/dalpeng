import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { h } from "../../src/core/element";
import { Row } from "../../src/dom/composites/Row";
import { Section } from "../../src/dom/composites/Section";
import { Toolbar } from "../../src/dom/composites/Toolbar";
import { mount } from "../../src/dom/render";

const ctx = { doc: document };

describe("Toolbar composite", () => {
  it("renders children in a horizontal strip with toolbar role", () => {
    const handle = mount(h(Toolbar, null, h("span", null, "a"), h("span", null, "b")), ctx);
    const el = handle.element as HTMLElement;
    expect(el.getAttribute("role")).toBe("toolbar");
    expect(el.textContent).toBe("ab");
    expect(el.style.display).toBe("flex");
    handle.unmount();
  });

  it("compact density tightens padding + minHeight", () => {
    const compact = mount(h(Toolbar, { density: "compact" }, "x"), ctx);
    const comfortable = mount(h(Toolbar, { density: "comfortable" }, "x"), ctx);
    expect((compact.element as HTMLElement).style.minHeight).toBe("28px");
    expect((comfortable.element as HTMLElement).style.minHeight).toBe("40px");
    compact.unmount();
    comfortable.unmount();
  });

  it("align=between sets space-between", () => {
    const handle = mount(h(Toolbar, { align: "between" }, "a"), ctx);
    expect((handle.element as HTMLElement).style.justifyContent).toBe("space-between");
    handle.unmount();
  });

  it("border=true adds bottom border", () => {
    const handle = mount(h(Toolbar, { border: true }, "x"), ctx);
    expect((handle.element as HTMLElement).style.borderBottom).toBe("1px solid");
    handle.unmount();
  });
});

describe("Row composite", () => {
  it("renders label content in middle slot", () => {
    const handle = mount(h(Row, null, "hello"), ctx);
    expect(handle.element.textContent).toBe("hello");
    handle.unmount();
  });

  it("leading + trailing slots render", () => {
    const handle = mount(h(Row, { leading: "L", trailing: "R" }, "M"), ctx);
    expect(handle.element.textContent).toBe("LMR");
    handle.unmount();
  });

  it("subtitle renders on second line with secondary color", () => {
    const handle = mount(h(Row, { subtitle: "sub" }, "main"), ctx);
    expect(handle.element.textContent).toBe("mainsub");
    handle.unmount();
  });

  it("onClick triggers + gives row role=button", () => {
    let count = 0;
    const handle = mount(h(Row, { onClick: () => count++ }, "click me"), ctx);
    (handle.element as HTMLElement).click();
    expect(count).toBe(1);
    expect((handle.element as HTMLElement).getAttribute("role")).toBe("button");
    handle.unmount();
  });

  it("selected=true uses primary.muted bg", () => {
    const handle = mount(h(Row, { selected: true }, "x"), ctx);
    expect((handle.element as HTMLElement).style.background).toBe("var(--ui-color-primary-muted)");
    handle.unmount();
  });
});

describe("Section composite", () => {
  it("renders title + body text", () => {
    const handle = mount(h(Section, { title: "Cameras" }, "body content"), ctx);
    expect(handle.element.textContent).toContain("Cameras");
    expect(handle.element.textContent).toContain("body content");
    handle.unmount();
  });

  it("defaultCollapsed=true hides body initially", () => {
    const handle = mount(h(Section, { title: "X", defaultCollapsed: true }, "hidden"), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const bodyDiv = (handle.element as HTMLElement).children[1] as HTMLElement;
    expect(bodyDiv.style.display).toBe("none");
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("header click toggles uncontrolled state", () => {
    const handle = mount(h(Section, { title: "X" }, "body"), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    const root = handle.element as HTMLElement;
    const header = root.children[0] as HTMLElement;
    const body = root.children[1] as HTMLElement;
    expect(body.style.display).toBe("block");
    header.click();
    expect(body.style.display).toBe("none");
    header.click();
    expect(body.style.display).toBe("block");
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("controlled via Ref — external state wins", () => {
    const collapsed = ref(false);
    let lastToggle: boolean | null = null;
    const handle = mount(
      h(
        Section,
        {
          title: "X",
          collapsed,
          onToggle: (next) => {
            lastToggle = next;
            collapsed.value = next;
          },
        },
        "body"
      ),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();
    const body = (handle.element as HTMLElement).children[1] as HTMLElement;
    expect(body.style.display).toBe("block");
    (handle.element as HTMLElement).children[0]!.dispatchEvent(
      new Event("click", { bubbles: true })
    );
    expect(lastToggle).toBe(true);
    expect(body.style.display).toBe("none");
    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("actions slot renders without triggering header click", () => {
    let sectionClicks = 0;
    let actionClicks = 0;
    const handle = mount(
      h(
        Section,
        {
          title: "X",
          onToggle: () => sectionClicks++,
          actions: h("button", { onClick: () => actionClicks++ }, "act"),
        },
        "body"
      ),
      ctx
    );
    const root = handle.element as HTMLElement;
    // Click the action button — onToggle should not fire.
    const actionBtn = root.querySelector("button")!;
    actionBtn.click();
    expect(actionClicks).toBe(1);
    expect(sectionClicks).toBe(0);
    handle.unmount();
  });
});
