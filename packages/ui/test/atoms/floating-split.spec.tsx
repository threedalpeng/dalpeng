import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { h } from "../../src/core/element";
import { Floating } from "../../src/dom/atoms/Floating";
import { Split } from "../../src/dom/atoms/Split";
import { mount } from "../../src/dom/render";

const ctx = { doc: document };

describe("Floating — visible toggles portal mount", () => {
  it("body is not in DOM until visible=true, portaled into body", () => {
    const visible = ref(false);
    const handle = mount(
      Floating({ body: h("div", { class: "tooltip" }, "hi"), visible, x: 10, y: 20 }),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    expect(document.querySelector(".tooltip")).toBeNull();

    visible.value = true;
    const tooltip = document.querySelector(".tooltip") as HTMLElement;
    expect(tooltip).not.toBeNull();
    expect(tooltip.parentElement?.style.left).toBe("10px");
    expect(tooltip.parentElement?.style.top).toBe("20px");

    visible.value = false;
    expect(document.querySelector(".tooltip")).toBeNull();

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("reactive x/y Refs update position", () => {
    const visible = ref(true);
    const x = ref(5);
    const y = ref(15);
    const handle = mount(Floating({ body: h("div", { class: "ff" }, "a"), visible, x, y }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const floater = document.querySelector(".ff")!.parentElement!;
    expect(floater.style.left).toBe("5px");
    expect(floater.style.top).toBe("15px");

    x.value = 100;
    y.value = 200;
    expect(floater.style.left).toBe("100px");
    expect(floater.style.top).toBe("200px");

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("unmount cleans up portal body", () => {
    const visible = ref(true);
    const handle = mount(Floating({ body: h("div", { class: "x" }), visible, x: 0, y: 0 }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();
    expect(document.querySelector(".x")).not.toBeNull();

    handle.unmount();
    expect(document.querySelector(".x")).toBeNull();
    document.body.removeChild(handle.element);
  });
});

describe("Split — flex weights from Ref<number[]>", () => {
  it("initial sizes normalize into flexGrow ratios", () => {
    const sizes = ref([1, 1]);
    const handle = mount(
      Split({
        direction: "row",
        sizes,
        slots: [h("div", { class: "a" }), h("div", { class: "b" })],
      }),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    const container = handle.element as HTMLElement;
    const slotA = container.querySelector(".a")!.parentElement!;
    const slotB = container.querySelector(".b")!.parentElement!;
    expect(slotA.style.flexGrow).toBe("0.5");
    expect(slotB.style.flexGrow).toBe("0.5");

    sizes.value = [3, 1];
    expect(slotA.style.flexGrow).toBe("0.75");
    expect(slotB.style.flexGrow).toBe("0.25");

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("renders a drag handle between each pair of slots", () => {
    const sizes = ref([1, 1, 1]);
    const handle = mount(
      Split({
        direction: "column",
        sizes,
        slots: [h("div"), h("div"), h("div")],
      }),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    const container = handle.element as HTMLElement;
    // 3 slots + 2 handles between = 5 children
    expect(container.children.length).toBe(5);

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});
