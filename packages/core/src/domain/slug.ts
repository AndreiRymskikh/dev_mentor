export const RESERVED_SLUGS = new Set(["me", "admin", "api", "account", "mentor", "mentors", "login", "register", "invitation", "m", "support", "settings"]);
export function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ł/g,"l").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "mentor";
}
/** The caller arbitrates collisions with the named database uniqueness constraint. */
export function uniqueSlug(name: string, attempt: number) {
  const base=slugify(name); const suffix=attempt || RESERVED_SLUGS.has(base) ? `-${attempt+1}` : "";
  return base.slice(0,60-suffix.length).replace(/-+$/g,"")+suffix;
}
