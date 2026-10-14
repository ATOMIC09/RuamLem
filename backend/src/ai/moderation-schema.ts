import { t } from "elysia";
import { Value } from "@sinclair/typebox/value";

export const MODEL_RULES = ["none", "spam", "off_topic", "personal_data", "abuse"] as const;
export type ModelRule = (typeof MODEL_RULES)[number];

// One schema, used twice: sent to the model as response_format, and used to validate what comes back.
export const ModelVerdictSchema = t.Object(
  {
    verdict: t.UnionEnum(["ok", "hold", "reject"]),
    rule: t.UnionEnum([...MODEL_RULES]),
    reason: t.String({ maxLength: 200 }),
  },
  { additionalProperties: false }
);

export type ModelVerdict = { verdict: "ok" | "hold" | "reject"; rule: ModelRule; reason: string };

// Strict structured outputs accept a small subset of JSON Schema. TypeBox adds `default`,
// and length limits are not needed there (they are still enforced by the validation below).
const UNSUPPORTED_KEYS = new Set(["default", "maxLength", "minLength"]);

function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node).filter(([key]) => !UNSUPPORTED_KEYS.has(key)).map(([key, value]) => [key, strip(value)])
    );
  }
  return node;
}

export const MODEL_VERDICT_JSON_SCHEMA = strip(JSON.parse(JSON.stringify(ModelVerdictSchema))) as Record<string, unknown>;

// Anything that is not exactly the schema counts as invalid: the caller then holds the item.
export function parseModelVerdict(raw: string | null | undefined): ModelVerdict | null {
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  return Value.Check(ModelVerdictSchema, value) ? (value as ModelVerdict) : null;
}
