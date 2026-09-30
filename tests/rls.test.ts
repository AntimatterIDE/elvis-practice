import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const ownerId = "00000000-0000-4000-8000-000000000001";
const editorId = "00000000-0000-4000-8000-000000000002";
const adminId = "00000000-0000-4000-8000-000000000003";

async function database() {
  const db = new PGlite();
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key,
      email text unique
    );
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
  await db.exec(readFileSync("supabase/migrations/20260930180000_init.sql", "utf8"));
  await db.exec(`
    insert into public.invitations (email, display_name, role) values
      ('owner@example.com', 'Owner', 'owner'),
      ('editor@example.com', 'Editor', 'editor'),
      ('admin@example.com', 'Admin', 'admin');
    insert into auth.users (id, email) values
      ('${ownerId}', 'owner@example.com'),
      ('${editorId}', 'editor@example.com'),
      ('${adminId}', 'admin@example.com');
    insert into public.conditions (
      slug, title, summary, seo_title, seo_description, offering_status, review_status, published_at
    ) values
      ('neck-pain', 'Neck pain', 'Draft summary', 'Neck pain', 'Draft', 'unconfirmed', 'draft', null),
      (
        'sciatica', 'Sciatica', 'Public summary', 'Sciatica', 'Public',
        'offered', 'approved', now()
      );
  `);
  return db;
}

async function asRole(db: PGlite, role: "anon" | "authenticated", userId?: string) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ""}', false)`);
  await db.exec(`set role ${role}`);
}

describe("row level security", () => {
  it("lets anonymous visitors read only published, offered, approved rows", async () => {
    const db = await database();
    await asRole(db, "anon");
    const visible = await db.query<{ slug: string }>("select slug from public.conditions order by slug");
    expect(visible.rows.map((row) => row.slug)).toEqual(["sciatica"]);
  });

  it("rejects anonymous writes", async () => {
    const db = await database();
    await asRole(db, "anon");
    await expect(
      db.exec(
        "insert into public.conditions (slug, title, summary, seo_title, seo_description) values ('hack', 'Hack', 'Hack', 'Hack', 'Hack')",
      ),
    ).rejects.toThrow();
  });

  it("stops an editor from publishing", async () => {
    const db = await database();
    await asRole(db, "authenticated", editorId);
    await expect(
      db.exec(
        "update public.conditions set offering_status = 'offered', review_status = 'approved', published_at = now() where slug = 'neck-pain'",
      ),
    ).rejects.toThrow();
  });

  it("lets an editor revise an unpublished draft", async () => {
    const db = await database();
    await asRole(db, "authenticated", editorId);
    await db.exec("update public.conditions set title = 'Neck pain revised' where slug = 'neck-pain'");
    await db.exec("reset role");
    const title = await db.query<{ title: string }>("select title from public.conditions where slug = 'neck-pain'");
    expect(title.rows[0]?.title).toBe("Neck pain revised");
  });

  it("lets an admin publish and blocks editors from settings", async () => {
    const db = await database();
    await asRole(db, "authenticated", adminId);
    await db.exec(
      "update public.conditions set offering_status = 'offered', review_status = 'approved', published_at = now() where slug = 'neck-pain'",
    );
    const denied = await db.exec("update public.site_settings set phone = '555' where id = 1");
    expect(denied[0]?.affectedRows ?? 0).toBe(0);
    await db.exec("reset role");
    const settings = await db.query<{ phone: string | null }>("select phone from public.site_settings where id = 1");
    const published = await db.query<{ slug: string }>(
      "select slug from public.conditions where slug = 'neck-pain' and published_at is not null",
    );
    expect(settings.rows[0]?.phone).toBeNull();
    expect(published.rows).toHaveLength(1);
  });
});
