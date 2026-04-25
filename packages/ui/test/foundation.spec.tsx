import { ref, type ReadonlyRef } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { createElement, defineWidget, Fragment, h, type Child } from "../src/core/element";
import { bindText, listen, type Cleanup } from "../src/dom/bindings";
import { mount, renderElement } from "../src/dom/render";

const ctx = { doc: document };

describe("Foundation — setup runs exactly once per component instance", () => {
  it("defineWidget setup body runs once even after many Ref writes", () => {
    let setupCalls = 0;
    const value = ref(0);

    const Counter = defineWidget<Record<string, never>>(() => {
      setupCalls++;
      return <div>{value}</div>;
    });

    const handle = mount(<Counter />, ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    expect(setupCalls).toBe(1);

    for (let i = 0; i < 10; i++) value.value = i + 1;
    expect(setupCalls).toBe(1);

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Foundation — Ref-prop precision", () => {
  it("Ref passed through props patches only the text node, no setup re-run", () => {
    let labelSetups = 0;
    const value = ref("initial");

    const Label = defineWidget<{ value: ReadonlyRef<string> | string }>(({ value }) => {
      labelSetups++;
      return <span>{value as Child}</span>;
    });

    const handle = mount(<Label value={value} />, ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    expect(labelSetups).toBe(1);
    expect((handle.element as HTMLElement).textContent).toBe("initial");

    value.value = "patched";
    expect(labelSetups).toBe(1);
    expect((handle.element as HTMLElement).textContent).toBe("patched");

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Foundation — detached no-fire", () => {
  it("post-unmount Ref writes do not touch the torn-down element", () => {
    const value = ref("alive");
    const handle = mount(<span>{value}</span>, ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const el = handle.element as HTMLElement;
    expect(el.textContent).toBe("alive");

    handle.unmount();
    const snapshot = el.textContent;
    value.value = "ghost";
    expect(el.textContent).toBe(snapshot);
  });

  it("a component's subscription count drops to zero after unmount", () => {
    const value = ref(0);
    let subscribeCalls = 0;
    const unsubCalls: Cleanup[] = [];
    const origSubscribe = value.subscribe.bind(value);
    value.subscribe = (cb) => {
      subscribeCalls++;
      const unsub = origSubscribe(cb);
      const wrapped = () => {
        unsubCalls.push(wrapped);
        unsub();
      };
      return wrapped;
    };

    const handle = mount(<div>{value}</div>, ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    expect(subscribeCalls).toBe(1);
    expect(unsubCalls).toHaveLength(0);

    handle.unmount();
    expect(unsubCalls).toHaveLength(1);

    value.value = 99;
    expect(subscribeCalls).toBe(1);
  });
});

describe("Foundation — idempotent cleanups", () => {
  it("bindText cleanup called twice is a no-op", () => {
    const value = ref("x");
    const node = document.createTextNode("");
    const unsub = bindText(node, value);
    unsub();
    expect(() => unsub()).not.toThrow();
    value.value = "y";
    expect(node.textContent).toBe("x");
  });

  it("listen cleanup called twice is a no-op", () => {
    const el = document.createElement("button");
    let clicks = 0;
    const unsub = listen(el, "click", () => clicks++);
    el.click();
    expect(clicks).toBe(1);
    unsub();
    unsub();
    el.click();
    expect(clicks).toBe(1);
  });
});

describe("Foundation — cleanup cascade in LIFO order", () => {
  it("unmount fires cleanups in reverse of registration (ref → child → bind/listen)", () => {
    const order: string[] = [];
    let capturedEl: Element | null = null;

    const Child = defineWidget<Record<string, never>>(() => (
      <span
        ref={(el) => {
          capturedEl = el;
          return () => order.push("child-ref-cleanup");
        }}
        onClick={() => void 0}
      />
    ));

    const Parent = defineWidget<Record<string, never>>(() => (
      <div
        ref={(el) => {
          void el;
          return () => order.push("parent-ref-cleanup");
        }}
      >
        <Child />
      </div>
    ));

    const handle = mount(<Parent />, ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    expect(capturedEl).not.toBeNull();
    expect(capturedEl!.isConnected).toBe(true);

    handle.unmount();

    // Parent's ref cleanup runs BEFORE the child subtree teardown.
    expect(order[0]).toBe("parent-ref-cleanup");
    expect(order[1]).toBe("child-ref-cleanup");
    document.body.removeChild(handle.element);
  });
});

describe("Foundation — afterMount post-commit", () => {
  it("ref callback fires with an attached DOM node", () => {
    let refEl: Element | null = null;
    let connectedAtCallback = false;

    const handle = mount(
      <div
        ref={(el) => {
          refEl = el;
          connectedAtCallback = el.isConnected;
        }}
      />,
      ctx
    );

    expect(refEl).toBeNull(); // not flushed before commit

    document.body.appendChild(handle.element);
    handle.commit();

    expect(refEl).not.toBeNull();
    expect(connectedAtCallback).toBe(true);
    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Foundation — h() parity with JSX", () => {
  it("same UI can be written via h() without JSX", () => {
    const greeting = ref("hi");
    const el = h("div", { class: "greet" }, greeting);
    const handle = mount(el, ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const dom = handle.element as HTMLElement;
    expect(dom.getAttribute("class")).toBe("greet");
    expect(dom.textContent).toBe("hi");

    greeting.value = "hello";
    expect(dom.textContent).toBe("hello");

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("Fragment groups siblings without a host wrapper", () => {
    const tree = createElement(Fragment, null, <span>a</span>, <span>b</span>);
    const handle = mount(tree, ctx);
    const container = document.createElement("div");
    container.appendChild(handle.element);
    handle.commit();

    expect(container.children.length).toBe(2);
    expect(container.children[0].tagName).toBe("SPAN");
    handle.unmount();
  });
});

describe("Foundation — Badge reference component", () => {
  const Badge = defineWidget<{ text: string; tone?: "default" | "warn" | "accent" }>(
    ({ text, tone = "default" }) => (
      <span class={`badge tone-${tone}`} style={{ padding: "2px 6px", borderRadius: "4px" }}>
        {text}
      </span>
    )
  );

  it("renders static props", () => {
    const handle = mount(<Badge text="pinned" tone="warn" />, ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const dom = handle.element as HTMLElement;
    expect(dom.tagName).toBe("SPAN");
    expect(dom.getAttribute("class")).toBe("badge tone-warn");
    expect(dom.textContent).toBe("pinned");
    expect(dom.style.padding).toBe("2px 6px");

    handle.unmount();
    document.body.removeChild(handle.element);
  });

  it("works the same via h() (no JSX)", () => {
    const el = h(Badge, { text: "raw", tone: "accent" });
    const handle = mount(el, ctx);
    document.body.appendChild(handle.element);
    handle.commit();

    const dom = handle.element as HTMLElement;
    expect(dom.getAttribute("class")).toBe("badge tone-accent");
    expect(dom.textContent).toBe("raw");

    handle.unmount();
    document.body.removeChild(handle.element);
  });
});

describe("Foundation — renderElement without mount", () => {
  it("returns a RenderResult with afterMount queue for manual flushing", () => {
    const result = renderElement(<div>hi</div>, ctx);
    expect(result.element).toBeInstanceOf(HTMLElement);
    expect(result.cleanups).toBeInstanceOf(Set);
    expect(Array.isArray(result.afterMount)).toBe(true);
  });
});
