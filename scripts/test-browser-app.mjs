/** Actual Expo application browser acceptance; requires separately installed free Playwright/browser. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const { chromium } = await import(
  process.env.CLEANPROOF_PLAYWRIGHT_MODULE ?? "playwright"
);
const server = spawn(process.execPath, ["scripts/serve-app-preview.mjs"], {
  env: { ...process.env, CLEANPROOF_PREVIEW_PORT: "8082" },
});
await new Promise((r, j) => {
  server.stdout.once("data", r);
  server.once("error", j);
});
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CLEANPROOF_BROWSER_EXECUTABLE
    ? { executablePath: process.env.CLEANPROOF_BROWSER_EXECUTABLE }
    : {}),
  args: ["--no-sandbox"],
});
const errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", async (d) => {
    if (d.type() === "prompt") await d.dismiss();
    else await d.accept();
  });
  const open = async () => {
    await page
      .getByLabel("Browser workspace passphrase (12+ characters)")
      .fill("synthetic-browser-test-phrase");
    await page
      .getByRole("button", { name: "Open encrypted browser workspace" })
      .click();
    await page.getByText("Ready for your next site inspection?").waitFor();
  };
  await page.goto("http://127.0.0.1:8082");
  await open();
  await page
    .getByRole("button", { name: "Company & people", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create separate synthetic demo" })
    .click();
  await page.getByText("Ready for your next site inspection?").waitFor();
  console.log(
    "HOME " + (await page.locator("body").innerText()).slice(0, 1800),
  );
  assert.ok(
    (await page.locator("body").innerText()).includes(
      "Synthetic Alder Cleaning",
    ),
  );
  await page.getByRole("button", { name: "Customers", exact: true }).click();
  await page.waitForURL("**/customers");
  await page.getByRole("button", { name: "Add customer", exact: true }).click();
  await page.getByLabel("Customer name").fill("Browser saved customer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByText("Browser saved customer", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.waitForURL("http://127.0.0.1:8082/");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByText("Inspection history", { exact: true }).waitFor();
  console.log(
    "HISTORY " + (await page.locator("body").innerText()).slice(0, 1800),
  );
  assert.ok(
    (await page.locator("body").innerText()).includes("Riverside Offices"),
  );
  await page
    .getByRole("button", { name: "View completed record", exact: true })
    .click();
  await page.waitForURL("**/inspect?*");
  await page.getByText("Completed inspection", { exact: true }).waitFor();
  console.log(
    "COMPLETED " + (await page.locator("body").innerText()).slice(-1600),
  );
  await page
    .getByRole("button", { name: "Preview & export report", exact: true })
    .click();
  await page.getByText("Inspection report", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Preview report / browser print" }).click();
  await page.getByRole("dialog", { name: "Inspection report preview" }).waitFor();
  const reportFrame = page.frameLocator('iframe[title="Branded inspection report"]');
  assert.ok((await reportFrame.locator("body").innerText()).includes("Synthetic Alder Cleaning"));
  assert.ok((await reportFrame.locator("img").count()) > 0);
  await page.getByRole("button", { name: "Close report", exact: true }).click();
  await page.goto("http://127.0.0.1:8082");
  await open();
  assert.ok(
    (await page.locator("body").innerText()).includes(
      "Synthetic Alder Cleaning",
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual Expo routes, encrypted browser SQLite, independent seeded workspace and reload persistence. Native and backend acceptance are separate.",
  );
} finally {
  await browser.close();
  server.kill();
}
