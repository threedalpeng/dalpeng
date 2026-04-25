import type Application from "@/Application";
import Light from "@/graphics/Light";
import MeshRenderer from "@/graphics/MeshRenderer";
import SkinnedMeshRenderer from "@/graphics/SkinnedMeshRenderer";
import type FrameResources from "@/rendering/FrameResources";
import { Mat4, Vec3 } from "@dalpeng/math";

/** Directional shadow system using scene-based auto-fitting. */
export default class DirectionalShadowSystem {
  private lastLightVP: Mat4 | null = null;
  private shadowCaster: Light | null = null;

  update(app: Application, resources: FrameResources) {
    if (!app.features.shadows) {
      this.shadowCaster = null;
      this.lastLightVP = null;
      return;
    }

    let dirLight: Light | undefined;
    app.forEachActiveComponent(Light, (l) => {
      if (!dirLight && l.type === "directional") dirLight = l;
    });
    if (!dirLight) {
      this.lastLightVP = null;
      return;
    }
    this.shadowCaster = dirLight;

    const positions: Vec3[] = [];
    const extents: number[] = [];
    app.forEachActiveComponent(MeshRenderer, (renderer) => {
      const pos = renderer.transform.worldPosition;
      // world-space scale from model matrix column lengths
      const m = renderer.transform.modelMatrix;
      const sx = Math.hypot(m[0], m[1], m[2]);
      const sy = Math.hypot(m[4], m[5], m[6]);
      const sz = Math.hypot(m[8], m[9], m[10]);
      extents.push(0.5 * Math.sqrt(sx * sx + sy * sy + sz * sz));
      positions.push(pos);
    });
    app.forEachActiveComponent(SkinnedMeshRenderer, (renderer) => {
      const pos = renderer.transform.worldPosition;
      // world-space scale from model matrix column lengths
      const m = renderer.transform.modelMatrix;
      const sx = Math.hypot(m[0], m[1], m[2]);
      const sy = Math.hypot(m[4], m[5], m[6]);
      const sz = Math.hypot(m[8], m[9], m[10]);
      extents.push(0.5 * Math.sqrt(sx * sx + sy * sy + sz * sz));
      positions.push(pos);
    });

    if (positions.length === 0) {
      this.lastLightVP = null;
      return;
    }

    let center = new Vec3([0, 0, 0]);
    for (const p of positions) center = center.add(p);
    center = center.scale(1 / positions.length);

    let radius = 0;
    for (let i = 0; i < positions.length; i++) {
      const d = positions[i].sub(center).length + extents[i];
      if (d > radius) radius = d;
    }

    const maxDist = app.features.shadowDistance.value;
    if (maxDist !== undefined && maxDist > 0) {
      radius = Math.min(radius, maxDist);
    }

    radius = Math.max(radius, 0.1); // prevent degenerate projection

    // Round up to texel size to reduce shadow edge swimming
    const mapSize = Math.max(16, app.features.shadowMapSize.value ?? 1024);
    const texelSize = (radius * 2) / mapSize;
    radius = Math.ceil(radius / texelSize) * texelSize;

    // --- Light view matrix ---
    const lightDir = dirLight.transform.forward.normalize();
    // Guard against light direction parallel to world up
    const worldUp =
      Math.abs(lightDir.dot(new Vec3([0, 1, 0]))) > 0.999
        ? new Vec3([1, 0, 0])
        : new Vec3([0, 1, 0]);

    const padding = 1.0;
    const lightEye = center.sub(lightDir.scale(radius + padding));
    const view = Mat4.view(lightEye, center, worldUp);

    // --- Orthographic projection (symmetric, covers bounding sphere) ---
    const ortho = Mat4.orthographic(radius, radius, padding, 2 * radius + padding);
    const lightVP = Mat4.toWebGL(ortho).mul(view); // P * V
    this.lastLightVP = lightVP;

    // --- Render shadow map ---
    const renderer = app.renderer;
    resources.ensureShadow(renderer, mapSize);

    app.shader.shadow.use();
    app.shader.shadow.setUniformMat4("uLightViewProj", lightVP);

    renderer.beginPass({
      target: resources.shadow!.rt,
      depthTest: true,
      depthWrite: true,
      blend: { enable: false },
      clearDepth: 1,
      colorWrite: false,
      polygonOffset: {
        factor: app.features.shadowOffsetFactor.value ?? 1.1,
        units: app.features.shadowOffsetUnits.value ?? 4.0,
      },
      viewport: { x: 0, y: 0, w: mapSize, h: mapSize },
    });

    app.forEachActiveComponent(MeshRenderer, (meshRenderer) => {
      meshRenderer.renderShadow(lightVP);
    });
    app.forEachActiveComponent(SkinnedMeshRenderer, (meshRenderer) => {
      meshRenderer.renderShadow(lightVP);
    });

    renderer.endPass();
  }

  bindForLight(app: Application, light: Light, resources: FrameResources) {
    const shader = app.shader.lighting;
    const shadowUnit = 4;

    // Reset to no shadows by default
    shader.setUniform1f("uShadowStrength", 0.0);
    shader.setUniform1i("uShadowMapDepth", shadowUnit);

    if (!app.features.shadows.value || !this.lastLightVP || !resources.shadow) {
      // WebGL silently drops the draw call if a sampler unit has no bound texture.
      app.textures.placeholder.bind(shadowUnit);
      return;
    }
    if (light !== this.shadowCaster) return;

    resources.shadow.depth.bind(shadowUnit);
    shader.setUniformMat4("uLightViewProj", this.lastLightVP);
    shader.setUniform1f("uShadowBias", app.features.shadowBias.value ?? 0.005);
    shader.setUniform1f(
      "uShadowSlopeScale",
      Math.max(0.0, app.features.shadowSlopeScale.value ?? 1.0)
    );
    shader.setUniform1f(
      "uShadowStrength",
      Math.max(0.0, Math.min(1.0, app.features.shadowStrength.value ?? 1.0))
    );
  }
}
