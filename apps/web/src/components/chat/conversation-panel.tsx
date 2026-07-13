import type { RefObject } from "react";

import { Composer } from "./composer";
import { ConversationMessage } from "./conversation-message";
import type { Conversation } from "./chat-types";

export function ConversationPanel(props: {
  conversation: Conversation;
  input: string;
  isSearching: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
}) {
  const { conversation, input, isSearching, scrollRef, onInputChange, onSend } =
    props;
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <main
        ref={scrollRef}
        className="ref-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex max-w-[680px] flex-col gap-5.5 px-6 pt-7 pb-3">
          {conversation.messages.map((message) => (
            <ConversationMessage key={message.id} message={message} />
          ))}
        </div>
      </main>
      <footer className="shrink-0 bg-gradient-to-t from-[#fafafb] from-65% to-transparent px-6 pt-3 pb-5">
        <div className="mx-auto max-w-[680px]">
          <Composer
            idPrefix="ask-chat"
            input={input}
            placeholder="Ask a follow-up, or name another game..."
            helperText="Answers cite the rulebook and page."
            isSubmitting={isSearching}
            onInputChange={onInputChange}
            onSend={onSend}
          />
        </div>
      </footer>
    </div>
  );
}
