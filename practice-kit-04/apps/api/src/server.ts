import { buildApp } from "./app.js";

const PORT = Number(process.env.API_PORT ?? 4000);

const app = await buildApp({ logger: true });
await app.listen({ port: PORT, host: "0.0.0.0" });
