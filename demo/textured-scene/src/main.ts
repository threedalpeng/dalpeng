import { enableDebugPanel, runApp, MeshRenderer } from "dalpeng";
import App from "./app/App";
import { createTextureControls } from "./app/dashboard";
import { hasExternalTextures, EXTERNAL_PRESETS } from "./app/textures/external";
import {
  makeBrickTextures,
  makeWoodTextures,
  makeStoneTileTextures,
} from "./app/textures/procedural";

const app = await runApp(App, "#app", {
  fit: "fill",
  features: { shadows: true },
});

// ─── Texture preset switching ─────────────────────────────────────────────

const externalAvail = await hasExternalTextures();

async function switchTextureSource(source: string) {
  if (source === "external" && !externalAvail) {
    console.warn(
      "External textures not found.\n" +
        "Run:  cd demo/textured-scene && bash scripts/download-textures.sh"
    );
    return;
  }

  const renderers = new Map<string, MeshRenderer>();
  app.forEachActiveComponent(MeshRenderer, (r) => {
    const name = r.gameEntity?.name ?? "";
    if (name) renderers.set(name, r);
  });

  const loadColor = (url: string) => app.textures.load(url, { srgb: true });
  const loadData = (url: string) => app.textures.load(url, { srgb: false });

  if (source === "external") {
    const [brickBC, brickN, brickARM, woodBC, woodN, woodARM, stoneBC, stoneN, stoneARM] =
      await Promise.all([
        loadColor(EXTERNAL_PRESETS.brick.baseColor),
        loadData(EXTERNAL_PRESETS.brick.normal),
        loadData(EXTERNAL_PRESETS.brick.arm),
        loadColor(EXTERNAL_PRESETS.wood.baseColor),
        loadData(EXTERNAL_PRESETS.wood.normal),
        loadData(EXTERNAL_PRESETS.wood.arm),
        loadColor(EXTERNAL_PRESETS.stone.baseColor),
        loadData(EXTERNAL_PRESETS.stone.normal),
        loadData(EXTERNAL_PRESETS.stone.arm),
      ]);

    const sphere = renderers.get("TexturedSphere");
    if (sphere) {
      sphere.material.baseColorMap = brickBC;
      sphere.material.normalMap = brickN;
      sphere.material.metallicRoughnessMap = brickARM;
    }
    const box = renderers.get("TexturedBox");
    if (box) {
      box.material.baseColorMap = woodBC;
      box.material.normalMap = woodN;
      box.material.metallicRoughnessMap = woodARM;
    }
    const ground = renderers.get("Ground");
    if (ground) {
      ground.material.baseColorMap = stoneBC;
      ground.material.normalMap = stoneN;
      ground.material.metallicRoughnessMap = stoneARM;
    }
  } else {
    const brickSet = makeBrickTextures();
    const woodSet = makeWoodTextures();
    const stoneSet = makeStoneTileTextures();

    const [brickBC, brickN, brickMR, woodBC, woodN, woodMR, stoneBC, stoneN, stoneMR] =
      await Promise.all([
        loadColor(brickSet.baseColor),
        loadData(brickSet.normal),
        loadData(brickSet.metallicRoughness),
        loadColor(woodSet.baseColor),
        loadData(woodSet.normal),
        loadData(woodSet.metallicRoughness),
        loadColor(stoneSet.baseColor),
        loadData(stoneSet.normal),
        loadData(stoneSet.metallicRoughness),
      ]);

    const sphere = renderers.get("TexturedSphere");
    if (sphere) {
      sphere.material.baseColorMap = brickBC;
      sphere.material.normalMap = brickN;
      sphere.material.metallicRoughnessMap = brickMR;
    }
    const box = renderers.get("TexturedBox");
    if (box) {
      box.material.baseColorMap = woodBC;
      box.material.normalMap = woodN;
      box.material.metallicRoughnessMap = woodMR;
    }
    const ground = renderers.get("Ground");
    if (ground) {
      ground.material.baseColorMap = stoneBC;
      ground.material.normalMap = stoneN;
      ground.material.metallicRoughnessMap = stoneMR;
    }
  }
}

// ─── UI ───────────────────────────────────────────────────────────────────

const textureGroup = createTextureControls({
  externalAvailable: externalAvail,
  onSourceChange: switchTextureSource,
  onMaskChange: (mask) => { app.features.textureMask = mask; },
});

enableDebugPanel(app, {
  position: "top-right",
  controls: [textureGroup],
});
