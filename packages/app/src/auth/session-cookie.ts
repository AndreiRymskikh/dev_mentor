export function sessionCookieName(): string { return process.env.NODE_ENV === "production" ? "__Host-devmentor-session" : "devmentor-session"; }
export function readSessionCookie(request: Pick<Request, "headers">): string | null {
  const matches = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${sessionCookieName()}=`));
  return matches.length === 1 ? matches[0].slice(sessionCookieName().length + 1) : null;
}
export function sessionCookie(token: string | null): string {
  return `${sessionCookieName()}=${token ?? ""}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${token === null ? 0 : 86400}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
