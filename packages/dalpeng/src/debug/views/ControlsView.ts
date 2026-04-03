import type { DebugView } from "../panel";
import type { Application } from "@dalpeng/core";
import type { ControlGroup } from "../../ui/controlGroups";
import { renderTemplate } from "../../ui/domRenderer";
import { defineUI } from "../../ui/define";
import { createPersistStore } from "../persist";

export default class ControlsView implements DebugView {
  id = "controls";
  label = "Ctrl";
  shortcut = "2";

  #app!: Application;
  #container: HTMLElement | null = null;
  #groups: ControlGroup[] = [];
  #groupCleanups: Set<() => void>[] = [];

  setGroups(groups: ControlGroup[]): void {
    this.#groups = [...groups].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }

  mount(container: HTMLElement, app: Application): void {
    this.#app = app;
    this.#container = container;

    if (this.#groups.length === 0) return;

    const store = createPersistStore("dalpeng.debug.controls");
    const persisted = store.raw() as any;
    const sectionState: Record<string, boolean> = persisted.sections ?? {};

    for (const group of this.#groups) {
      // Create collapsible section
      const open = sectionState[group.id] !== undefined ? !!sectionState[group.id] : true;
      const section = this.#createSection(container, group.label, group.id, open, (id, isOpen) => {
        const prev = (store.get<Record<string, boolean>>("sections", {}) as any) || {};
        store.set("sections", { ...prev, [id]: isOpen });
      });

      // Render NodeDescriptors into the section body
      const template = defineUI(() => group._setup());
      const { element, cleanups } = renderTemplate(template, app);
      section.body.appendChild(element);

      group._cleanups = cleanups;
      this.#groupCleanups.push(cleanups);
    }
  }

  unmount(): void {
    // Clean up all reactive subscriptions
    for (const cleanups of this.#groupCleanups) {
      cleanups.forEach((fn) => fn());
      cleanups.clear();
    }
    this.#groupCleanups = [];

    if (this.#container) this.#container.innerHTML = "";
  }

  update(): void {
    if (!this.#app) return;

    for (const group of this.#groups) {
      if (group.update) {
        group.update(this.#app);
      }
    }
  }

  #createSection(
    parent: HTMLElement,
    label: string,
    id: string,
    open: boolean,
    onToggle: (id: string, open: boolean) => void
  ): { head: HTMLElement; body: HTMLElement } {
    const sec = document.createElement("div");
    sec.style.marginBottom = "8px";

    const head = document.createElement("button");
    head.textContent = `${open ? "▾" : "▸"} ${label}`;
    Object.assign(head.style, {
      cursor: "pointer",
      width: "100%",
      textAlign: "left",
      padding: "4px 6px",
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(255,255,255,0.08)",
      color: "#fff",
      borderRadius: "4px",
      margin: "0 0 4px 0",
    } as CSSStyleDeclaration);

    const body = document.createElement("div");
    body.style.display = open ? "block" : "none";
    body.style.paddingLeft = "12px";

    head.addEventListener("click", () => {
      const isClosed = body.style.display === "none";
      body.style.display = isClosed ? "block" : "none";
      head.textContent = `${isClosed ? "▾" : "▸"} ${label}`;
      onToggle(id, isClosed);
    });

    sec.appendChild(head);
    sec.appendChild(body);
    parent.appendChild(sec);

    return { head, body };
  }
}
