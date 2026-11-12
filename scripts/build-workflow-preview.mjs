import { readFileSync, writeFileSync } from "node:fs";
const bundle = [
  "domain/inspection",
  "domain/workflow",
  "reporting/demoReport",
  "reporting/inspectionReport",
]
  .map((p) =>
    readFileSync(new URL(`../.test-build/src/${p}.js`, import.meta.url), "utf8")
      .replace(/^import .*;\n/gm, "")
      .replace(/^export /gm, "")
      .replace(/^\{\};$/gm, ""),
  )
  .join("\n");
const sample = JSON.parse(
  readFileSync(
    new URL("../previews/sample-data.json", import.meta.url),
    "utf8",
  ),
);
const shell = readFileSync(
  new URL("./workflow-preview-shell.html", import.meta.url),
  "utf8",
);
writeFileSync(
  new URL("../previews/cleanproof-workflows.html", import.meta.url),
  shell
    .replace("/*SHARED_CODE*/", bundle)
    .replace(
      "/*SAMPLE_DATA*/",
      JSON.stringify(sample).replace(/</g, "\\u003c"),
    ),
);
console.log(
  "Built labelled browser reconstruction with shared domain rules and native report HTML builder. No storage/backend security is simulated.",
);
