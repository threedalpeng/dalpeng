import { ref } from "@dalpeng/core";
import { describe, expect, it } from "vitest";
import { Suspense } from "../src/dom/composites/Suspense";
import { mount } from "../src/dom/render";

const ctx = { doc: document };

describe("Suspense — fallback while pending, children when ready", () => {
  it("renders fallback while pending=true", () => {
    const loading = ref(true);

    const handle = mount(
      <Suspense pending={loading} fallback={<span class="fb">Loading…</span>}>
        <span class="ok">Done</span>
      </Suspense>,
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    expect(handle.element.querySelector(".fb")).not.toBeNull();
    expect(handle.element.querySelector(".ok")).toBeNull();

    handle.unmount();
    handle.element.remove();
  });

  it("flips to children when pending becomes false", () => {
    const loading = ref(true);

    const handle = mount(
      <Suspense pending={loading} fallback={<span class="fb">L</span>}>
        <span class="ok">D</span>
      </Suspense>,
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    loading.value = false;

    expect(handle.element.querySelector(".fb")).toBeNull();
    expect(handle.element.querySelector(".ok")).not.toBeNull();

    handle.unmount();
    handle.element.remove();
  });

  it("multi-source — fallback while ANY pending is true", () => {
    const a = ref(true);
    const b = ref(false);

    const handle = mount(
      <Suspense pending={[a, b]} fallback={<span class="fb">L</span>}>
        <span class="ok">D</span>
      </Suspense>,
      ctx
    );
    document.body.appendChild(handle.element);
    handle.commit();

    // a=true, b=false → still pending
    expect(handle.element.querySelector(".fb")).not.toBeNull();

    a.value = false;
    // both false → ready
    expect(handle.element.querySelector(".ok")).not.toBeNull();
    expect(handle.element.querySelector(".fb")).toBeNull();

    b.value = true;
    // any true → pending
    expect(handle.element.querySelector(".fb")).not.toBeNull();

    handle.unmount();
    handle.element.remove();
  });
});
