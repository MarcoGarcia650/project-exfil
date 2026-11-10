// Runs the API against the TEST database with fresh fixtures, for the
// browser tests (e2e/). Same safety checks as the integration harness.
//   PORT=4100 node test/integration/serve.js
import { setup } from "./harness.js";

const { base } = await setup({ port: Number(process.env.PORT || 4100) });
console.log(`test API ready on ${base}`);
