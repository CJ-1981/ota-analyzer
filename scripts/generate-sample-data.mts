// Pre-generate sample OTA log data at build time
// Output: public/sample-logs.json
// The client will load this and compute analytics on the fly
import { generateData } from "../src/lib/data-generator.ts";
import { writeFileSync, mkdirSync } from "fs";

const seed = 42;
const dataSizeMB = 450;

const rawData = generateData(seed, dataSizeMB);
const sampleData = {
  meta: { seed, dataSizeMB, generatedAt: new Date().toISOString() },
  entries: rawData,
};

mkdirSync("public", { recursive: true });
writeFileSync("public/sample-logs.json", JSON.stringify(sampleData), "utf-8");
console.log(`Generated ${rawData.length} log entries -> public/sample-logs.json`);
