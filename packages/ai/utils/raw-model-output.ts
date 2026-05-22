export function toRawModelOutput(response: {
  text?: string;
  candidates?: unknown;
  usageMetadata?: unknown;
}) {
  return {
    text: response.text ?? null,
    candidates: response.candidates ?? null,
    usageMetadata: response.usageMetadata ?? null,
  };
}