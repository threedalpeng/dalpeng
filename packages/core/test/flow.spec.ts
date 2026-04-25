import { describe, expect, it, vi } from "vitest";
import { computed, isRef, ref } from "../src/runtime/flow";
import { watch } from "../src/runtime/pipeline";

describe("ref", () => {
  it("stores and updates value", () => {
    const r = ref(1);
    expect(r.value).toBe(1);
    r.value = 2;
    expect(r.value).toBe(2);
  });

  it("notifies subscribers on change", () => {
    const r = ref("a");
    const cb = vi.fn();
    r.subscribe(cb);
    r.value = "b";
    expect(cb).toHaveBeenCalledWith("b", "a");
  });

  it("skips notification when value is identical", () => {
    const r = ref(1);
    const cb = vi.fn();
    r.subscribe(cb);
    r.value = 1;
    expect(cb).not.toHaveBeenCalled();
  });

  it("subscribe returns unsubscribe", () => {
    const r = ref(0);
    const cb = vi.fn();
    const unsub = r.subscribe(cb);
    unsub();
    r.value = 1;
    expect(cb).not.toHaveBeenCalled();
  });
});

describe("computed", () => {
  it("derives value from a single ref", () => {
    const a = ref(2);
    const doubled = computed(() => a.value * 2);
    expect(doubled.value).toBe(4);
    a.value = 5;
    expect(doubled.value).toBe(10);
  });

  it("derives value from multiple refs", () => {
    const a = ref(1);
    const b = ref(2);
    const sum = computed(() => a.value + b.value);
    expect(sum.value).toBe(3);
    a.value = 10;
    expect(sum.value).toBe(12);
    b.value = 20;
    expect(sum.value).toBe(30);
  });

  it("notifies subscribers when result changes", () => {
    const a = ref(1);
    const doubled = computed(() => a.value * 2);
    const cb = vi.fn();
    doubled.subscribe(cb);
    a.value = 3;
    expect(cb).toHaveBeenCalledWith(6, 2);
  });

  it("does not notify subscribers when result is unchanged", () => {
    const a = ref(1);
    const isPositive = computed(() => a.value > 0);
    const cb = vi.fn();
    isPositive.subscribe(cb);
    // Changes input but result stays true
    a.value = 5;
    expect(cb).not.toHaveBeenCalled();
    // Now flips
    a.value = -1;
    expect(cb).toHaveBeenCalledWith(false, true);
  });

  it("supports nested computed (computed depending on computed)", () => {
    const a = ref(2);
    const doubled = computed(() => a.value * 2);
    const quadrupled = computed(() => doubled.value * 2);
    expect(quadrupled.value).toBe(8);
    a.value = 3;
    expect(quadrupled.value).toBe(12);
  });

  it("re-tracks dependencies when getter takes a different branch", () => {
    const flag = ref(true);
    const a = ref(10);
    const b = ref(100);
    const picked = computed(() => (flag.value ? a.value : b.value));
    expect(picked.value).toBe(10);

    // Switch branch — now b should be the dependency, not a.
    flag.value = false;
    expect(picked.value).toBe(100);

    // Changing a should NOT trigger a notification anymore.
    const cb = vi.fn();
    picked.subscribe(cb);
    a.value = 999;
    expect(cb).not.toHaveBeenCalled();

    // Changing b should.
    b.value = 200;
    expect(cb).toHaveBeenCalledWith(200, 100);
  });

  it("notifies eagerly so subscribers do not miss intermediate changes", () => {
    const a = ref(1);
    const c = computed(() => a.value * 10);
    const seen: number[] = [];
    c.subscribe((v) => seen.push(v));
    a.value = 2;
    a.value = 3;
    expect(seen).toEqual([20, 30]);
  });
});

describe("watch", () => {
  it("subscribes to a Ref and fires on change", () => {
    const r = ref(0);
    const cb = vi.fn();
    watch(r, cb);
    r.value = 1;
    expect(cb).toHaveBeenCalledWith(1, 0);
  });

  it("subscribes to a ReadonlyRef (computed)", () => {
    const a = ref(1);
    const doubled = computed(() => a.value * 2);
    const cb = vi.fn();
    watch(doubled, cb);
    a.value = 3;
    expect(cb).toHaveBeenCalledWith(6, 2);
  });

  it("immediate option fires once with current value", () => {
    const r = ref("hi");
    const cb = vi.fn();
    watch(r, cb, { immediate: true });
    expect(cb).toHaveBeenCalledWith("hi", "hi");
  });

  it("returns unsubscribe", () => {
    const r = ref(0);
    const cb = vi.fn();
    const unsub = watch(r, cb);
    unsub();
    r.value = 1;
    expect(cb).not.toHaveBeenCalled();
  });
});

describe("isRef", () => {
  it("recognizes refs", () => {
    expect(isRef(ref(0))).toBe(true);
  });

  it("recognizes computed", () => {
    expect(isRef(computed(() => 1))).toBe(true);
  });

  it("rejects non-refs", () => {
    expect(isRef(0)).toBe(false);
    expect(isRef(null)).toBe(false);
    expect(isRef(undefined)).toBe(false);
    expect(isRef({ value: 1 })).toBe(false);
    expect(isRef("a")).toBe(false);
  });
});
