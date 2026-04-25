import type { ReadonlyRef } from "@dalpeng/core";
import { defineWidget, type UIElement } from "../../core/element";

export interface ButtonProps {
  label: string | ReadonlyRef<string>;
  onClick: () => void;
  disabled?: boolean | ReadonlyRef<boolean>;
  title?: string;
}

export const Button = defineWidget<ButtonProps>(
  ({ label, onClick, disabled, title }): UIElement => (
    <button type="button" onClick={onClick} disabled={disabled} title={title}>
      {label}
    </button>
  )
);
