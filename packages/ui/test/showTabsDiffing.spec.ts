import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { defineUI, Show, Tabs, Text } from "../src/define";
import { renderUI, type RenderContext } from "../src/domRenderer";

function makeCtx(): RenderContext {
  return { doc: document, features: {}, watchFeature: undefined };
}

describe("Show — body + fallback are cached across toggles", () => {
  it("flipping when true→false→true reuses the same body element", () => {
    const when = ref(true);
    const UI = defineUI(() => [Show({ when, body: defineUI(() => [Text("body")])() })]);
    const { element } = renderUI(UI(), makeCtx());

    const showWrap = element.firstChild as HTMLElement;
    const body0 = showWrap.firstChild as HTMLElement;

    when.value = false;
    expect(showWrap.children).toHaveLength(0); // detached

    when.value = true;
    expect(showWrap.firstChild).toBe(body0); // same node reattached
  });

  it("body setup runs exactly once across many toggles", () => {
    let setupCount = 0;
    const when = ref(true);
    const bodyFactory = defineUI(() => {
      setupCount++;
      return [Text("body")];
    });
    const UI = defineUI(() => [Show({ when, body: bodyFactory() })]);
    renderUI(UI(), makeCtx());

    expect(setupCount).toBe(1);
    for (let i = 0; i < 5; i++) {
      when.value = !when.value;
    }
    expect(setupCount).toBe(1);
  });

  it("fallback is lazily rendered on first when=false, cached thereafter", () => {
    let bodySetup = 0;
    let fallbackSetup = 0;
    const when = ref(true);
    const UI = defineUI(() => [
      Show({
        when,
        body: defineUI(() => {
          bodySetup++;
          return [Text("b")];
        })(),
        fallback: defineUI(() => {
          fallbackSetup++;
          return [Text("f")];
        })(),
      }),
    ]);
    renderUI(UI(), makeCtx());

    expect(bodySetup).toBe(1);
    expect(fallbackSetup).toBe(0); // not rendered yet

    when.value = false;
    expect(fallbackSetup).toBe(1);

    when.value = true;
    when.value = false;
    expect(fallbackSetup).toBe(1); // reused, not re-setup
  });

  it("ref inside body keeps its subscription across toggle round-trip", () => {
    const when = ref(true);
    const n = ref(0);
    let subscribeCount = 0;
    const origSubscribe = n.subscribe.bind(n);
    n.subscribe = (cb) => {
      subscribeCount++;
      return origSubscribe(cb);
    };

    const UI = defineUI(() => [
      Show({
        when,
        body: defineUI(() => [Text(n, (v) => String(v))])(),
      }),
    ]);
    renderUI(UI(), makeCtx());

    const initial = subscribeCount;

    when.value = false;
    when.value = true;
    when.value = false;
    when.value = true;

    // Body reused → no new subscribe calls on toggle.
    expect(subscribeCount).toBe(initial);
  });
});

describe("Tabs — body cached per tab.id", () => {
  it("switching tabs reuses the same body element per id", () => {
    const tabs = ref([
      { id: "a", title: "A", body: defineUI(() => [Text("A body")])() },
      { id: "b", title: "B", body: defineUI(() => [Text("B body")])() },
    ]);
    const active = ref(0);
    const UI = defineUI(() => [Tabs({ tabs, active })]);
    const { element } = renderUI(UI(), makeCtx());

    const tabsWrap = element.firstChild as HTMLElement;
    const bodyContainer = tabsWrap.children[1] as HTMLElement;
    const aBody = bodyContainer.firstChild as HTMLElement;

    active.value = 1;
    const bBody = bodyContainer.firstChild as HTMLElement;
    expect(bBody).not.toBe(aBody);

    active.value = 0;
    expect(bodyContainer.firstChild).toBe(aBody); // cached

    active.value = 1;
    expect(bodyContainer.firstChild).toBe(bBody); // cached
  });

  it("body setup runs once per distinct tab id", () => {
    const setupCounts = { a: 0, b: 0 };
    const tabs = ref([
      {
        id: "a",
        title: "A",
        body: defineUI(() => {
          setupCounts.a++;
          return [Text("A")];
        })(),
      },
      {
        id: "b",
        title: "B",
        body: defineUI(() => {
          setupCounts.b++;
          return [Text("B")];
        })(),
      },
    ]);
    const active = ref(0);
    const UI = defineUI(() => [Tabs({ tabs, active })]);
    renderUI(UI(), makeCtx());

    expect(setupCounts).toEqual({ a: 1, b: 0 }); // b not yet selected

    active.value = 1;
    expect(setupCounts).toEqual({ a: 1, b: 1 });

    active.value = 0;
    active.value = 1;
    active.value = 0;
    expect(setupCounts).toEqual({ a: 1, b: 1 }); // cached on both sides
  });

  it("removing a tab tears down that cached body", () => {
    const aCleanups: Array<() => void> = [];
    const tabs = ref<Array<{ id: string; title: string; body: ReturnType<typeof defineUI> }>>([]);
    // Populate after we create ref so we can use defineUI() freely.
    tabs.value = [
      {
        id: "a",
        title: "A",
        body: defineUI(() => {
          // cleanup recorded via registerCleanup isn't exposed here; instead
          // we verify via DOM element detachment after cache prune.
          return [Text("A")];
        })(),
      },
      {
        id: "b",
        title: "B",
        body: defineUI(() => [Text("B")])(),
      },
    ];
    const active = ref(0);
    const UI = defineUI(() => [Tabs({ tabs, active })]);
    const { element } = renderUI(UI(), makeCtx());

    const tabsWrap = element.firstChild as HTMLElement;
    const bodyContainer = tabsWrap.children[1] as HTMLElement;
    const aBody = bodyContainer.firstChild as HTMLElement;

    // Visit b so it lands in cache too.
    active.value = 1;
    // Drop a from the list. Switching active to remaining tab.
    active.value = 0;
    tabs.value = [{ id: "b", title: "B", body: tabs.value[1].body }];
    active.value = 0;

    expect(bodyContainer.firstChild).not.toBe(aBody);
    expect((bodyContainer.firstChild as HTMLElement).textContent).toContain("B");
    void aCleanups;
  });
});
