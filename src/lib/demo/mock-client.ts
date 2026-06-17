/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory mock of the Supabase client used in local review mode. Implements
 * the subset of the PostgREST query builder, auth, storage, and rpc surface that
 * the app actually uses, operating on the demo store. No network calls are made.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getDemoStore, type DemoStore } from "./data";
import { DEMO_USER } from "./config";

type Row = Record<string, any>;

const uuid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`);
const nowIso = () => new Date().toISOString();

// Foreign-key hints for resolving embedded selects (all to-one in this app).
const FK_HINTS: Record<string, string[]> = {
  organizations: ["org_id"],
  workspaces: ["workspace_id"],
  projects: ["project_id"],
  profiles: ["user_id", "author_id", "uploaded_by", "assigned_to", "created_by", "actor_id", "invited_by", "owner_id", "id"],
};

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function cmpVals(a: any, b: any): number {
  const da = typeof a === "string" && !Number.isNaN(Date.parse(a)) ? Date.parse(a) : a;
  const db = typeof b === "string" && !Number.isNaN(Date.parse(b)) ? Date.parse(b) : b;
  if (da == null && db == null) return 0;
  if (da == null) return -1;
  if (db == null) return 1;
  return da < db ? -1 : da > db ? 1 : 0;
}

class MockBuilder implements PromiseLike<any> {
  private filters: ((r: Row) => boolean)[] = [];
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any = null;
  private conflictKeys: string[] = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private singleMode: "one" | "maybe" | null = null;
  private head = false;
  private wantCount = false;
  private embeds: { alias: string; table: string }[] = [];

  constructor(private store: DemoStore, private table: string) {}

  private rows(): Row[] {
    return (this.store[this.table] ??= []);
  }

  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.head) this.head = true;
    if (opts?.count) this.wantCount = true;
    if (cols && cols !== "*") {
      for (const part of splitTopLevel(cols)) {
        const m = part.match(/^\s*(?:(\w+)\s*:)?\s*(\w+)\s*\(/);
        if (part.includes("(") && m) this.embeds.push({ alias: m[1] || m[2], table: m[2] });
      }
    }
    return this;
  }

  insert(payload: any) { this.mode = "insert"; this.payload = payload; return this; }
  update(payload: any) { this.mode = "update"; this.payload = payload; return this; }
  delete() { this.mode = "delete"; return this; }
  upsert(payload: any, opts?: { onConflict?: string }) {
    this.mode = "upsert"; this.payload = payload;
    this.conflictKeys = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : [];
    return this;
  }

  eq(col: string, val: any) { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: any) { this.filters.push((r) => r[col] !== val); return this; }
  is(col: string, val: any) { this.filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return this; }
  in(col: string, arr: any[]) { this.filters.push((r) => arr.includes(r[col])); return this; }
  ilike(col: string, pattern: string) {
    const needle = pattern.replace(/%/g, "").toLowerCase();
    this.filters.push((r) => String(r[col] ?? "").toLowerCase().includes(needle));
    return this;
  }
  gte(col: string, val: any) { this.filters.push((r) => cmpVals(r[col], val) >= 0); return this; }
  lte(col: string, val: any) { this.filters.push((r) => cmpVals(r[col], val) <= 0); return this; }
  gt(col: string, val: any) { this.filters.push((r) => cmpVals(r[col], val) > 0); return this; }
  lt(col: string, val: any) { this.filters.push((r) => cmpVals(r[col], val) < 0); return this; }

  order(col: string, opts?: { ascending?: boolean }) { this.orderBy = { col, asc: opts?.ascending !== false }; return this; }
  limit(n: number) { this.limitN = n; return this; }
  maybeSingle() { this.singleMode = "maybe"; return this; }
  single() { this.singleMode = "one"; return this; }

  private resolveEmbed(row: Row, table: string): Row | null {
    const hints = FK_HINTS[table] ?? [`${table}_id`];
    for (const col of hints) {
      if (col in row && row[col] != null) {
        return (this.store[table] ?? []).find((r) => r.id === row[col]) ?? null;
      }
    }
    return null;
  }
  private withEmbeds(row: Row): Row {
    if (this.embeds.length === 0) return { ...row };
    const out: Row = { ...row };
    for (const e of this.embeds) out[e.alias] = this.resolveEmbed(row, e.table);
    return out;
  }

  private match(): Row[] {
    return this.rows().filter((r) => this.filters.every((f) => f(r)));
  }

  private exec(): { data: any; error: any; count?: number } {
    if (this.mode === "insert" || this.mode === "upsert") {
      const arr = Array.isArray(this.payload) ? this.payload : [this.payload];
      const result: Row[] = [];
      for (const obj of arr) {
        if (this.mode === "upsert" && this.conflictKeys.length) {
          const existing = this.rows().find((r) => this.conflictKeys.every((k) => r[k] === obj[k]));
          if (existing) { Object.assign(existing, obj, { updated_at: nowIso() }); result.push(existing); continue; }
        }
        const row: Row = { id: obj.id ?? uuid(), created_at: nowIso(), updated_at: nowIso(), ...obj };
        this.rows().push(row);
        result.push(row);
      }
      const data = result.map((r) => this.withEmbeds(r));
      if (this.singleMode) return { data: data[0] ?? null, error: null };
      return { data, error: null };
    }

    if (this.mode === "update") {
      const matched = this.match();
      for (const r of matched) Object.assign(r, this.payload, { updated_at: nowIso() });
      const data = matched.map((r) => this.withEmbeds(r));
      if (this.singleMode) return { data: data[0] ?? null, error: null };
      return { data, error: null };
    }

    if (this.mode === "delete") {
      const keep = this.rows().filter((r) => !this.filters.every((f) => f(r)));
      this.store[this.table] = keep;
      return { data: null, error: null };
    }

    // select
    let rows = this.match();
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      rows = [...rows].sort((a, b) => (asc ? cmpVals(a[col], b[col]) : cmpVals(b[col], a[col])));
    }
    const count = rows.length;
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    if (this.head) return { data: null, error: null, count };
    const data = rows.map((r) => this.withEmbeds(r));
    if (this.singleMode === "maybe") return { data: data[0] ?? null, error: null, count };
    if (this.singleMode === "one") return { data: data[0] ?? null, error: data[0] ? null : { message: "No rows" }, count };
    return { data, error: null, count };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    try {
      return Promise.resolve(this.exec()).then(onfulfilled, onrejected);
    } catch (e) {
      return Promise.reject(e).then(onfulfilled, onrejected);
    }
  }
}

function rpcResult(value: any) {
  const make = (v: any) => ({
    then: (res: (x: any) => any) => Promise.resolve({ data: v, error: null }).then(res),
    single: () => make(Array.isArray(value) ? value[0] ?? null : value),
    maybeSingle: () => make(Array.isArray(value) ? value[0] ?? null : value),
  });
  return make(value);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Math.random().toString(16).slice(2, 7);
}

function execRpc(store: DemoStore, name: string, args: any): any {
  switch (name) {
    case "create_organization": {
      const id = uuid();
      const slug = slugify(args.p_name ?? "org");
      const wsId = uuid();
      store.organizations.push({ id, name: args.p_name, slug, plan: "free", locale: "en", timezone: args.p_timezone ?? "UTC", settings: {}, status: "active", created_by: DEMO_USER.id, created_at: nowIso(), updated_at: nowIso() });
      store.org_members.push({ id: uuid(), org_id: id, user_id: DEMO_USER.id, role: "owner", created_at: nowIso() });
      store.workspaces.push({ id: wsId, org_id: id, name: "General", icon: null, description: null, settings: {}, archived_at: null, created_by: DEMO_USER.id, created_at: nowIso(), updated_at: nowIso() });
      store.workspace_members.push({ id: uuid(), workspace_id: wsId, org_id: id, user_id: DEMO_USER.id, role: "admin", created_at: nowIso() });
      return [{ org_id: id, org_slug: slug, workspace_id: wsId }];
    }
    case "create_workspace": {
      const wsId = uuid();
      store.workspaces.push({ id: wsId, org_id: args.p_org_id, name: args.p_name, icon: args.p_icon ?? null, description: args.p_description ?? null, settings: {}, archived_at: null, created_by: DEMO_USER.id, created_at: nowIso(), updated_at: nowIso() });
      store.workspace_members.push({ id: uuid(), workspace_id: wsId, org_id: args.p_org_id, user_id: DEMO_USER.id, role: "admin", created_at: nowIso() });
      const defaults = [
        ["Created", "open", 0, "#94a3b8", true], ["Accepted", "open", 1, "#38bdf8", false],
        ["In Progress", "in_progress", 2, "#6366f1", false], ["Completed", "done", 4, "#22c55e", false],
        ["Closed", "done", 6, "#0f766e", false],
      ] as const;
      for (const [n, cat, pos, color, def] of defaults) {
        store.task_statuses.push({ id: uuid(), org_id: args.p_org_id, workspace_id: wsId, name: n, category: cat, position: pos, color, is_default: def, is_terminal: false, created_at: nowIso() });
      }
      return wsId; // scalar return
    }
    case "accept_invitation": {
      const org = store.organizations[0];
      return [{ org_id: org.id, org_slug: org.slug }];
    }
    default:
      return [true];
  }
}

export function createMockClient(): SupabaseClient<Database> {
  const store = getDemoStore();
  const user = { id: DEMO_USER.id, email: DEMO_USER.email, user_metadata: { full_name: DEMO_USER.fullName } };

  const client = {
    from: (table: string) => new MockBuilder(store, table),
    rpc: (name: string, args: any) => rpcResult(execRpc(store, name, args ?? {})),
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      getSession: async () => ({ data: { session: { user } }, error: null }),
      signInWithPassword: async () => ({ data: { user, session: {} }, error: null }),
      signUp: async () => ({ data: { user, session: {} }, error: null }),
      signInWithOAuth: async () => ({ data: { provider: "google", url: null }, error: null }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      updateUser: async () => ({ data: { user }, error: null }),
      exchangeCodeForSession: async () => ({ data: { session: {} }, error: null }),
      verifyOtp: async () => ({ data: { session: {} }, error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null }),
        listFactors: async () => ({ data: { totp: [] }, error: null }),
        enroll: async () => ({ data: { id: "demo-factor", totp: { qr_code: "", secret: "DEMOSECRET" } }, error: null }),
        challenge: async () => ({ data: { id: "demo-challenge" }, error: null }),
        verify: async () => ({ data: { access_token: "demo" }, error: null }),
      },
    },
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "#demo-attachment" }, error: null }),
        createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: "#", token: "demo-token", path }, error: null }),
        uploadToSignedUrl: async () => ({ data: { path: "" }, error: null }),
        remove: async () => ({ data: [], error: null }),
      }),
    },
  };

  return client as unknown as SupabaseClient<Database>;
}
