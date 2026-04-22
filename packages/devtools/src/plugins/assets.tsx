import { computed, ref, watch } from "@dalpeng/core";
import { For, Show, defineUI } from "@dalpeng/ui";
import { Card, Toolbar } from "@dalpeng/ui/dom";
import type { DevToolsHost, TextureInfo } from "../host";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

function formatBytes(pixels: number, bytesPerPixel = 4): string {
  const bytes = pixels * bytesPerPixel;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

export function assetsPlugin(): DevToolsPlugin {
  let currentHost: DevToolsHost | null = null;
  const entries = ref<readonly TextureInfo[]>([]);
  const filter = ref("");
  const selectedUrl = ref<string | null>(null);

  const filtered = computed(() => {
    const f = filter.value.trim().toLowerCase();
    return f ? entries.value.filter((t) => t.url.toLowerCase().includes(f)) : entries.value;
  });

  const counterLabel = computed(() => {
    const all = entries.value.length;
    const matched = filtered.value.length;
    return filter.value ? `${matched}/${all}` : String(all);
  });

  const hasMatches = computed(() => filtered.value.length > 0);
  const hasAny = computed(() => entries.value.length > 0);
  const selectedTexture = computed(() => {
    const url = selectedUrl.value;
    if (!url) return null;
    return entries.value.find((t) => t.url === url) ?? null;
  });

  const refresh = (host: DevToolsHost): void => {
    entries.value = host.textures();
    if (selectedUrl.value && !entries.value.find((t) => t.url === selectedUrl.value)) {
      selectedUrl.value = null;
    }
  };

  return definePlugin({
    name: "@dalpeng/devtools/assets",
    version: "0.1.0",

    setup(host) {
      currentHost = host;
      refresh(host);
      const unwatchScene = watch(host.activeScene, () => refresh(host));
      // TextureManager has no change signal; poll for new textures.
      const interval = setInterval(() => refresh(host), 1000);
      return () => {
        unwatchScene();
        clearInterval(interval);
        currentHost = null;
      };
    },

    panels: [
      {
        id: "textures",
        title: "Textures",
        defaultDock: "right",
        ui: defineUI(() => {
          void currentHost;
          return (
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
                <input
                  type="text"
                  placeholder="🔍 filter textures…"
                  ref={(el: Element) => {
                    const input = el as HTMLInputElement;
                    input.value = filter.value;
                    const onInput = (): void => {
                      filter.value = input.value;
                    };
                    input.addEventListener("input", onInput);
                    return () => input.removeEventListener("input", onInput);
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
                    minWidth: 40,
                    textAlign: "right",
                  }}
                >
                  {counterLabel}
                </span>
              </Toolbar>

              <div style={{ flex: 1, overflow: "auto", padding: "$spacing.sm" }}>
                <Show
                  when={hasMatches}
                  body={
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                        gap: "$spacing.sm",
                        alignContent: "start",
                      }}
                    >
                      <For
                        items={filtered}
                        key={(t) => t.url}
                        render={(tex) => <TextureCard tex={tex} selectedUrl={selectedUrl} />}
                      />
                    </div>
                  }
                  fallback={
                    <Show
                      when={hasAny}
                      body={
                        <div style={{ color: "$color.text.muted", padding: "$spacing.sm" }}>
                          no matches
                        </div>
                      }
                      fallback={
                        <div style={{ color: "$color.text.muted", padding: "$spacing.sm" }}>
                          no textures loaded
                        </div>
                      }
                    />
                  }
                />
              </div>

              <div
                style={{
                  borderTop: "1px solid",
                  borderColor: "$color.neutral.border",
                  padding: "$spacing.sm",
                  background: "$color.surface.base",
                  minHeight: 120,
                }}
              >
                <DetailPanel selectedTexture={selectedTexture} />
              </div>
            </div>
          );
        }),
      },
    ],
  });
}

function TextureCard({
  tex,
  selectedUrl,
}: {
  tex: TextureInfo;
  selectedUrl: ReturnType<typeof ref<string | null>>;
}) {
  const short = tex.url.split("/").pop() ?? tex.url;
  const isSelected = computed(() => selectedUrl.value === tex.url);
  return (
    <Card
      elevation="flat"
      padding="sm"
      interactive
      onClick={() => {
        selectedUrl.value = tex.url;
      }}
    >
      <div
        ref={(el) => {
          const card = el as HTMLElement;
          const apply = (sel: boolean): void => {
            card.style.background = sel ? "var(--ui-color-primary-muted)" : "transparent";
            card.style.borderColor = sel ? "var(--ui-color-primary-border)" : "transparent";
          };
          apply(isSelected.value);
          return watch(isSelected, apply);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "$spacing.xs",
          border: "1px solid",
          borderRadius: "$radius.sm",
          padding: "$spacing.xs",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "$color.surface.base",
            border: "1px solid",
            borderColor: "$color.neutral.border",
            overflow: "hidden",
            imageRendering: "pixelated",
          }}
        >
          <img
            src={tex.url}
            ref={(el) => {
              const img = el as HTMLImageElement;
              const onError = (): void => {
                img.style.display = "none";
                const parent = img.parentElement;
                if (parent && !parent.dataset.fallback) {
                  parent.dataset.fallback = "1";
                  parent.textContent = "?";
                  parent.style.color = "var(--ui-color-text-muted)";
                }
              };
              img.addEventListener("error", onError);
              return () => img.removeEventListener("error", onError);
            }}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              imageRendering: "pixelated",
            }}
          />
        </div>
        <div
          title={tex.url}
          style={{
            color: "$color.text.primary",
            fontSize: "$font.size.xs",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {short}
        </div>
        <div
          style={{
            color: "$color.text.muted",
            fontSize: "$font.size.xs",
          }}
        >
          {`${tex.width}×${tex.height}`}
        </div>
      </div>
    </Card>
  );
}

function DetailPanel({
  selectedTexture,
}: {
  selectedTexture: ReturnType<typeof computed<TextureInfo | null>>;
}) {
  const hasSelection = computed(() => selectedTexture.value !== null);
  return (
    <Show
      when={hasSelection}
      body={<SelectedDetail selectedTexture={selectedTexture} />}
      fallback={<div style={{ color: "$color.text.muted" }}>select a texture</div>}
    />
  );
}

function SelectedDetail({
  selectedTexture,
}: {
  selectedTexture: ReturnType<typeof computed<TextureInfo | null>>;
}) {
  const tex = selectedTexture.value;
  if (!tex) return <div style={{ color: "$color.text.muted" }}>texture unloaded</div>;
  return (
    <div>
      <div
        style={{
          width: "100%",
          maxHeight: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "$color.surface.base",
          border: "1px solid",
          borderColor: "$color.neutral.border",
          marginBottom: "$spacing.xs",
          overflow: "hidden",
        }}
      >
        <img
          src={tex.url}
          style={{
            maxWidth: "100%",
            maxHeight: 240,
            imageRendering: "pixelated",
          }}
        />
      </div>
      <div
        style={{
          color: "$color.text.secondary",
          fontSize: "$font.size.xs",
          lineHeight: 1.5,
        }}
      >
        <div style={{ color: "$color.text.primary", wordBreak: "break-all" }}>{tex.url}</div>
        <div>{`size: ${tex.width}×${tex.height}`}</div>
        <div>{`~memory: ${formatBytes(tex.width * tex.height)}`}</div>
      </div>
    </div>
  );
}
