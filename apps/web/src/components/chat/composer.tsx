import { ArrowUp } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

export type ComposerProps = {
  idPrefix: string;
  input: string;
  placeholder: string;
  helperText: string;
  isSubmitting: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
};

export function Composer(props: ComposerProps) {
  const {
    idPrefix,
    input,
    placeholder,
    helperText,
    isSubmitting,
    onInputChange,
    onSend,
  } = props;
  const canSend = input.trim().length > 0 && !isSubmitting;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend();
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };
  return (
    <form
      id={`${idPrefix}-composer-form`}
      data-testid={`${idPrefix}-composer-form`}
      className="rounded-[20px] border border-[#edeae3] bg-white p-3.5 pb-3 shadow-[0_10px_30px_-14px_rgba(109,94,240,0.18)]"
      onSubmit={submit}
    >
      <label
        id={`${idPrefix}-question-label`}
        data-testid={`${idPrefix}-question-label`}
        htmlFor={`${idPrefix}-question-input`}
        className="sr-only"
      >
        Ask a rules question
      </label>
      <textarea
        id={`${idPrefix}-question-input`}
        data-testid={`${idPrefix}-question-input`}
        value={input}
        rows={1}
        placeholder={placeholder}
        className="max-h-40 min-h-9 w-full resize-none border-0 bg-transparent px-1.5 py-1.5 text-[15px] leading-6 text-[#14171f] outline-none placeholder:text-[#b8b2a6]"
        onChange={(event) => {
          onInputChange(event.target.value);
          event.target.style.height = "auto";
          event.target.style.height = `${Math.min(160, event.target.scrollHeight)}px`;
        }}
        onKeyDown={keyDown}
      />
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="pl-1.5 text-xs text-[#b8b2a6]">{helperText}</span>
        <button
          id={`${idPrefix}-send-btn`}
          data-testid={`${idPrefix}-send-btn`}
          type="submit"
          disabled={!canSend}
          aria-label={isSubmitting ? "Searching rulebooks" : "Send question"}
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6d5ef0] text-white outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[#6d5ef0] focus-visible:ring-offset-2",
            canSend
              ? "cursor-pointer opacity-100 hover:bg-[#6620db]"
              : "cursor-not-allowed opacity-35",
          )}
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
