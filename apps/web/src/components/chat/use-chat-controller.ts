import { useEffect, useRef, useState } from "react";

import { createChat, deleteChat, getChat, listChats } from "@/api/chat-service";
import { searchRulebooks } from "@/api/retrieval-api";

import {
  buildRestoredMessages,
  buildRetrievalAnswer,
  clearTimers,
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role>("pro");
  const [infoOpen, setInfoOpen] = useState(false);
  const [guestAsked, setGuestAsked] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<Record<string, number>>({});
  const activeSearchIdRef = useRef(0);
  const selectionRequestIdRef = useRef(0);
  const messageIdRef = useRef(0);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId,
  );
  const hasMessages = Boolean(activeConversation?.messages.length);
  const lastCitedMessage = getLastCitedMessage(
    activeConversation?.messages ?? [],
  );

  useEffect(() => {
    let isMounted = true;

    void listChats()
      .then(({ chats }) => {
        if (!isMounted) return;

        const loadedConversations: Conversation[] = chats.map((chat) => ({
          id: chat.conversationId,
          title: chat.title,
          game: chat.game,
          messages: [],
        }));
        setConversations((current) => {
          const currentIds = new Set(
            current.map((conversation) => conversation.id),
          );
          return [
            ...current,
            ...loadedConversations.filter(
              (conversation) => !currentIds.has(conversation.id),
            ),
          ];
        });
      })
      .catch((error: unknown) => {
        if (!isMounted) return;

        setChatError(
          error instanceof Error ? error.message : "Failed to load chats",
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
  }, [activeConversation?.messages]);

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
    if (!activeConversation || !question || isSearching) return;
    const conversationId = activeConversation.id;
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
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
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
        const refreshedChat = await getChat(conversationId).catch(() => null);
        if (isStaleSearch()) return;
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          title: response.title,
          game: refreshedChat?.game ?? conversation.game,
        }));
        completeAssistantMessage(
          conversationId,
          assistantMessage.id,
          buildRetrievalAnswer(response),
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

  const handleNewChat = async () => {
    if (isCreatingChat) return;
    selectionRequestIdRef.current += 1;
    setIsCreatingChat(true);
    setChatError(null);
    try {
      const response = await createChat();
      activeSearchIdRef.current += 1;
      clearTimers(timersRef.current);
      timersRef.current = {};
      const conversation: Conversation = {
        id: response.conversationId,
        title: "New chat",
        game: null,
        messages: [],
      };
      setConversations((current) => [
        conversation,
        ...current.filter(({ id }) => id !== conversation.id),
      ]);
      setActiveId(conversation.id);
      setInput("");
      setIsSearching(false);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Failed to create chat",
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

  const selectConversation = async (conversationId: string) => {
    const requestId = ++selectionRequestIdRef.current;
    setChatError(null);

    try {
      const chat = await getChat(conversationId);
      if (selectionRequestIdRef.current !== requestId) return;

      activeSearchIdRef.current += 1;
      clearTimers(timersRef.current);
      timersRef.current = {};
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                id: chat.conversationId,
                title: chat.title,
                game: chat.game,
                messages: buildRestoredMessages(
                  chat.conversationId,
                  chat.messages,
                ),
              }
            : conversation,
        ),
      );
      setActiveId(chat.conversationId);
      setInput("");
      setIsSearching(false);
    } catch (error) {
      if (selectionRequestIdRef.current !== requestId) return;

      setChatError(
        error instanceof Error ? error.message : "Failed to load chat",
      );
    }
  };

  const deleteConversation = async (conversationId: string) => {
    selectionRequestIdRef.current += 1;
    setChatError(null);
    try {
      await deleteChat(conversationId);
      setConversations((current) =>
        current.filter(({ id }) => id !== conversationId),
      );
      if (activeId === conversationId) {
        activeSearchIdRef.current += 1;
        clearTimers(timersRef.current);
        timersRef.current = {};
        setActiveId(null);
        setInput("");
        setIsSearching(false);
      }
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Failed to delete chat",
      );
    }
  };

  const searchTerm = search.trim().toLowerCase();
  const filteredConversations = conversations.filter(
    ({ title, game }) =>
      !searchTerm ||
      title.toLowerCase().includes(searchTerm) ||
      (game ?? "").toLowerCase().includes(searchTerm),
  );
  const guestBannerText =
    guestAsked >= 3
      ? "You've used all 3 free Guest questions."
      : `Guest plan - ${3 - guestAsked} of 3 questions left, limited to Catan & Ticket to Ride.`;

  return {
    activeConversation,
    activeId,
    chatError,
    deleteConversation,
    filteredConversations,
    guestBannerText,
    handleNewChat,
    hasMessages,
    infoOpen,
    input,
    isCreatingChat,
    isSearching,
    lastCitedMessage,
    role,
    scrollRef,
    search,
    selectConversation,
    sendText,
    setInfoOpen,
    setInput,
    setRole,
    setSearch,
  };
}

export type ChatController = ReturnType<typeof useChatController>;
