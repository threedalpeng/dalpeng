import { createDialogueController, type DialogueController, type DialogueLine } from "@dalpeng/ui";
import { onDestroy } from "./gameEntity";

export { type DialogueController };

export function useDialogueController(
  lines: DialogueLine[],
  options?: { charsPerSecond?: number }
): DialogueController {
  const controller = createDialogueController(lines, options);

  const handler = (e: KeyboardEvent) => {
    if (!controller.isOpen.value) return;

    const line = controller.lines[controller.currentLine.value];

    switch (e.key) {
      case " ":
      case "Enter": {
        e.preventDefault();
        if (!controller.isTyping.value && line?.choices && line.choices.length > 0) {
          controller.selectChoice(controller.choiceIndex.value);
        } else {
          controller.advance();
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (!controller.isTyping.value && line?.choices && line.choices.length > 0) {
          controller.choiceIndex.value = Math.max(0, controller.choiceIndex.value - 1);
        }
        break;
      }
      case "ArrowDown": {
        e.preventDefault();
        if (!controller.isTyping.value && line?.choices && line.choices.length > 0) {
          controller.choiceIndex.value = Math.min(
            line.choices.length - 1,
            controller.choiceIndex.value + 1
          );
        }
        break;
      }
    }
  };

  window.addEventListener("keydown", handler);

  onDestroy(() => {
    window.removeEventListener("keydown", handler);
    controller.dispose();
  });

  return controller;
}
