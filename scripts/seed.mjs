// Seeds attendee accounts into Convex from a CSV file.
//
// CSV format (with header row): regNo,username,password
// Usage:
//   node scripts/seed.mjs scripts/attendees.example.csv
//   node scripts/seed.mjs path/to/attendees.csv --prod   (seed the production deployment)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const csvPath = process.argv[2];
const prod = process.argv.includes("--prod");
if (!csvPath) {
  console.error("Usage: node scripts/seed.mjs <attendees.csv> [--prod]");
  process.exit(1);
}

const lines = readFileSync(csvPath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

const header = lines.shift().toLowerCase().replace(/\s/g, "");
if (header !== "regno,username,password") {
  console.error(`Unexpected header "${header}" — expected: regNo,username,password`);
  process.exit(1);
}

const users = lines.map((line, i) => {
  const parts = line.split(",");
  if (parts.length !== 3) {
    console.error(`Line ${i + 2}: expected 3 comma-separated values, got ${parts.length}`);
    process.exit(1);
  }
  const [regNo, username, password] = parts.map((p) => p.trim());
  return { regNo, username, password };
});

console.log(`Seeding ${users.length} attendee(s)${prod ? " to PRODUCTION" : ""}...`);

// Seed in batches so a huge attendee list doesn't exceed the CLI arg limit
const BATCH = 100;
for (let i = 0; i < users.length; i += BATCH) {
  const batch = users.slice(i, i + BATCH);
  const json = JSON.stringify({ users: batch });
  // Quote for the Windows/POSIX shell that `shell: true` uses
  const quoted =
    process.platform === "win32"
      ? `"${json.replace(/"/g, '\\"')}"`
      : `'${json.replace(/'/g, `'\\''`)}'`;
  const cliArgs = ["convex", "run", "seed:seedUsers", quoted];
  if (prod) cliArgs.push("--prod");
  try {
    const output = execFileSync("npx", cliArgs, { encoding: "utf8", shell: true });
    console.log(output.trim());
  } catch (err) {
    // The Convex CLI on Windows sometimes crashes during teardown (libuv
    // assertion) AFTER the function has already run. If we got a result on
    // stdout, the seed succeeded — report it and keep going.
    if (err.stdout && err.stdout.includes("created")) {
      console.log(err.stdout.trim());
    } else {
      console.error(err.stderr || err.message);
      process.exit(1);
    }
  }
}
console.log("Done.");
