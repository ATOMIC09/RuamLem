#!/usr/bin/env bun
/**
 * Quick Backend Testing Script
 * Run: bun run tests/quick-test.ts
 */

import { logger } from "../src/utils/logger";

logger.separator("🧪 Backend Quick Test Suite");

const BASE_URL = "http://localhost:3030";

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    logger.info(`Testing: ${name}`);
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    logger.info(`✅ PASSED: ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, duration, error: error.message });
    logger.error(`❌ FAILED: ${name} (${duration}ms)`, error.message);
  }
}

async function runTests() {
  logger.info("Starting tests...\n");

  // Test 1: Health Check
  await test("Health Check Endpoint", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    if (data.status !== "online") throw new Error("Server not online");
  });

  // Test 2: Debug Info
  await test("Debug Info Endpoint", async () => {
    const response = await fetch(`${BASE_URL}/debug/info`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    if (!data.server) throw new Error("Missing server info");
    logger.debug("Server Info", data);
  });

  // Test 3: OpenAPI Documentation
  await test("OpenAPI Documentation", async () => {
    const response = await fetch(`${BASE_URL}/openapi`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const html = await response.text();
    if (!html.includes("swagger")) throw new Error("Missing Swagger UI");
  });

  // Test 4: CORS Configuration
  await test("CORS Configuration", async () => {
    const response = await fetch(`${BASE_URL}/health`, {
      headers: {
        "Origin": "http://localhost:3000"
      }
    });
    const corsOrigin = response.headers.get("access-control-allow-origin");
    if (!corsOrigin) throw new Error("CORS header missing");
  });

  // Test 5: 404 Error Handling
  await test("404 Error Handling", async () => {
    const response = await fetch(`${BASE_URL}/nonexistent`);
    if (response.ok) throw new Error("Should return 404");
  });

  // Print Results
  logger.separator("📊 Test Results");
  
  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    const status = result.passed ? "✅" : "❌";
    const error = result.error ? ` - ${result.error}` : "";
    logger.info(`${status} ${result.name} (${result.duration}ms)${error}`);
    if (result.passed) passed++;
    else failed++;
  });

  logger.separator();
  logger.info(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed === 0) {
    logger.info("🎉 All tests passed!");
  } else {
    logger.warn(`⚠️ ${failed} test(s) failed`);
  }

  logger.separator();
}

// Run tests
await runTests();
