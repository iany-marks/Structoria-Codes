import { cp, mkdir, rm } from "node:fs/promises";

const output = "dist";
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of ["index.html", "script.js", "styles.css", "assets"]) {
  await cp(entry, `${output}/${entry}`, { recursive: true });
}

console.log("Built Structoria's static frontend in dist/.");
