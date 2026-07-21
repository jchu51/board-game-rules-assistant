import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IngestionRouter } from "../src/presentation/http/ingestion/ingestion-router";
import { RetrievalRouter } from "../src/presentation/http/retrieval/retrieval-router";
import { HealthRouter } from "../src/presentation/http/health/health-router";
import { DocsRouter } from "../src/presentation/http/docs/docs-router";
import { ChatRouter } from "../src/presentation/http/chat/chat-router";
import { ConversationService } from "../src/application/conversation/conversation-service";
import { createApp } from "../src/presentation/http/app";
import { InMemoryRulebookRepository } from "../src/infrastructure/persistence/rulebook/in-memory-rulebook-repository";
import type { IngestionService } from "../src/application/ingestion/ingestion-service";
import type { RetrievalService } from "../src/application/retrieval/retrieval-service";
import { InvalidSplitterParamsError } from "../src/domain/ingestion/ingestion-errors";
import { ConversationNotFoundError } from "../src/domain/conversation/conversation-errors";
import { testConfig } from "./test-config";
import type { ConversationRepository } from "../src/domain/conversation/conversation-repository";
import type { VectorStore } from "../src/domain/rulebook/vector-store";

const createResponse = () => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
    type: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.type.mockReturnValue(response);
  return response as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    type: ReturnType<typeof vi.fn>;
  };
};

const ingestionService = {
  ingestPdf: vi.fn(),
} as unknown as IngestionService;
const retrievalService = {
  search: vi.fn(),
} as unknown as RetrievalService;
const vectorStore = {
  upsert: vi.fn(),
  deleteByDocumentId: vi.fn(),
  similaritySearch: vi.fn(),
  similaritySearchVectorWithScore: vi.fn(),
  maxMarginalRelevanceSearch: vi.fn(),
} satisfies VectorStore;
const conversationRepository = {
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  getChat: vi.fn(),
  getChats: vi.fn(),
  updateTitle: vi.fn(),
  appendMessages: vi.fn(),
  getMessages: vi.fn(),
} satisfies ConversationRepository;
const conversationService = new ConversationService(conversationRepository);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(vectorStore.deleteByDocumentId).mockResolvedValue();
});

