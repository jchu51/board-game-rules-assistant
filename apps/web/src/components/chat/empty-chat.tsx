import { MessageSquare } from "lucide-react";

import { exampleQuestions } from "./chat-config";
import { Composer } from "./composer";

export function EmptyChat(props: {
  input: string;
  isSearching: boolean;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
}) {
  const { input, isSearching, onInputChange, onSend } = props;
  return (
    <main className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
      <div className="flex w-full max-w-[600px] flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="mb-0.5 flex size-[52px] items-center justify-center rounded-[15px] bg-[linear-gradient(135deg,#6d5ef0,#3fbfa8)] text-white">
            <MessageSquare className="size-6" aria-hidden="true" />
          </div>
          <h1 className="font-heading m-0 text-[30px] leading-tight font-bold tracking-[-0.3px] text-[#14171f]">
            Ask the Referee
          </h1>
          <p className="m-0 max-w-[42ch] text-[15px] leading-6 text-[#5b5648]">
            Name a game and ask your question. Every ruling is cited straight
            from its rulebook, with the exact page number.
          </p>
        </div>
        <div className="w-full">
          <Composer
            idPrefix="ask-empty"
            input={input}
            placeholder="e.g. In Catan, can I build a road through an opponent's settlement?"
            helperText="Every answer cites the rulebook and page."
            isSubmitting={isSearching}
            onInputChange={onInputChange}
            onSend={() => onSend()}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {exampleQuestions.map((example) => (
            <button
              key={example.id}
              id={example.id}
              data-testid={example.id}
              type="button"
              disabled={isSearching}
              className="rounded-full border border-[#edeae3] bg-white px-4 py-2.5 text-left text-[12.5px] leading-[1.3] text-[#5b5648] outline-none hover:border-[#dccffb] hover:bg-[#f8f6ff] hover:text-[#6d5ef0] focus-visible:ring-2 focus-visible:ring-[#6d5ef0]"
              onClick={() => onSend(example.label)}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
