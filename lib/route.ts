import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { checkAccess, errorResponse } from "./ai";

/** Wraps an API handler with access checks, body validation and uniform errors. */
export function handler<S extends z.ZodType>(schema: S, fn: (body: z.infer<S>) => Promise<unknown>) {
  return async (req: Request) => {
    const denied = checkAccess(req);
    if (denied) return denied;
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
    }
    try {
      return NextResponse.json(await fn(parsed.data));
    } catch (e) {
      return errorResponse(e);
    }
  };
}
