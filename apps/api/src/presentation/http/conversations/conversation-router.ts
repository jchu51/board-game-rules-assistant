import { Router, type NextFunction, type Request, type Response } from "express";
import type { ActorService } from "../../../application/auth/actor-service";
import type { ConversationService } from "../../../application/conversations/conversation-service";
import { createActorMiddleware } from "../middleware/actor-middleware";
import { ConversationIdSchema, CreateConversationSchema } from "./conversation-schema";

export class ConversationRouter {
  readonly router: Router;
  constructor(private readonly service: ConversationService, actorService: ActorService) {
    this.router = Router(); this.router.use(createActorMiddleware(actorService));
    this.router.post("/conversations", this.create);
    this.router.get("/conversations", this.list);
    this.router.get("/conversations/:id", this.get);
    this.router.delete("/conversations/:id", this.remove);
  }
  private create = async (req: Request, res: Response, next: NextFunction) => { try {
    const parsed = CreateConversationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ code: "INVALID_REQUEST" });
    return res.status(201).json(await this.service.create({ actor: res.locals.actor, ...parsed.data }));
  } catch (error) { next(error); } };
  private list = async (_req: Request, res: Response, next: NextFunction) => { try { return res.json(await this.service.list(res.locals.actor)); } catch (error) { next(error); } };
  private get = async (req: Request, res: Response, next: NextFunction) => { try {
    const id = ConversationIdSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ code: "INVALID_REQUEST" });
    return res.json(await this.service.get(res.locals.actor, id.data));
  } catch (error) { next(error); } };
  private remove = async (req: Request, res: Response, next: NextFunction) => { try {
    const id = ConversationIdSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ code: "INVALID_REQUEST" });
    await this.service.delete(res.locals.actor, id.data); return res.status(204).send();
  } catch (error) { next(error); } };
}
