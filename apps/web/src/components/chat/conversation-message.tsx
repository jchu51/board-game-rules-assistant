import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

import { CitationMarker } from "./citation-marker";
import { ThinkingDots } from "./thinking-dots";
import type { AssistantMessage, Message } from "./chat-types";

const renderAnswerText = (message: AssistantMessage): ReactNode => {
  if (message.phase === "thinking") return <ThinkingDots />;
  const visibleText = message.text.slice(0, message.revealed);
  const nodes: ReactNode[] = [];
  const pattern = /\[\[(\d+)\]\]/g;
  let cursor = 0;
  let match = pattern.exec(visibleText);
  while (match) {
    if (match.index > cursor)
      nodes.push(visibleText.slice(cursor, match.index));
    nodes.push(
      <CitationMarker key={`cite-${match.index}`} number={match[1]} />,
    );
    cursor = match.index + match[0].length;
    match = pattern.exec(visibleText);
  }
  if (cursor < visibleText.length) nodes.push(visibleText.slice(cursor));
  if (message.phase === "streaming") {
    nodes.push(
      <span
        key="cursor"
        className="ml-0.5 inline-block h-[15px] w-[7px] align-text-bottom bg-[#7b2ff7] ref-blink"
      />,
    );
  }
  return nodes;
};

export function ConversationMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-[16px_16px_4px_16px] bg-[#f1e9ff] px-4 py-3 text-[14.5px] leading-6 whitespace-pre-wrap text-[#14171f]">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#7b2ff7,#00c4cc)] text-white">
        <BookOpen className="size-[15px]" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="text-[15px] leading-7 whitespace-pre-wrap text-[#14171f]">
          {renderAnswerText(message)}
        </div>
      </div>
    </div>
  );
}
