import { Router } from "express";
import swaggerUi from "swagger-ui-express";

import { openApiDocument, openApiYaml } from "../openapi/openapi.js";

export class DocsRouter {
  readonly router: Router;

  constructor() {
    const router = Router();

    router.get("/openapi.json", (_request, response) => {
      response.json(openApiDocument);
    });

    router.get("/openapi.yml", (_request, response) => {
      response.type("yaml").send(openApiYaml);
    });

    router.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

    this.router = router;
  }
}
