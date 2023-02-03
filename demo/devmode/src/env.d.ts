/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDITOR: string;
  readonly VITE_EDITOR_MSG: string;
  readonly VITE_TEST: string;
  readonly VITE_TEST_MSG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
