type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type Persisted = Record<string, unknown>;

export function createPersistStore(key: string) {
  const load = (): Persisted => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Persisted) : {};
    } catch {
      return {};
    }
  };
  const save = (data: Persisted) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  };
  return {
    get<T>(k: string, fallback: T): T {
      const cur = load();
      return (cur[k] as T) ?? fallback;
    },
    set<T>(k: string, v: T) {
      const cur = load();
      cur[k] = v as unknown as any;
      save(cur);
    },
    reset(defaults?: Persisted) {
      save(defaults ?? {});
    },
    raw() {
      return load();
    },
  };
}

export function createOverlayRoot(opts: {
  title: string;
  position: Position;
  minimized?: boolean;
}) {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.zIndex = "9999";
  root.style.padding = "8px";
  root.style.minWidth = "200px";
  root.style.font = "12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  root.style.color = "#fff";
  root.style.background = "rgba(0,0,0,0.5)";
  root.style.borderRadius = "6px";
  root.style.backdropFilter = "blur(2px)";
  const [y, x] = opts.position.split("-") as ["top" | "bottom", "left" | "right"];
  if (y === "top") root.style.top = "8px";
  else root.style.bottom = "8px";
  if (x === "left") root.style.left = "8px";
  else root.style.right = "8px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "8px";
  header.style.marginBottom = "6px";

  const title = document.createElement("div");
  title.textContent = opts.title;
  title.style.fontWeight = "600";
  const btn = document.createElement("button");
  btn.textContent = opts.minimized ? "+" : "–";
  btn.title = opts.minimized ? "Expand" : "Minimize";
  Object.assign(btn.style, {
    cursor: "pointer",
    width: "22px",
    height: "22px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    borderRadius: "4px",
  } as CSSStyleDeclaration);
  header.appendChild(title);
  header.appendChild(btn);
  root.appendChild(header);

  const content = document.createElement("div");
  root.appendChild(content);

  let minimized = !!opts.minimized;
  const apply = () => {
    content.style.display = minimized ? "none" : "block";
    btn.textContent = minimized ? "+" : "–";
    btn.title = minimized ? "Expand" : "Minimize";
  };
  const listeners: Array<(minimized: boolean) => void> = [];
  btn.addEventListener("click", () => {
    minimized = !minimized;
    apply();
    listeners.forEach((fn) => fn(minimized));
  });
  apply();

  return {
    root,
    content,
    setMinimized(v: boolean) {
      minimized = v;
      apply();
      listeners.forEach((fn) => fn(minimized));
    },
    getMinimized() {
      return minimized;
    },
    onToggle(cb: (minimized: boolean) => void) {
      listeners.push(cb);
    },
  } as const;
}

export function makeSection(parent: HTMLElement, label: string, open = true) {
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

export function makeLabeledRow(parent: HTMLElement, label: string, control: HTMLElement) {
  const row = document.createElement("label");
  Object.assign(row.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    margin: "4px 0",
  } as CSSStyleDeclaration);
  const span = document.createElement("span");
  span.textContent = label;
  row.appendChild(control);
  row.appendChild(span);
  parent.appendChild(row);
  return row;
}

export function makeCheckbox(
  parent: HTMLElement,
  store: ReturnType<typeof createPersistStore> | null,
  key: string | null,
  label: string,
  init: boolean,
  onChange: (v: boolean) => void
) {
  const input = document.createElement("input");
  input.type = "checkbox";
  const val = store && key ? !!store.get<boolean>(key, init) : init;
  input.checked = val;
  onChange(input.checked);
  input.addEventListener("change", () => {
    onChange(input.checked);
    if (store && key) store.set<boolean>(key, input.checked);
  });
  makeLabeledRow(parent, label, input);
  return input;
}

export function makeSelect(
  parent: HTMLElement,
  store: ReturnType<typeof createPersistStore> | null,
  key: string | null,
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
  const val = store && key ? String(store.get<string>(key, init)) : init;
  select.value = val;
  onChange(select.value);
  select.addEventListener("change", () => {
    onChange(select.value);
    if (store && key) store.set<string>(key, select.value);
  });
  makeLabeledRow(parent, label, select);
  return select;
}

export function makeSlider(
  parent: HTMLElement,
  store: ReturnType<typeof createPersistStore> | null,
  key: string | null,
  label: string,
  init: number,
  min: number,
  max: number,
  step: number,
  onChange: (v: number) => void
) {
  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    columnGap: "6px",
    rowGap: "4px",
    margin: "6px 0",
  } as CSSStyleDeclaration);
  const l = document.createElement("div");
  l.textContent = label;
  const r = document.createElement("input");
  r.type = "range";
  r.min = String(min);
  r.max = String(max);
  r.step = String(step);
  const val = store && key ? Number(store.get<number>(key, init)) : init;
  r.value = String(val);
  const v = document.createElement("div");
  v.style.textAlign = "right";
  v.textContent = Number(val).toFixed(2);
  r.addEventListener("input", () => {
    const n = parseFloat(r.value);
    v.textContent = n.toFixed(2);
    onChange(n);
    if (store && key) store.set<number>(key, n);
  });
  wrap.appendChild(l);
  wrap.appendChild(r);
  wrap.appendChild(v);
  parent.appendChild(wrap);
  onChange(Number(val));
  return { range: r, labelEl: l, valueEl: v } as const;
}
