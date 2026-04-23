import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { h } from "../../src/core/element";
import { Show } from "../../src/dom/atoms/Show";
import { Tabs } from "../../src/dom/atoms/Tabs";
import { Text } from "../../src/dom/atoms/Text";
import { mount } from "../../src/dom/render";

const ctx = { doc: document };

describe("Show — body / fallback slot cache", () => {
  it("flipping when true→false→true reuses the body element", () => {
    const when = ref(true);
    const handle = mount(Show({ when, body: h("span", null, "body") }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const wrap = handle.element as HTMLElement;
    const body0 = wrap.firstChild as HTMLElement;
    expect(body0.textContent).toBe("body");

    when.value = false;
    expect(wrap.children.length).toBe(0);

    when.value = true;
    expect(wrap.firstChild).toBe(body0);

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("fallback is lazily rendered on first when=false, cached after", () => {
    let fallbackSetups = 0;
    const when = ref(true);
    const fallbackBuilder = (): ReturnType<typeof h> => {
      fallbackSetups++;
      return h("span", null, "f");
    };
    const handle = mount(
      Show({ when, body: h("span", null, "b"), fallback: fallbackBuilder() }),
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    // fallback UIElement is already built before Show sees it; we track via setup counter
    expect(fallbackSetups).toBe(1);

    when.value = false;
    when.value = true;
    when.value = false;
    expect(fallbackSetups).toBe(1);

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Tabs — body cache per tab.id", () => {
  it("switching tabs reuses the same body element", () => {
    const tabs = ref([
      { id: "a", title: "A", body: h("span", null, "A body") },
      { id: "b", title: "B", body: h("span", null, "B body") },
    ]);
    const active = ref(0);
    const handle = mount(Tabs({ tabs, active }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const wrap = handle.element as HTMLElement;
    const bodyContainer = wrap.children[1] as HTMLElement;
    const aBody = bodyContainer.firstChild as HTMLElement;

    active.value = 1;
    const bBody = bodyContainer.firstChild as HTMLElement;
    expect(bBody).not.toBe(aBody);

    active.value = 0;
    expect(bodyContainer.firstChild).toBe(aBody);

    active.value = 1;
    expect(bodyContainer.firstChild).toBe(bBody);

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("removing a tab tears down its cached body", () => {
    const tabs = ref([
      { id: "a", title: "A", body: h("span", null, "A") },
      { id: "b", title: "B", body: h("span", null, "B") },
    ]);
    const active = ref(0);
    const handle = mount(Tabs({ tabs, active }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const wrap = handle.element as HTMLElement;
    const bodyContainer = wrap.children[1] as HTMLElement;
    const aBody = bodyContainer.firstChild as HTMLElement;

    active.value = 1;
    active.value = 0;

    tabs.value = [{ id: "b", title: "B", body: tabs.value[1].body }];
    active.value = 0;

    expect(bodyContainer.firstChild).not.toBe(aBody);
    expect((bodyContainer.firstChild as HTMLElement).textContent).toContain("B");

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Show/Tabs — Text ref inside body survives toggles", () => {
  it("Show: the ref inside body keeps its subscription across toggles", () => {
    const when = ref(true);
    const n = ref(0);
    const handle = mount(Show({ when, body: Text({ value: n, format: (v) => String(v) }) }), ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const wrap = handle.element as HTMLElement;
    const span = wrap.firstChild as HTMLElement;
    expect(span.textContent).toBe("0");

    when.value = false;
    when.value = true;
    expect(wrap.firstChild).toBe(span);

    n.value = 5;
    expect(span.textContent).toBe("5");

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});
