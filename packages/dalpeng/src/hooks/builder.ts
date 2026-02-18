// Fluent overlay UI builder (self-contained helpers)

function _makeSection(parent: HTMLElement, label: string, open = true, indent = 0) {
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
  if (indent > 0) {
    head.style.marginLeft = `${indent}px`;
    // Prevent the header from visually overflowing the parent's rounded corners
    head.style.boxSizing = "border-box";
    head.style.width = `calc(100% - ${indent}px)`;
  }
  const body = document.createElement("div");
  body.style.display = open ? "block" : "none";
  head.addEventListener("click", () => {
    const isClosed = body.style.display === "none";
    body.style.display = isClosed ? "block" : "none";
    head.textContent = `${isClosed ? "▾" : "▸"} ${label}`;
  });
  sec.appendChild(head);
  sec.appendChild(body);
  parent.appendChild(sec);
  return { head, body } as const;
}

function _makeRow(parent: HTMLElement, label: string, control: HTMLElement, indent = 0) {
  const row = document.createElement("label");
  Object.assign(row.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    margin: "4px 0",
  } as CSSStyleDeclaration);
  if (indent > 0) {
    row.style.marginLeft = `${indent}px`;
    row.style.paddingLeft = `8px`;
    row.style.borderLeft = "1px solid rgba(255,255,255,0.12)";
  }
  const span = document.createElement("span");
  span.textContent = label;
  row.appendChild(control);
  row.appendChild(span);
  parent.appendChild(row);
  return row;
}

function _makeSlider(
  parent: HTMLElement,
  key: string | null,
  label: string,
  init: number,
  min: number,
  max: number,
  step: number,
  onChange: (v: number) => void,
  indent = 0
): { range: HTMLInputElement; valueDisplay: HTMLElement } {
  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    columnGap: "6px",
    rowGap: "4px",
    margin: "6px 0",
  } as CSSStyleDeclaration);
  if (indent > 0) {
    wrap.style.marginLeft = `${indent}px`;
    wrap.style.paddingLeft = `8px`;
    wrap.style.borderLeft = "1px solid rgba(255,255,255,0.12)";
  }
  const l = document.createElement("div");
  l.textContent = label;
  const r = document.createElement("input");
  r.type = "range";
  if (key) (r as any).dataset.key = key;
  r.min = String(min);
  r.max = String(max);
  r.step = String(step);
  r.value = String(init);
  const v = document.createElement("div");
  v.style.textAlign = "right";
  v.textContent = Number(init).toFixed(2);
  r.addEventListener("input", () => {
    const n = parseFloat(r.value);
    v.textContent = n.toFixed(2);
    onChange(n);
  });
  wrap.appendChild(l);
  wrap.appendChild(r);
  wrap.appendChild(v);
  parent.appendChild(wrap);
  onChange(init);
  return { range: r, valueDisplay: v };
}

export type PersistStore = {
  get<T>(k: string, fallback: T): T;
  set<T>(k: string, v: T): void;
};

export type ControlHandle = {
  type: "checkbox" | "slider" | "select";
  element: HTMLInputElement | HTMLSelectElement;
  setValue: (v: any) => void;
};

export class OverlayBuilder {
  constructor(
    private parent: HTMLElement,
    private store: PersistStore,
    private indent = 0,
    private onSectionToggle?: (id: string, open: boolean) => void,
    private sectionState?: Record<string, boolean>,
    private controls: Map<string, ControlHandle> = new Map()
  ) {}

  group(label: string, id: string, build: (b: OverlayBuilder) => void) {
    const open =
      this.sectionState && this.sectionState[id] !== undefined ? !!this.sectionState[id] : true;
    const sec = _makeSection(this.parent, label, open, this.indent);
    sec.head.addEventListener("click", () => {
      const isOpen = sec.body.style.display !== "none";
      this.onSectionToggle && this.onSectionToggle(id, isOpen);
    });
    const child = new OverlayBuilder(
      sec.body,
      this.store,
      this.indent + 12,
      this.onSectionToggle,
      this.sectionState,
      this.controls
    );
    build(child);
    return this;
  }

