import type { z } from "zod";

import type { HealthResponseSchema } from "./health-schema";

export type HealthResponseBody = z.infer<typeof HealthResponseSchema>;
