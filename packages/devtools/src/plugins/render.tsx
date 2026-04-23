import { ref, watch, type Application, type Ref, type RenderConfig } from "@dalpeng/core";
import { defineUI, Range, Select, Toggle } from "@dalpeng/ui";
import { Section } from "@dalpeng/ui/dom";
import type { DevToolsHost } from "../host";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

// ─── featureRef: Application.features[key] ↔ Ref two-way binding ─────────
//
// Application.features (RenderConfig) is plain mutation — the renderer reads
// it every frame. DevTools wants reactive atoms (Toggle / Range / Select)
// bound to each knob; featureRef bridges the gap. Writes from the Ref
// propagate to app.features; reads reflect the last known value. External
// mutations to app.features won't push back (no getter/setter interception);
// DevTools is the only writer in practice.

function featureRef<K extends keyof RenderConfig>(
  app: Application,
  key: K,
  fallback: NonNullable<RenderConfig[K]>
): Ref<NonNullable<RenderConfig[K]>> {
  const initial = (app.features[key] ?? fallback) as NonNullable<RenderConfig[K]>;
  const r = ref<NonNullable<RenderConfig[K]>>(initial);
  watch(r, (v) => {
    (app.features as unknown as Record<string, unknown>)[key as string] = v;
  });
  return r;
}

// ─── Plugin ───────────────────────────────────────────────────────────────

export function renderPlugin(): DevToolsPlugin {
  let currentApp: Application | null = null;

  return definePlugin({
    name: "@dalpeng/devtools/render",
    version: "0.1.0",

    setup(host: DevToolsHost) {
      currentApp = host.app.value;
      const unwatchApp = watch(host.app, (app) => {
        currentApp = app;
      });
      return () => {
        unwatchApp();
        currentApp = null;
      };
    },

    panels: [
      {
        id: "render",
        title: "Render",
        defaultDock: "right",
        ui: defineUI(() => {
          const app = currentApp;
          if (!app) return <div>Render pipeline not attached.</div>;

          // Bind knobs once per panel mount. When the scene rebuilds (and
          // panel re-mounts), old refs drop their watches via UI scope.
          const shadows = featureRef(app, "shadows", false);
          const shadowStrength = featureRef(app, "shadowStrength", 1);
          const shadowBias = featureRef(app, "shadowBias", 0.005);

          const bloom = featureRef(app, "bloom", false);
          const bloomThreshold = featureRef(app, "bloomThreshold", 1);
          const bloomIntensity = featureRef(app, "bloomIntensity", 0.5);
          const bloomRadius = featureRef(app, "bloomRadius", 5);

          const ibl = featureRef(app, "ibl", false);
          const iblIntensity = featureRef(app, "iblIntensity", 1);
          const skybox = featureRef(app, "skybox", false);

          const ssao = featureRef(app, "ssao", false);
          const ssaoRadius = featureRef(app, "ssaoRadius", 0.5);
          const ssaoBias = featureRef(app, "ssaoBias", 0.025);

          const fxaa = featureRef(app, "fxaa", false);

          const toneExposure = featureRef(app, "toneExposure", 1);
          const toneGamma = featureRef(app, "toneGamma", 2.2);
          const postToneMapping = featureRef<"postToneMapping">(
            app,
            "postToneMapping",
            true
          ) as Ref<boolean>;

          const debugProfiler = featureRef(app, "debugProfiler", false);
          const debugLogger = featureRef(app, "debugLogger", false);
          const debugLogLevel = featureRef(app, "debugLogLevel", "info") as Ref<
            "trace" | "debug" | "info" | "warn" | "error"
          >;

          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                overflow: "auto",
                fontSize: "$font.size.xs",
              }}
            >
              <Section title="Tone mapping">
                <Toggle source={postToneMapping} label="post tone-mapping" />
                <Range source={toneExposure} label="exposure" min={0} max={4} step={0.05} />
                <Range source={toneGamma} label="gamma" min={1} max={3} step={0.05} />
              </Section>

              <Section title="Shadows">
                <Toggle source={shadows} label="enable" />
                <Range source={shadowStrength} label="strength" min={0} max={2} step={0.05} />
                <Range source={shadowBias} label="bias" min={0} max={0.05} step={0.0005} />
              </Section>

              <Section title="Bloom">
                <Toggle source={bloom} label="enable" />
                <Range source={bloomThreshold} label="threshold" min={0} max={4} step={0.05} />
                <Range source={bloomIntensity} label="intensity" min={0} max={2} step={0.05} />
                <Range source={bloomRadius} label="radius" min={1} max={10} step={1} />
              </Section>

              <Section title="IBL / Skybox">
                <Toggle source={ibl} label="IBL" />
                <Range source={iblIntensity} label="IBL intensity" min={0} max={2} step={0.05} />
                <Toggle source={skybox} label="skybox" />
              </Section>

              <Section title="SSAO">
                <Toggle source={ssao} label="enable" />
                <Range source={ssaoRadius} label="radius" min={0} max={2} step={0.05} />
                <Range source={ssaoBias} label="bias" min={0} max={0.1} step={0.001} />
              </Section>

              <Section title="Anti-aliasing">
                <Toggle source={fxaa} label="FXAA" />
              </Section>

              <Section title="Debug" defaultCollapsed>
                <Toggle source={debugProfiler} label="GPU profiler" />
                <Toggle source={debugLogger} label="logger overlay" />
                <Select
                  source={debugLogLevel}
                  label="log level"
                  options={["trace", "debug", "info", "warn", "error"].map((v) => ({
                    label: v,
                    value: v,
                  }))}
                />
              </Section>
            </div>
          );
        }),
      },
    ],
  });
}
