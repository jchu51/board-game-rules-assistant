import { createMemoryPersistence } from "../src/index.js";
import { runPersistenceContract } from "./contract-suite.js";

runPersistenceContract("memory persistence", async () =>
  createMemoryPersistence(),
);
