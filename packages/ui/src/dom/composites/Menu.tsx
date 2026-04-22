import { ref, type Ref } from "@dalpeng/core";
import type { UIElement } from "../../core/element";
import type { Cleanup } from "../bindings";

export interface MenuItem {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface MenuOpts {
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
  /** External focus index (for persistent focus across rebuilds). Default: fresh internal ref. */
  focusIndex?: Ref<number>;
}

/**
 * Keyboard-navigable vertical menu. ArrowUp/Down wraps, skipping disabled.
 * Enter / Space selects. Click selects (and updates focus).
 */
export function Menu(opts: MenuOpts): UIElement;
export function Menu(items: MenuItem[], onSelect: (item: MenuItem) => void): UIElement;
export function Menu(
  optsOrItems: MenuOpts | MenuItem[],
  onSelect?: (item: MenuItem) => void
): UIElement {
  const resolved: MenuOpts = Array.isArray(optsOrItems)
    ? { items: optsOrItems, onSelect: onSelect! }
    : optsOrItems;

  return (
    <ul
      tabindex={0}
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        outline: "none",
      }}
      ref={(el) => initMenu(el as HTMLUListElement, resolved)}
    />
  );
}

function initMenu(ul: HTMLUListElement, opts: MenuOpts): Cleanup {
  const doc = ul.ownerDocument;
  const focusIndex = opts.focusIndex ?? ref(0);
  const { items, onSelect } = opts;

  const liElements: HTMLLIElement[] = items.map((item) => {
    const li = doc.createElement("li");
    li.style.cssText = `padding:2px 4px;cursor:${item.disabled ? "default" : "pointer"};${item.disabled ? "opacity:0.4" : ""}`;
    return li;
  });

  const updateHighlight = (idx: number): void => {
    liElements.forEach((li, i) => {
      const item = items[i];
      const cursor = i === idx ? "> " : "  ";
      li.textContent = cursor + item.label;
      li.style.backgroundColor = i === idx ? "rgba(255,255,255,0.15)" : "";
      li.style.color = i === idx && !item.disabled ? "#fff" : "";
    });
  };

  const abortCtrl = new AbortController();
  const signal = abortCtrl.signal;

  liElements.forEach((li, i) => {
    li.addEventListener(
      "click",
      () => {
        if (items[i].disabled) return;
        focusIndex.value = i;
        onSelect(items[i]);
      },
      { signal }
    );
    ul.appendChild(li);
  });

  updateHighlight(focusIndex.value);
  const unsubFocus = focusIndex.subscribe(updateHighlight);

  ul.addEventListener(
    "keydown",
    (e) => {
      const count = items.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        let next = (focusIndex.value + 1) % count;
        while (items[next].disabled && next !== focusIndex.value) next = (next + 1) % count;
        focusIndex.value = next;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        let prev = (focusIndex.value - 1 + count) % count;
        while (items[prev].disabled && prev !== focusIndex.value) prev = (prev - 1 + count) % count;
        focusIndex.value = prev;
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const focused = items[focusIndex.value];
        if (!focused.disabled) onSelect(focused);
      }
    },
    { signal }
  );

  return () => {
    unsubFocus();
    abortCtrl.abort();
  };
}
