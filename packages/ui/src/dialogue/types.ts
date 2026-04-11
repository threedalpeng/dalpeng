export interface DialogueLine {
  text: string;
  speaker?: string;
  portrait?: string;
  choices?: DialogueChoice[];
}

export interface DialogueChoice {
  label: string;
  onSelect: () => void;
}
