import "dotenv/config";
import OpenAI from "openai";

// Azure OpenAI through its v1 endpoint with the plain `openai` client.
// The `model` argument of every call is the *deployment name*, read from the environment.
// Web-standard fetch only, so this also runs on Node.

export const isAiEnabled = () => process.env.AI_ENABLED === "true";

export const embedDeployment = () => process.env.AZURE_OPENAI_EMBED_DEPLOYMENT ?? "";
export const chatDeployment = () => process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "";

let client: OpenAI | null = null;

export function getAiClient(): OpenAI {
  if (client) return client;

  const baseURL = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error("Azure OpenAI is not configured (AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY)");
  }

  // The SDK retries 429, 5xx and timeouts once, and only before a response starts,
  // so a stream that already produced tokens is never replayed.
  client = new OpenAI({ baseURL, apiKey, timeout: 30_000, maxRetries: 1 });
  return client;
}
