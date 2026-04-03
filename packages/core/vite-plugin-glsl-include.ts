import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export function glslInclude(): Plugin {
  return {
    name: "glsl-include",
    enforce: "pre",
    load(id) {
      const match = id.match(/^(.+\.(frag|vert|glsl))\?raw$/);
      if (!match) return null;

      const filepath = match[1];
      const source = fs.readFileSync(filepath, "utf-8");
      const resolved = resolveIncludes(source, path.dirname(filepath), new Set());
      return `export default ${JSON.stringify(resolved)}`;
    },
  };
}

function resolveIncludes(source: string, baseDir: string, seen: Set<string>): string {
  return source.replace(/#include\s+"([^"]+)"/g, (_match, includePath: string) => {
    const fullPath = path.resolve(baseDir, includePath);
    if (seen.has(fullPath)) return `// [glsl-include] circular: ${includePath}`;
    if (!fs.existsSync(fullPath)) {
      throw new Error(`[glsl-include] not found: ${fullPath}`);
    }
    seen.add(fullPath);
    const content = fs.readFileSync(fullPath, "utf-8");
    return resolveIncludes(content, path.dirname(fullPath), seen);
  });
}
