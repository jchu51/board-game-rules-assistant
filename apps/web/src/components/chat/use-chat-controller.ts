import { useEffect, useMemo, useRef, useState } from "react";

import { searchRulebooks } from "@/api/retrieval-api";

import { seedConversations } from "./chat-config";
import {
  buildRetrievalAnswer,
  clearTimers,
  createNewConversation,
  detectGame,
  getLastCitedMessage,
} from "./chat-helpers";
import type {
  AssistantMessage,
  Conversation,
  RetrievalAnswer,
  Role,
  UserMessage,
} from "./chat-types";

export function useChatController() {
  const initialConversation = useMemo(createNewConversation, []);
  const [conversations, setConversations] = useState<Conversation[]>([
    initialConversation,
    ...seedConversations,
  ]);
  const [activeId, setActiveId] = useState(initialConversation.id);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role>("pro");
  const [infoOpen, setInfoOpen] = useState(false);
  const [guestAsked, setGuestAsked] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const scrollRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<Record<string, number>>({});
  const activeSearchIdRef = useRef(0);
  const messageIdRef = useRef(0);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ??
    conversations[0];
  const hasMessages = activeConversation.messages.length > 0;
  const lastCitedMessage = getLastCitedMessage(activeConversation.messages);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
  }, [activeConversation.messages]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => clearTimers(timers);
  }, []);

  const updateConversation = (
    conversationId: string,
    updater: (conversation: Conversation) => Conversation,
  ) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? updater(conversation)
          : conversation,
      ),
    );
  };

  const startStreaming = (conversationId: string, messageId: string) => {
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.id === messageId && message.role === "assistant"
          ? { ...message, phase: "streaming" }
          : message,
      ),
    }));
    window.clearInterval(timersRef.current[messageId]);
    timersRef.current[messageId] = window.setInterval(() => {
      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          return {
            ...conversation,
            messages: conversation.messages.map((message) => {
              if (message.id !== messageId || message.role !== "assistant") {
                return message;
              }
              const step = Math.max(2, Math.round(message.text.length / 90));
              const revealed = Math.min(
                message.text.length,
                message.revealed + step,
              );
              if (revealed >= message.text.length) {
                window.clearInterval(timersRef.current[messageId]);
                delete timersRef.current[messageId];
                return { ...message, revealed, phase: "done" };
              }
              return { ...message, revealed };
            }),
          };
        }),
      );
    }, 18);
  };

  const completeAssistantMessage = (
    conversationId: string,
    messageId: string,
    answer: RetrievalAnswer,
  ) => {
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      game: answer.game ?? conversation.game,
      messages: conversation.messages.map((message) =>
        message.id === messageId && message.role === "assistant"
          ? {
              ...message,
              text: answer.text,
              cites: answer.cites,
              phase: "streaming",
              revealed: 0,
            }
          : message,
      ),
    }));
    startStreaming(conversationId, messageId);
  };

  const failAssistantMessage = (
    conversationId: string,
    messageId: string,
    error: unknown,
  ) => {
    const detail =
      error instanceof Error ? error.message : "Failed to search rulebooks";
    const text = `I could not search the indexed rulebooks: ${detail}`;
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.id === messageId && message.role === "assistant"
          ? {
              ...message,
              text,
              cites: [],
              phase: "done",
              revealed: text.length,
            }
          : message,
      ),
    }));
  };

  const sendText = async (rawText = input) => {
    const question = rawText.trim();
    if (!question || isSearching) return;
    const conversationId = activeConversation.id;
    const detectedGame = detectGame(question);
    const userMessage: UserMessage = {
      id: `user-${++messageIdRef.current}`,
      role: "user",
      text: question,
    };
    const assistantMessage: AssistantMessage = {
      id: `assistant-${++messageIdRef.current}`,
      role: "assistant",
      text: "",
      cites: [],
      phase: "thinking",
      revealed: 0,
    };
    const isFirstMessage = activeConversation.messages.length === 0;
    const nextTitle = detectedGame
      ? `${detectedGame} - ${question.slice(0, 34)}${question.length > 34 ? "..." : ""}`
      : question.slice(0, 42);
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      game: detectedGame ?? conversation.game,
      title: isFirstMessage ? nextTitle : conversation.title,
      messages: [...conversation.messages, userMessage, assistantMessage],
    }));
    setInput("");
    setIsSearching(true);
    if (role === "guest") setGuestAsked((current) => current + 1);
    const searchId = ++activeSearchIdRef.current;
    const isStaleSearch = () => activeSearchIdRef.current !== searchId;
    try {
      const response = await searchRulebooks({
        conversationId,
        query: question,
      });
      if (!isStaleSearch()) {
        completeAssistantMessage(
          conversationId,
          assistantMessage.id,
          buildRetrievalAnswer(question, response),
        );
      }
    } catch (error) {
      if (!isStaleSearch()) {
        failAssistantMessage(conversationId, assistantMessage.id, error);
      }
    } finally {
      if (!isStaleSearch()) setIsSearching(false);
    }
  };

  const handleNewChat = () => {
    activeSearchIdRef.current += 1;
    clearTimers(timersRef.current);
    timersRef.current = {};
    const conversation = createNewConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
    setIsSearching(false);
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((current) => {
      const remaining = current.filter(({ id }) => id !== conversationId);
      const next = remaining.length ? remaining : [createNewConversation()];
      if (activeId === conversationId) setActiveId(next[0].id);
      return next;
    });
  };

  const searchTerm = search.trim().toLowerCase();
  const filteredConversations = conversations.filter(
    ({ title, game }) =>
      !searchTerm ||
      title.toLowerCase().includes(searchTerm) ||
      (game ?? "").toLowerCase().includes(searchTerm),
  );
  const ungrouped = filteredConversations.filter(({ game }) => !game);
  const gameGroups = Object.entries(
    filteredConversations.reduce<Record<string, Conversation[]>>(
      (groups, conversation) => {
        if (conversation.game) {
          groups[conversation.game] = [
            ...(groups[conversation.game] ?? []),
            conversation,
          ];
        }
        return groups;
      },
      {},
    ),
  );
  const guestBannerText =
    guestAsked >= 3
      ? "You've used all 3 free Guest questions."
      : `Guest plan - ${3 - guestAsked} of 3 questions left, limited to Catan & Ticket to Ride.`;

  return {
    activeConversation,
    activeId,
    deleteConversation,
    filteredConversations,
    gameGroups,
    guestBannerText,
    handleNewChat,
    hasMessages,
    infoOpen,
    input,
    isSearching,
    lastCitedMessage,
    role,
    scrollRef,
    search,
    sendText,
    setActiveId,
    setInfoOpen,
    setInput,
    setRole,
    setSearch,
    ungrouped,
  };
}

export type ChatController = ReturnType<typeof useChatController>;
