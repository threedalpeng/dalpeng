import { createUINode, registerCleanup, type UINode } from "@dalpeng/core";
import { usePlacement } from "../define";
import type { DialogueController } from "./controller";
import type { DialogueLine } from "./types";

export function Dialogue(controller: DialogueController): UINode {
  return createUINode(
    (props: { controller: DialogueController }) => {
      const { controller } = props;

      usePlacement({
        anchor: { kind: "viewport", corner: "bc" },
        offset: { x: 0, y: 24 },
        pivot: { x: 0.5, y: 0 },
      });

      const cleanups = new Set<() => void>();

      const panel = document.createElement("div");
      panel.style.cssText = [
        "width: 640px",
        "background: rgba(10, 10, 20, 0.88)",
        "border: 1px solid rgba(255, 255, 255, 0.3)",
        "border-radius: 8px",
        "padding: 16px 20px",
        "display: flex",
        "flex-direction: column",
        "gap: 10px",
        "box-sizing: border-box",
        "font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      ].join("; ");

      panel.style.display = controller.isOpen.value ? "flex" : "none";

      const speakerEl = document.createElement("div");
      speakerEl.style.cssText =
        "font-weight: bold; font-size: 14px; color: #ffe082; display: none;";

      const textEl = document.createElement("div");
      textEl.style.cssText = [
        "font-size: 15px",
        "line-height: 1.55",
        "min-height: 48px",
        "color: #f5f5f5",
        "white-space: pre-wrap",
      ].join("; ");

      const choicesEl = document.createElement("div");
      choicesEl.style.cssText = "display: none; flex-direction: column; gap: 6px; margin-top: 4px;";

      panel.appendChild(speakerEl);
      panel.appendChild(textEl);
      panel.appendChild(choicesEl);

      function renderChoices(line: DialogueLine, highlighted: number) {
        choicesEl.innerHTML = "";
        if (!line.choices || line.choices.length === 0) {
          choicesEl.style.display = "none";
          return;
        }
        choicesEl.style.display = "flex";
        line.choices.forEach((choice, i) => {
          const isHighlighted = i === highlighted;
          const btn = document.createElement("button");
          btn.textContent = (isHighlighted ? "▶ " : "  ") + choice.label;
          btn.style.cssText = [
            "background: " + (isHighlighted ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"),
            "border: 1px solid " +
              (isHighlighted ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"),
            "border-radius: 4px",
            "padding: 6px 12px",
            "color: " + (isHighlighted ? "#fff" : "#ccc"),
            "font-size: 14px",
            "text-align: left",
            "cursor: pointer",
          ].join("; ");
          btn.addEventListener("click", () => controller.selectChoice(i));
          choicesEl.appendChild(btn);
        });
      }

      function applySpeaker(line: DialogueLine) {
        if (line.speaker) {
          speakerEl.textContent = line.speaker;
          speakerEl.style.display = "block";
        } else {
          speakerEl.textContent = "";
          speakerEl.style.display = "none";
        }
      }

      const unsubOpen = controller.isOpen.subscribe((open) => {
        panel.style.display = open ? "flex" : "none";
      });
      cleanups.add(unsubOpen);
      registerCleanup(unsubOpen);

      const unsubLine = controller.currentLine.subscribe((lineIndex) => {
        const line = controller.lines[lineIndex];
        if (!line) return;
        applySpeaker(line);
        choicesEl.style.display = "none";
        choicesEl.innerHTML = "";
      });
      cleanups.add(unsubLine);
      registerCleanup(unsubLine);

      const unsubText = controller.displayedText.subscribe((text) => {
        textEl.textContent = text;
      });
      cleanups.add(unsubText);
      registerCleanup(unsubText);

      const unsubTyping = controller.isTyping.subscribe((typing) => {
        if (!typing) {
          const line = controller.lines[controller.currentLine.value];
          if (line) renderChoices(line, controller.choiceIndex.value);
        } else {
          choicesEl.style.display = "none";
          choicesEl.innerHTML = "";
        }
      });
      cleanups.add(unsubTyping);
      registerCleanup(unsubTyping);

      const unsubChoice = controller.choiceIndex.subscribe((idx) => {
        if (!controller.isTyping.value) {
          const line = controller.lines[controller.currentLine.value];
          if (line) renderChoices(line, idx);
        }
      });
      cleanups.add(unsubChoice);
      registerCleanup(unsubChoice);

      if (controller.isOpen.value) {
        const line = controller.lines[controller.currentLine.value];
        if (line) {
          applySpeaker(line);
          textEl.textContent = controller.displayedText.value;
        }
      }

      return [{ type: "live", element: panel, cleanups }];
    },
    { controller }
  );
}