describe("HTTP routers", () => {
  it("creates a conversation without a request body", async () => {
    vi.mocked(conversationRepository.createConversation).mockResolvedValue(
      "11111111-1111-4111-8111-111111111111",
    );
    const router = new ChatRouter(conversationService);
    const handler = router.router.stack[0]?.route.stack[0]?.handle;
    const response = createResponse();

    await handler?.({} as Request, response, vi.fn());

    expect(conversationRepository.createConversation).toHaveBeenCalledOnce();
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      conversationId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("forwards conversation creation failures", async () => {
    const error = new Error("create failed");
    vi.mocked(conversationRepository.createConversation).mockRejectedValue(
      error,
    );
    const router = new ChatRouter(conversationService);
    const handler = router.router.stack[0]?.route.stack[0]?.handle;
    const next = vi.fn();

    await handler?.({} as Request, createResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("lists newest chat titles", async () => {
    vi.mocked(conversationRepository.getChats).mockResolvedValue([
      {
        conversationId: "22222222-2222-4222-8222-222222222222",
        title: "Trading rules",
      },
      {
        conversationId: "11111111-1111-4111-8111-111111111111",
        title: "New chat",
      },
    ]);
    const router = new ChatRouter(conversationService);
    const handler = router.router.stack.find(
      (layer) => layer.route?.path === "/chats" && layer.route.methods.get,
    )?.route.stack[0]?.handle;
    const response = createResponse();

    await handler?.({} as Request, response, vi.fn());

    expect(conversationRepository.getChats).toHaveBeenCalledOnce();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      chats: [
        {
          conversationId: "22222222-2222-4222-8222-222222222222",
          title: "Trading rules",
        },
        {
          conversationId: "11111111-1111-4111-8111-111111111111",
          title: "New chat",
        },
      ],
    });
  });

  it("forwards chat listing failures", async () => {
    const error = new Error("list failed");
    vi.mocked(conversationRepository.getChats).mockRejectedValue(error);
    const router = new ChatRouter(conversationService);
    const handler = router.router.stack.find(
      (layer) => layer.route?.path === "/chats" && layer.route.methods.get,
    )?.route.stack[0]?.handle;
    const next = vi.fn();

    await handler?.({} as Request, createResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("gets a chat with its ordered message history", async () => {
    vi.mocked(conversationRepository.getChat).mockResolvedValue({
      conversationId: "11111111-1111-4111-8111-111111111111",
      title: "Catan rules",
      messages: [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ],
    });
    const router = new ChatRouter(conversationService);
    const handler = router.router.stack.find(
      (layer) => layer.route?.path === "/chats/:id" && layer.route.methods.get,
    )?.route.stack[0]?.handle;
    const response = createResponse();

    await handler?.(
      {
        params: { id: "11111111-1111-4111-8111-111111111111" },
      } as unknown as Request,
      response,
      vi.fn(),
    );

    expect(conversationRepository.getChat).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      conversationId: "11111111-1111-4111-8111-111111111111",
      title: "Catan rules",
      messages: [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ],
    });
  });

  it("returns not found when getting a missing chat", async () => {
    vi.mocked(conversationRepository.getChat).mockResolvedValue(null);
    const router = new ChatRouter(conversationService);
    const handler = router.router.stack.find(
      (layer) => layer.route?.path === "/chats/:id" && layer.route.methods.get,
    )?.route.stack[0]?.handle;
    const response = createResponse();

    await handler?.(
      { params: { id: "missing" } } as unknown as Request,
      response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Chat not found" });
  });

  it("forwards chat history failures", async () => {
    const error = new Error("get failed");
    vi.mocked(conversationRepository.getChat).mockRejectedValue(error);
    const router = new ChatRouter(conversationService);
    const handler = router.router.stack.find(
      (layer) => layer.route?.path === "/chats/:id" && layer.route.methods.get,
    )?.route.stack[0]?.handle;
    const next = vi.fn();

    await handler?.(
      { params: { id: "chat" } } as unknown as Request,
      createResponse(),
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });

  it("hard deletes a chat", async () => {
    vi.mocked(conversationRepository.deleteConversation).mockResolvedValue(
      true,
    );
    const router = new ChatRouter(conversationService);
    const handler = router.router.stack.find(
      (layer) => layer.route?.methods.delete,
    )?.route.stack[0]?.handle;
    const response = createResponse();

    await handler?.(
      {
        params: { id: "11111111-1111-4111-8111-111111111111" },
      } as unknown as Request,
      response,
      vi.fn(),
    );

    expect(conversationRepository.deleteConversation).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.send).toHaveBeenCalledOnce();
  });

  it("returns not found when deleting a missing chat", async () => {
    vi.mocked(conversationRepository.deleteConversation).mockResolvedValue(
      false,
    );
    const router = new ChatRouter(conversationService);
    const handler = router.router.stack.find(
      (layer) => layer.route?.methods.delete,
    )?.route.stack[0]?.handle;
    const response = createResponse();

    await handler?.(
      { params: { id: "missing" } } as unknown as Request,
      response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Chat not found" });
  });

  it("creates the app and serves health and OpenAPI handlers", () => {
    const health = new HealthRouter(vi.fn().mockResolvedValue(undefined));
    const docs = new DocsRouter();
    expect(
      createApp({
        config: testConfig,
        routers: [health.router, docs.router],
      }),
    ).toBeDefined();

    const healthResponse = createResponse();
    const healthHandler = health.router.stack[0]?.route.stack[0]?.handle;
    healthHandler?.({} as Request, healthResponse, vi.fn());
    expect(healthResponse.json).toHaveBeenCalledWith({
      status: "ok",
      service: "board-game-rules-assistant-api",
    });

    const jsonResponse = createResponse();
    docs.router.stack[0]?.route.stack[0]?.handle(
      {} as Request,
      jsonResponse,
      vi.fn(),
    );
    expect(jsonResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        openapi: expect.any(String),
        paths: expect.objectContaining({
          "/chats": expect.objectContaining({
            get: expect.any(Object),
            post: expect.any(Object),
          }),
          "/chats/{id}": expect.objectContaining({
            get: expect.any(Object),
            delete: expect.any(Object),
          }),
        }),
        components: expect.objectContaining({
          schemas: expect.objectContaining({
            ChatMessage: expect.any(Object),
            GetChatResponse: expect.objectContaining({
              type: "object",
              required: ["conversationId", "title", "messages"],
              additionalProperties: false,
            }),
            RetrievalSearchResponse: expect.objectContaining({
              type: "object",
              required: ["title", "answer", "matches"],
              properties: {
                title: expect.any(Object),
                answer: expect.any(Object),
                matches: expect.any(Object),
              },
              additionalProperties: false,
            }),
          }),
        }),
      }),
    );
    expect(
      jsonResponse.json.mock.calls[0]?.[0].paths["/retrieval/search"].post
        .responses["404"],
    ).toEqual(expect.any(Object));

    const yamlResponse = createResponse();
    docs.router.stack[1]?.route.stack[0]?.handle(
      {} as Request,
      yamlResponse,
      vi.fn(),
    );
    expect(yamlResponse.type).toHaveBeenCalledWith("yaml");
    expect(yamlResponse.send).toHaveBeenCalledWith(
      expect.stringMatching(/openapi:/),
    );
    expect(yamlResponse.send.mock.calls[0]?.[0]).not.toContain("gameTitle");
  });

  it("reports persistence readiness and dependency outages", async () => {
    const readinessCheck = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("database unavailable"));
    const health = new HealthRouter(readinessCheck);
    const readyHandler = health.router.stack.find(
      (layer) => layer.route?.path === "/ready",
    )?.route.stack[0]?.handle;

    const readyResponse = createResponse();
    await readyHandler?.({} as Request, readyResponse, vi.fn());
    expect(readyResponse.status).toHaveBeenCalledWith(200);
    expect(readyResponse.json).toHaveBeenCalledWith({
      status: "ok",
      service: "board-game-rules-assistant-api",
    });

    const unavailableResponse = createResponse();
    await readyHandler?.({} as Request, unavailableResponse, vi.fn());
    expect(unavailableResponse.status).toHaveBeenCalledWith(503);
    expect(unavailableResponse.json).toHaveBeenCalledWith({
      error: "Service unavailable",
    });
    expect(readinessCheck).toHaveBeenCalledTimes(2);
  });

  it("validates and completes retrieval searches", async () => {
    const router = new RetrievalRouter(retrievalService) as unknown as {
      search: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    const invalidResponse = createResponse();
    await router.search(
      { body: { query: "missing conversation" } } as Request,
      invalidResponse,
      vi.fn(),
    );
    expect(invalidResponse.status).toHaveBeenCalledWith(400);

    vi.mocked(retrievalService.search).mockResolvedValue({
      title: "Catan city production",
      answer: "A city produces two resources.",
      matches: [],
    });
    const response = createResponse();
    await router.search(
      {
        body: {
          conversationId: "11111111-1111-4111-8111-111111111111",
          query: "How many resources?",
        },
      } as Request,
      response,
      vi.fn(),
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      title: "Catan city production",
      answer: "A city produces two resources.",
      matches: [],
    });
  });

  it("forwards retrieval failures", async () => {
    const router = new RetrievalRouter(retrievalService) as unknown as {
      search: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    const next = vi.fn();
    const error = new Error("failed");
    vi.mocked(retrievalService.search).mockRejectedValue(error);

    await router.search(
      {
        body: {
          conversationId: "11111111-1111-4111-8111-111111111111",
          query: "How many resources?",
        },
      } as Request,
      createResponse(),
      next,
    );
    expect(next).toHaveBeenCalledWith(error);
  });

  it("returns not found when retrieval targets a missing conversation", async () => {
    const router = new RetrievalRouter(retrievalService) as unknown as {
      search: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    const next = vi.fn();
    vi.mocked(retrievalService.search).mockRejectedValue(
      new ConversationNotFoundError("11111111-1111-4111-8111-111111111111"),
    );
    const response = createResponse();

    await router.search(
      {
        body: {
          conversationId: "11111111-1111-4111-8111-111111111111",
          query: "How many resources?",
        },
      } as Request,
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: "Conversation not found",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("uploads, lists, and deletes rulebooks", async () => {
    const repository = new InMemoryRulebookRepository();
    const save = vi.spyOn(repository, "save");
    const router = new IngestionRouter(
      ingestionService,
      repository,
      vectorStore,
      {
        uploadDirectory: "/tmp",
        maxUploadSizeBytes: 1024,
        isProduction: false,
      },
    ) as unknown as {
      uploadPdfs: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
      listRulebooks: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
      deleteRulebook: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    vi.mocked(ingestionService.ingestPdf).mockResolvedValue({
      documentCount: 2,
      chunkCount: 4,
    });
    const pdfData = Uint8Array.from([0x25, 0x50, 0x44, 0x46]);
    const filePath = join(tmpdir(), `${randomUUID()}.pdf`);
    await writeFile(filePath, pdfData);
    const response = createResponse();
    await router.uploadPdfs(
      {
        body: { gameName: "Catan" },
        file: {
          originalname: "catan.pdf",
          mimetype: "application/pdf",
          size: pdfData.byteLength,
          path: filePath,
        },
      } as Request,
      response,
      vi.fn(),
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(save).toHaveBeenCalledWith({
      id: expect.any(String),
      gameName: "Catan",
      pdfName: "catan.pdf",
      mimeType: "application/pdf",
      fileSize: pdfData.byteLength,
      pdfData: Buffer.from(pdfData),
    });
    expect(
      vi.mocked(ingestionService.ingestPdf).mock.invocationCallOrder[0],
    ).toBeLessThan(save.mock.invocationCallOrder[0]!);
    const created = (await repository.list())[0];
    expect(created).toMatchObject({ gameName: "Catan", pdfName: "catan.pdf" });

    const listResponse = createResponse();
    await router.listRulebooks({} as Request, listResponse, vi.fn());
    expect(listResponse.json).toHaveBeenCalledWith({ rulebooks: [created] });

    const deleteResponse = createResponse();
    await router.deleteRulebook(
      { params: { id: created?.id } } as unknown as Request,
      deleteResponse,
      vi.fn(),
    );
    expect(deleteResponse.status).toHaveBeenCalledWith(204);
    expect(vectorStore.deleteByDocumentId).toHaveBeenCalledWith(created?.id);

    const missingResponse = createResponse();
    await router.deleteRulebook(
      { params: { id: "missing" } } as unknown as Request,
      missingResponse,
      vi.fn(),
    );
    expect(missingResponse.status).toHaveBeenCalledWith(404);
    expect(vectorStore.deleteByDocumentId).toHaveBeenCalledOnce();
  });

  it("removes ingested vectors when rulebook persistence fails", async () => {
    const repository = new InMemoryRulebookRepository();
    const persistenceError = new Error("save failed");
    vi.spyOn(repository, "save").mockRejectedValue(persistenceError);
    vi.mocked(ingestionService.ingestPdf).mockResolvedValue({
      documentCount: 1,
      chunkCount: 2,
    });
    const router = new IngestionRouter(
      ingestionService,
      repository,
      vectorStore,
      {
        uploadDirectory: "/tmp",
        maxUploadSizeBytes: 1024,
        isProduction: false,
      },
    ) as unknown as {
      uploadPdfs: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    const filePath = join(tmpdir(), `${randomUUID()}.pdf`);
    await writeFile(filePath, Uint8Array.from([0x25, 0x50, 0x44, 0x46]));
    const next = vi.fn();

    await router.uploadPdfs(
      {
        body: { gameName: "Catan" },
        file: {
          originalname: "catan.pdf",
          mimetype: "application/pdf",
          size: 4,
          path: filePath,
        },
      } as Request,
      createResponse(),
      next,
    );

    const documentId = vi.mocked(ingestionService.ingestPdf).mock.calls[0]?.[0]
      .metadata.documentId;
    expect(vectorStore.deleteByDocumentId).toHaveBeenCalledWith(documentId);
    expect(next).toHaveBeenCalledWith(persistenceError);
  });

  it("reports both persistence and vector cleanup failures", async () => {
    const repository = new InMemoryRulebookRepository();
    const persistenceError = new Error("save failed");
    const cleanupError = new Error("cleanup failed");
    vi.spyOn(repository, "save").mockRejectedValue(persistenceError);
    vi.mocked(ingestionService.ingestPdf).mockResolvedValue({
      documentCount: 1,
      chunkCount: 2,
    });
    vi.mocked(vectorStore.deleteByDocumentId).mockRejectedValue(cleanupError);
    const router = new IngestionRouter(
      ingestionService,
      repository,
      vectorStore,
      {
        uploadDirectory: "/tmp",
        maxUploadSizeBytes: 1024,
        isProduction: false,
      },
    ) as unknown as {
      uploadPdfs: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    const filePath = join(tmpdir(), `${randomUUID()}.pdf`);
    await writeFile(filePath, Uint8Array.from([0x25, 0x50, 0x44, 0x46]));
    const next = vi.fn();

    await router.uploadPdfs(
      {
        body: { gameName: "Catan" },
        file: {
          originalname: "catan.pdf",
          mimetype: "application/pdf",
          size: 4,
          path: filePath,
        },
      } as Request,
      createResponse(),
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "AggregateError",
        message: "Rulebook upload and vector cleanup failed",
        errors: [persistenceError, cleanupError],
      }),
    );
  });

  it("forwards rulebook list failures", async () => {
    const repository = new InMemoryRulebookRepository();
    const error = new Error("list failed");
    vi.spyOn(repository, "list").mockRejectedValue(error);
    const router = new IngestionRouter(
      ingestionService,
      repository,
      vectorStore,
      {
        uploadDirectory: "/tmp",
        maxUploadSizeBytes: 1024,
        isProduction: false,
      },
    ) as unknown as {
      listRulebooks: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    const next = vi.fn();

    await router.listRulebooks({} as Request, createResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("forwards rulebook delete failures", async () => {
    const repository = new InMemoryRulebookRepository();
    await repository.save({
      id: "rulebook-1",
      gameName: "Catan",
      pdfName: "catan.pdf",
      mimeType: "application/pdf",
      fileSize: 4,
      pdfData: Uint8Array.from([1, 2, 3, 4]),
    });
    const error = new Error("delete failed");
    vi.spyOn(repository, "deleteById").mockRejectedValue(error);
    const router = new IngestionRouter(
      ingestionService,
      repository,
      vectorStore,
      {
        uploadDirectory: "/tmp",
        maxUploadSizeBytes: 1024,
        isProduction: false,
      },
    ) as unknown as {
      deleteRulebook: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    const next = vi.fn();

    await router.deleteRulebook(
      { params: { id: "rulebook-1" } } as unknown as Request,
      createResponse(),
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });

  it("keeps a rulebook record when vector deletion fails", async () => {
    const repository = new InMemoryRulebookRepository();
    await repository.save({
      id: "rulebook-1",
      gameName: "Catan",
      pdfName: "catan.pdf",
      mimeType: "application/pdf",
      fileSize: 4,
      pdfData: Uint8Array.from([1, 2, 3, 4]),
    });
    const deleteRecord = vi.spyOn(repository, "deleteById");
    const error = new Error("vector delete failed");
    vi.mocked(vectorStore.deleteByDocumentId).mockRejectedValue(error);
    const router = new IngestionRouter(
      ingestionService,
      repository,
      vectorStore,
      {
        uploadDirectory: "/tmp",
        maxUploadSizeBytes: 1024,
        isProduction: false,
      },
    ) as unknown as {
      deleteRulebook: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    const next = vi.fn();

    await router.deleteRulebook(
      { params: { id: "rulebook-1" } } as unknown as Request,
      createResponse(),
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
    expect(deleteRecord).not.toHaveBeenCalled();
    await expect(repository.getById("rulebook-1")).resolves.not.toBeNull();
  });

  it("rejects missing files, invalid bodies, and invalid splitter settings", async () => {
    const repository = new InMemoryRulebookRepository();
    const save = vi.spyOn(repository, "save");
    const router = new IngestionRouter(
      ingestionService,
      repository,
      vectorStore,
      {
        uploadDirectory: "/tmp",
        maxUploadSizeBytes: 1024,
        isProduction: false,
      },
    ) as unknown as {
      uploadPdfs: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
    };
    const missingResponse = createResponse();
    await router.uploadPdfs({ body: {} } as Request, missingResponse, vi.fn());
    expect(missingResponse.json).toHaveBeenCalledWith({
      error: "file is required",
    });

    const invalidResponse = createResponse();
    await router.uploadPdfs(
      {
        body: {},
        file: { path: "/tmp/nonexistent-invalid.pdf" },
      } as Request,
      invalidResponse,
      vi.fn(),
    );
    expect(invalidResponse.status).toHaveBeenCalledWith(400);

    vi.mocked(ingestionService.ingestPdf).mockRejectedValue(
      new InvalidSplitterParamsError(10, 10),
    );
    const splitterResponse = createResponse();
    await router.uploadPdfs(
      {
        body: { gameName: "Catan" },
        file: {
          originalname: "catan.pdf",
          size: 3,
          path: "/tmp/nonexistent-splitter.pdf",
        },
      } as Request,
      splitterResponse,
      vi.fn(),
    );
    expect(splitterResponse.status).toHaveBeenCalledWith(400);
    expect(save).not.toHaveBeenCalled();
    await expect(repository.list()).resolves.toEqual([]);
  });

  it("handles upload middleware failures and success", () => {
    const createRouter = (isProduction: boolean) =>
      new IngestionRouter(
        ingestionService,
        new InMemoryRulebookRepository(),
        vectorStore,
        {
          uploadDirectory: "/tmp",
          maxUploadSizeBytes: 1024,
          isProduction,
        },
      ) as unknown as {
        handleUpload: (
          middleware: (
            request: Request,
            response: Response,
            callback: (error?: unknown) => void,
          ) => void,
        ) => (request: Request, response: Response, next: NextFunction) => void;
      };

    const limitedResponse = createResponse();
    createRouter(false).handleUpload((_request, _response, callback) => {
      callback(new MulterError("LIMIT_FILE_SIZE"));
    })({} as Request, limitedResponse, vi.fn());
    expect(limitedResponse.status).toHaveBeenCalledWith(413);

    const developmentResponse = createResponse();
    createRouter(false).handleUpload((_request, _response, callback) => {
      callback(new Error("bad upload"));
    })({} as Request, developmentResponse, vi.fn());
    expect(developmentResponse.json).toHaveBeenCalledWith({
      error: "bad upload",
    });

    const productionResponse = createResponse();
    createRouter(true).handleUpload((_request, _response, callback) => {
      callback(new Error("private detail"));
    })({} as Request, productionResponse, vi.fn());
    expect(productionResponse.json).toHaveBeenCalledWith({
      error: "Upload failed",
    });

    const next = vi.fn();
    createRouter(false).handleUpload((_request, _response, callback) => {
      callback();
    })({} as Request, createResponse(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});