  checkbox(key: string, label: string, init: boolean, onChange: (v: boolean) => void) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.key = key;
    const val = this.store.get<boolean>(key, init);
    input.checked = val;
    onChange(val);
    input.addEventListener("change", () => {
      onChange(input.checked);
      this.store.set<boolean>(key, input.checked);
    });
    this.controls.set(key, {
      type: "checkbox",
      element: input,
      setValue: (v: boolean) => {
        input.checked = !!v;
        onChange(!!v);
        this.store.set(key, !!v);
      },
    });
    _makeRow(this.parent, label, input, this.indent + 12);
    return this;
  }

  slider(
    key: string,
    label: string,
    init: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void
  ) {
    const storedVal = this.store.get<number>(key, init);
    const { range, valueDisplay } = _makeSlider(
      this.parent,
      key,
      label,
      storedVal,
      min,
      max,
      step,
      (n) => onChange(n),
      this.indent + 12
    );
    this.controls.set(key, {
      type: "slider",
      element: range,
      setValue: (v: number) => {
        range.value = String(v);
        valueDisplay.textContent = Number(v).toFixed(2);
        onChange(v);
        this.store.set(key, v);
      },
    });
    return this;
  }

  select(
    key: string,
    label: string,
    options: { value: string; label: string }[],
    init: string,
    onChange: (v: string) => void
  ) {
    const select = document.createElement("select");
    options.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      select.appendChild(opt);
    });
    const val = this.store.get<string>(key, init);
    select.value = val;
    onChange(select.value);
    select.addEventListener("change", () => {
      onChange(select.value);
      this.store.set<string>(key, select.value);
    });
    select.dataset.key = key;
    this.controls.set(key, {
      type: "select",
      element: select,
      setValue: (v: string) => {
        select.value = String(v);
        onChange(select.value);
        this.store.set(key, select.value);
      },
    });
    _makeRow(this.parent, label, select, this.indent + 12);
    return this;
  }

  label(text: string) {
    const span = document.createElement("span");
    span.textContent = text;
    _makeRow(this.parent, "", span, this.indent + 12);
    return this;
  }

  value(key: string, label: string, initial: string) {
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      columnGap: "8px",
      rowGap: "2px",
      margin: "4px 0",
    } as CSSStyleDeclaration);
    if (this.indent + 12 > 0) wrap.style.marginLeft = `${this.indent + 12}px`;
    const k = document.createElement("div");
    k.textContent = label;
    const v = document.createElement("div");
    v.textContent = initial;
    (v as any).dataset.key = key;
    v.style.textAlign = "right";
    wrap.appendChild(k);
    wrap.appendChild(v);
    this.parent.appendChild(wrap);
    return this;
  }

  button(label: string, onClick: () => void) {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      cursor: "pointer",
      padding: "4px 6px",
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(255,255,255,0.1)",
      color: "#fff",
      borderRadius: "4px",
      marginRight: "8px",
    } as CSSStyleDeclaration);
    btn.addEventListener("click", onClick);
    _makeRow(this.parent, "", btn, this.indent + 12);
    return this;
  }

  setControlValue(key: string, value: any) {
    const handle = this.controls.get(key);
    if (handle) handle.setValue(value);
  }

  resetAll(defaults: Record<string, any>) {
    for (const [key, handle] of this.controls) {
      if (key in defaults) handle.setValue(defaults[key]);
    }
  }

  getControls() {
    return this.controls;
  }
}

export function createOverlayBuilder(
  parent: HTMLElement,
  store: PersistStore,
  sectionState?: Record<string, boolean>,
  onSectionToggle?: (id: string, open: boolean) => void
) {
  return new OverlayBuilder(parent, store, 0, onSectionToggle, sectionState);
}
