// Runs a backend script against the TEST database (for the e2e suite):
//   node test/integration/run-script.js prisma/make-admin.js <user>
import { script } from "./harness.js";

const [file, ...args] = process.argv.slice(2);
const r = script(file, ...args);
process.stdout.write(r.stdout ?? "");
process.stderr.write(r.stderr ?? "");
process.exit(r.status ?? 1);
