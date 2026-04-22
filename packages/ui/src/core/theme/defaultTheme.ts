import { defineTheme } from "./defineTheme";
import type { Theme } from "./types";

/** Baseline theme — neutral seed, smooth preset, light mode. Consumers that don't provide a theme inherit this. */
export const defaultTheme: Theme = defineTheme({});
