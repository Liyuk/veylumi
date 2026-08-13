import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./services/database/drizzle",
  schema: "./services/database/db/schema.ts",
  dialect: "sqlite",
});
