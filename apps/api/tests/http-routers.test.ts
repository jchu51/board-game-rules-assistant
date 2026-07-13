import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IngestionRouter } from "../src/presentation/http/ingestion/ingestion-router";
import { RetrievalRouter } from "../src/presentation/http/retrieval/retrieval-router";
import { HealthRouter } from "../src/presentation/http/health/health-router";
import { DocsRouter } from "../src/presentation/http/docs/docs-router";
import { ChatRouter } from "../src/presentation/http/chat/chat-router";
import { createApp } from "../src/presentation/http/app";
import { InMemoryRulebookRepository } from "../src/infrastructure/persistence/rulebook/in-memory-rulebook-repository";
import type { IngestionService } from "../src/application/ingestion/ingestion-service";
import type { RetrievalService } from "../src/application/retrieval/retrieval-service";
import { InvalidSplitterParamsError } from "../src/domain/ingestion/ingestion-errors";
import { testConfig } from "./test-config";
import type { ConversationRepository } from "../src/domain/conversation/conversation-repository";

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
const conversationRepository = {
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  getChats: vi.fn(),
  appendMessages: vi.fn(),
  getMessages: vi.fn(),
} satisfies ConversationRepository;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HTTP routers", () => {
  it("creates a conversation without a request body", async () => {
    vi.mocked(conversationRepository.createConversation).mockResolvedValue(
      "11111111-1111-4111-8111-111111111111",
    );
    const router = new ChatRouter(conversationRepository);
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
    const router = new ChatRouter(conversationRepository);
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
    const router = new ChatRouter(conversationRepository);
    const handler = router.router.stack.find(
      (layer) => layer.route?.methods.get,
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
    const router = new ChatRouter(conversationRepository);
    const handler = router.router.stack.find(
      (layer) => layer.route?.methods.get,
    )?.route.stack[0]?.handle;
    const next = vi.fn();

    await handler?.({} as Request, createResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("hard deletes a chat", async () => {
    vi.mocked(conversationRepository.deleteConversation).mockResolvedValue(
      true,
    );
    const router = new ChatRouter(conversationRepository);
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
    const router = new ChatRouter(conversationRepository);
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
    const health = new HealthRouter();
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
            delete: expect.any(Object),
          }),
        }),
      }),
    );

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

  it("uploads, lists, and deletes rulebooks", async () => {
    const repository = new InMemoryRulebookRepository();
    const router = new IngestionRouter(ingestionService, repository, {
      uploadDirectory: "/tmp",
      maxUploadSizeBytes: 1024,
      isProduction: false,
    }) as unknown as {
      uploadPdfs: (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => Promise<unknown>;
      listRulebooks: (request: Request, response: Response) => unknown;
      deleteRulebook: (request: Request, response: Response) => unknown;
    };
    vi.mocked(ingestionService.ingestPdf).mockResolvedValue({
      documentCount: 2,
      chunkCount: 4,
    });
    const response = createResponse();
    await router.uploadPdfs(
      {
        body: { gameName: "Catan" },
        file: {
          originalname: "catan.pdf",
          size: 3,
          path: "/tmp/nonexistent-upload.pdf",
        },
      } as Request,
      response,
      vi.fn(),
    );
    expect(response.status).toHaveBeenCalledWith(200);
    const created = repository.list()[0];
    expect(created).toMatchObject({ gameName: "Catan", pdfName: "catan.pdf" });

    const listResponse = createResponse();
    router.listRulebooks({} as Request, listResponse);
    expect(listResponse.json).toHaveBeenCalledWith({ rulebooks: [created] });

    const deleteResponse = createResponse();
    router.deleteRulebook(
      { params: { id: created?.id } } as unknown as Request,
      deleteResponse,
    );
    expect(deleteResponse.status).toHaveBeenCalledWith(204);

    const missingResponse = createResponse();
    router.deleteRulebook(
      { params: { id: "missing" } } as unknown as Request,
      missingResponse,
    );
    expect(missingResponse.status).toHaveBeenCalledWith(404);
  });

  it("rejects missing files, invalid bodies, and invalid splitter settings", async () => {
    const router = new IngestionRouter(
      ingestionService,
      new InMemoryRulebookRepository(),
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
  });

  it("handles upload middleware failures and success", () => {
    const createRouter = (isProduction: boolean) =>
      new IngestionRouter(ingestionService, new InMemoryRulebookRepository(), {
        uploadDirectory: "/tmp",
        maxUploadSizeBytes: 1024,
        isProduction,
      }) as unknown as {
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
