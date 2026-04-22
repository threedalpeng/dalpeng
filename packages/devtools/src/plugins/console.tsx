import { computed, ref, watch, type LogEntry, type LogLevel } from "@dalpeng/core";
import { For, Show, defineUI } from "@dalpeng/ui";
import { Toolbar } from "@dalpeng/ui/dom";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "var(--ui-color-text-muted)",
  debug: "var(--ui-color-text-secondary)",
  info: "var(--ui-color-text-primary)",
  warn: "var(--ui-color-warning-text)",
  error: "var(--ui-color-danger-text)",
};

const LEVEL_RANK: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

const LEVEL_OPTIONS: LogLevel[] = ["trace", "debug", "info", "warn", "error"];

const ROW_CAP = 500;

export function consolePlugin(): DevToolsPlugin {
  const entries = ref<readonly LogEntry[]>([]);
  const minLevel = ref<LogLevel>("info");
  const query = ref("");

  const filtered = computed<readonly LogEntry[]>(() => {
    const minRank = LEVEL_RANK[minLevel.value];
    const q = query.value;
    const all = entries.value;
    const out = all.filter((e) => {
      if (LEVEL_RANK[e.level] < minRank) return false;
      if (q) {
        const hay = `${e.module} ${e.message}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return out.length > ROW_CAP ? out.slice(-ROW_CAP) : out;
  });

  const counterLabel = computed(() => `${filtered.value.length}/${entries.value.length}`);
  const hasRows = computed(() => filtered.value.length > 0);
  const hasEntries = computed(() => entries.value.length > 0);

  return definePlugin({
    name: "@dalpeng/devtools/console",
    version: "0.1.0",

    setup(host) {
      const unwatch = watch(
        host.logs,
        (next) => {
          entries.value = next;
        },
        { immediate: true }
      );
      return unwatch;
    },

    panels: [
      {
        id: "console",
        title: "Console",
        defaultDock: "bottom",
        ui: defineUI(() => (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
              fontSize: "$font.size.xs",
            }}
          >
            <Toolbar border>
              <select
                ref={(el) => {
                  const sel = el as HTMLSelectElement;
                  sel.value = minLevel.value;
                  const onChange = (): void => {
                    minLevel.value = sel.value as LogLevel;
                  };
                  sel.addEventListener("change", onChange);
                  return () => sel.removeEventListener("change", onChange);
                }}
                style={{
                  background: "$color.surface.low",
                  color: "$color.text.primary",
                  border: "1px solid",
                  borderColor: "$color.neutral.border",
                  borderRadius: "$radius.sm",
                  paddingX: "$spacing.xs",
                  paddingY: "$spacing.xs",
                  fontSize: "$font.size.xs",
                  outline: "none",
                }}
              >
                {LEVEL_OPTIONS.map((lv) => (
                  <option value={lv} selected={lv === "info"}>{`≥ ${lv}`}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="🔍 filter…"
                ref={(el) => {
                  const inp = el as HTMLInputElement;
                  inp.value = query.value;
                  const onInput = (): void => {
                    query.value = inp.value.trim().toLowerCase();
                  };
                  inp.addEventListener("input", onInput);
                  return () => inp.removeEventListener("input", onInput);
                }}
                style={{
                  flex: 1,
                  background: "$color.surface.low",
                  color: "$color.text.primary",
                  border: "1px solid",
                  borderColor: "$color.neutral.border",
                  borderRadius: "$radius.sm",
                  paddingX: "$spacing.sm",
                  paddingY: "$spacing.xs",
                  fontSize: "$font.size.xs",
                  outline: "none",
                }}
              />

              <span
                style={{
                  color: "$color.text.muted",
                  fontSize: "$font.size.xs",
                  minWidth: 50,
                  textAlign: "right",
                }}
              >
                {counterLabel}
              </span>

              <button
                type="button"
                title="reset filters"
                onClick={() => {
                  minLevel.value = "info";
                  query.value = "";
                }}
                style={{
                  background: "$color.surface.low",
                  color: "$color.text.secondary",
                  border: "1px solid",
                  borderColor: "$color.neutral.border",
                  borderRadius: "$radius.sm",
                  paddingX: "$spacing.sm",
                  paddingY: "$spacing.xs",
                  fontSize: "$font.size.xs",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                clear
              </button>
            </Toolbar>

            <LogList filtered={filtered} hasRows={hasRows} hasEntries={hasEntries} />
          </div>
        )),
      },
    ],
  });
}

function LogList({
  filtered,
  hasRows,
  hasEntries,
}: {
  filtered: ReturnType<typeof computed<readonly LogEntry[]>>;
  hasRows: ReturnType<typeof computed<boolean>>;
  hasEntries: ReturnType<typeof computed<boolean>>;
}) {
  return (
    <div
      ref={(el) => {
        const list = el as HTMLElement;
        // Auto-scroll to bottom only when user is already near bottom — avoids
        // fighting with manual scroll-back for older entries.
        let autoScroll = true;
        const onScroll = (): void => {
          autoScroll = list.scrollHeight - list.scrollTop - list.clientHeight < 20;
        };
        list.addEventListener("scroll", onScroll);
        const unwatch = watch(filtered, () => {
          if (autoScroll) {
            // Defer to let DOM settle after For reconciliation.
            queueMicrotask(() => {
              list.scrollTop = list.scrollHeight;
            });
          }
        });
        return () => {
          list.removeEventListener("scroll", onScroll);
          unwatch();
        };
      }}
      style={{
        flex: 1,
        overflow: "auto",
        paddingY: "$spacing.xs",
      }}
    >
      <Show
        when={hasRows}
        body={
          <For
            items={filtered}
            key={(e, i) => `${e.timestamp}:${i}`}
            render={(e) => <LogRow entry={e} />}
          />
        }
        fallback={
          <Show
            when={hasEntries}
            body={
              <div style={{ color: "$color.text.muted", padding: "$spacing.sm" }}>no matches</div>
            }
            fallback={
              <div style={{ color: "$color.text.muted", padding: "$spacing.sm" }}>
                no log entries yet
              </div>
            }
          />
        }
      />
    </div>
  );
}

function LogRow({ entry: e }: { entry: LogEntry }) {
  const ts = (e.timestamp / 1000).toFixed(2);
  const color = LEVEL_COLORS[e.level];
  return (
    <div
      style={{
        paddingX: "$spacing.sm",
        paddingY: "$spacing.xs",
        borderBottom: "1px solid",
        borderColor: "$color.neutral.border",
        color,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: "$font.size.xs",
        lineHeight: 1.4,
      }}
    >
      <span style={{ color: "$color.text.muted" }}>{`[${ts}] [${e.module}] `}</span>
      {e.message}
      {e.source ? (
        <span
          title={e.source}
          style={{
            color: "$color.text.muted",
            fontSize: "$font.size.xs",
            marginLeft: "$spacing.xs",
          }}
        >
          {e.source}
        </span>
      ) : null}
    </div>
  );
}
