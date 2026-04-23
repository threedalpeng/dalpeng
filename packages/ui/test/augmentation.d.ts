// Type-only augmentation fixture. Keeps PR3.6 success criterion #20
// (module augmentation compiles) honest — if this file fails to typecheck,
// the ThemeColorExtensions slot isn't wired correctly.

import type { ColorScale } from "../src/core/theme";

declare module "../src/core/theme" {
  interface ThemeColorExtensions {
    // Game-defined role added via module augmentation.
    mana: ColorScale;
  }
}
