import { ref, type Ref } from "@dalpeng/core";
import type { DialogueLine } from "./types";

export interface DialogueController {
  // state
  readonly lines: readonly DialogueLine[];
  readonly msPerChar: number;
  readonly currentLine: Ref<number>;
  readonly isTyping: Ref<boolean>;
  readonly isComplete: Ref<boolean>;
  readonly isOpen: Ref<boolean>;
  readonly choiceIndex: Ref<number>;
  readonly displayedText: Ref<string>;
  // methods
  open(): void;
  close(): void;
  advance(): void;
  selectChoice(index: number): void;
  snapToFull(): void;
  // lifecycle
  dispose(): void;
}

export function createDialogueController(
  lines: DialogueLine[],
  options?: { charsPerSecond?: number },
): DialogueController {
  const msPerChar = 1000 / (options?.charsPerSecond ?? 33);

  const currentLine = ref(0);
  const isTyping = ref(false);
  const isComplete = ref(false);
  const isOpen = ref(false);
  const choiceIndex = ref(0);
  const displayedText = ref("");

  let typingInterval: ReturnType<typeof setInterval> | null = null;

  function clearTypingInterval() {
    if (typingInterval !== null) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  }

  function startTyping(line: DialogueLine) {
    clearTypingInterval();
    displayedText.value = "";
    isTyping.value = true;
    choiceIndex.value = 0;

    const fullText = line.text;
    let charIndex = 0;

    typingInterval = setInterval(() => {
      charIndex++;
      displayedText.value = fullText.slice(0, charIndex);
      if (charIndex >= fullText.length) {
        clearTypingInterval();
        isTyping.value = false;
      }
    }, msPerChar);
  }

  function snapToFull() {
    const line = lines[currentLine.value];
    if (!line) return;
    clearTypingInterval();
    displayedText.value = line.text;
    isTyping.value = false;
  }

  function advance() {
    if (isComplete.value) return;

    if (isTyping.value) {
      snapToFull();
      return;
    }

    const line = lines[currentLine.value];

    if (line?.choices && line.choices.length > 0) return;

    const next = currentLine.value + 1;
    if (next >= lines.length) {
      isComplete.value = true;
    } else {
      currentLine.value = next;
      startTyping(lines[next]!);
    }
  }

  function selectChoice(index: number) {
    if (isComplete.value || isTyping.value) return;
    const line = lines[currentLine.value];
    if (!line?.choices || line.choices.length === 0) return;

    const clampedIndex = Math.max(0, Math.min(index, line.choices.length - 1));
    const choice = line.choices[clampedIndex];
    if (!choice) return;

    choice.onSelect();

    const next = currentLine.value + 1;
    if (next >= lines.length) {
      isComplete.value = true;
    } else {
      currentLine.value = next;
      startTyping(lines[next]!);
    }
  }

  function open() {
    if (isOpen.value) return;
    currentLine.value = 0;
    isComplete.value = false;
    choiceIndex.value = 0;
    isOpen.value = true;
    if (lines.length > 0) {
      startTyping(lines[0]!);
    }
  }

  function close() {
    clearTypingInterval();
    isOpen.value = false;
  }

  function dispose() {
    close();
  }

  return {
    lines,
    msPerChar,
    currentLine,
    isTyping,
    isComplete,
    isOpen,
    choiceIndex,
    displayedText,
    open,
    close,
    advance,
    selectChoice,
    snapToFull,
    dispose,
  };
}
