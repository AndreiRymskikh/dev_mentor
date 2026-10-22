import { ValidationError } from "./errors";

/** Bound bytes actually read; Content-Length is untrusted and optional. */
export async function readJsonBody(request: Request, maximumBytes = 4096, allowEmpty = false): Promise<unknown> {
  const isJson = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";
  if (!request.body) {
    if (allowEmpty) return {};
    throw new ValidationError("Expected JSON body");
  }
  if (!allowEmpty && !isJson) {
    throw new ValidationError("Expected JSON body");
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        throw new ValidationError("JSON body too large");
      }
      chunks.push(value);
    }
    if (allowEmpty && length === 0) return {};
    if (!isJson) throw new ValidationError("Expected JSON body");
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new ValidationError("Invalid JSON body");
  } finally { reader.releaseLock(); }
}
