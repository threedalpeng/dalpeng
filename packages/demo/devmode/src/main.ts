export async function attachOverlay() {
  const devmodeOverlayTemplate = (await import("./devmode-overlay.html?raw"))
    .default;
  const devmodeOverlayStyle = (await import("./devmode-overlay.css?raw"))
    .default;

  const devmodeWrapperEl =
    document.querySelector<HTMLDivElement>("div[devmode]")!;
  devmodeWrapperEl.innerHTML = `${devmodeOverlayTemplate}\n\n<style>${devmodeOverlayStyle}</style>`;

  const editorEl = document.querySelector<HTMLAnchorElement>("#editor")!;
  editorEl.href = import.meta.env.VITE_EDITOR;
  editorEl.innerText = import.meta.env.VITE_EDITOR_MSG;
  const testEl = document.querySelector<HTMLAnchorElement>("#test")!;
  testEl.href = import.meta.env.VITE_TEST;
  testEl.innerText = import.meta.env.VITE_TEST_MSG;
}
