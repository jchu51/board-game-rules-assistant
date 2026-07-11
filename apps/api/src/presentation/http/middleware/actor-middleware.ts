import type { RequestHandler } from "express";
import type { ActorService } from "../../../application/auth/actor-service";

export const createActorMiddleware = (actorService: ActorService): RequestHandler =>
  async (request, response, next) => {
    try {
      response.locals.actor = await actorService.resolve(request.headers);
      next();
    } catch (error) {
      next(error);
    }
  };
