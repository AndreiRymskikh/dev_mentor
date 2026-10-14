import type { ZodType } from "zod";
import { apiHandler } from "./apiHandler";
import { requireCsrf } from "./auth";
import { NotFoundError, ValidationError } from "./errors";

type Method = "GET" | "POST" | "PUT" | "DELETE";
interface Mutation<Input, Output> { schema: ZodType<Input>; run: (input: Input, request: Request) => Promise<Output> }
export interface CrudOptions<Create, Update, Remove, Output> {
  // Required even for public resources: choose public access explicitly.
  authorize: (request: Request, method: Method) => Promise<void>;
  list?: (request: Request) => Promise<Output>;
  create?: Mutation<Create, Output>;
  update?: Mutation<Update, Output>;
  remove?: Mutation<Remove, Output>;
}
async function input<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try { body = await request.json(); }
  catch { throw new ValidationError("Invalid JSON body"); }
  const parsed = await schema.safeParseAsync(body);
  if (parsed.success) return parsed.data;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  throw new ValidationError("Invalid input", fieldErrors);
}
export function makeCrudRoute<C, U, D, O>(options: CrudOptions<C, U, D, O>) {
  const mutate = <T>(method: Method, operation?: Mutation<T, O>) => apiHandler(async (request) => {
    await options.authorize(request, method);
    requireCsrf(request);
    if (!operation) throw new NotFoundError();
    return operation.run(await input(request, operation.schema), request);
  });
  return {
    GET: apiHandler(async (request) => {
      await options.authorize(request, "GET");
      if (!options.list) throw new NotFoundError();
      return options.list(request);
    }),
    POST: mutate("POST", options.create),
    PUT: mutate("PUT", options.update),
    DELETE: mutate("DELETE", options.remove),
  };
}
