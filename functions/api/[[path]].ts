import { handle } from '../_lib/app';
import type { Env } from '../_lib/db';

// Cloudflare Pages Function: every /api/* request goes through the shared handler.
export const onRequest = (ctx: { request: Request; env: Env }) => handle(ctx.request, ctx.env);
