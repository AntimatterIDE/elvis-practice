import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.url().optional());

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1).optional(),
  STEDI_API_KEY: z.string().trim().min(1).optional(),
  CANONICAL_HOST: z.string().trim().min(1).default("thealignmentclinic.com"),
  CANONICAL_ORIGIN: z.url().default("https://thealignmentclinic.com"),
  REDIRECT_HOSTS: z
    .string()
    .default("elvisfrancoismd.com,www.elvisfrancoismd.com,www.thealignmentclinic.com"),
  CONTACT_INBOX: z.string().trim().optional(),
  INDEXING_ENABLED: z.enum(["true", "false"]).default("false"),
  CONTENT_SOURCE: z.enum(["file", "supabase"]).default("file"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY || undefined,
    STEDI_API_KEY: source.STEDI_API_KEY || undefined,
    CANONICAL_HOST: source.CANONICAL_HOST || undefined,
    CANONICAL_ORIGIN: source.CANONICAL_ORIGIN || undefined,
    REDIRECT_HOSTS: source.REDIRECT_HOSTS || undefined,
    CONTACT_INBOX: source.CONTACT_INBOX || undefined,
    INDEXING_ENABLED: source.INDEXING_ENABLED || undefined,
    CONTENT_SOURCE: source.CONTENT_SOURCE || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Invalid environment: ${message}`);
  }

  return parsed.data;
}

export function isSupabaseConfigured(env: ServerEnv = readServerEnv()) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isServiceRoleConfigured(env: ServerEnv = readServerEnv()) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
