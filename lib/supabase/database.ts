export type StaffRole = "owner" | "admin" | "editor";
export type ReviewStatus = "draft" | "in_review" | "approved";
export type OfferingStatus = "unconfirmed" | "offered" | "not_offered";
export type RightsStatus = "pending" | "approved" | "rejected";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; display_name: string; role: StaffRole; created_at: string },
        { id: string; display_name: string; role: StaffRole; created_at?: string },
        { display_name?: string; role?: StaffRole }
      >;
      invitations: Table<
        {
          id: string;
          email: string;
          display_name: string | null;
          role: StaffRole;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          email: string;
          display_name?: string | null;
          role: StaffRole;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
        },
        { accepted_at?: string | null; role?: StaffRole }
      >;
      site_settings: Table<
        {
          id: number;
          practice_name: string;
          physician_name: string;
          phone: string | null;
          address: string | null;
          hours: string | null;
          booking_url: string | null;
          emergency_note: string;
          announcement: string | null;
          updated_at: string;
        },
        {
          id?: number;
          practice_name?: string;
          physician_name?: string;
          phone?: string | null;
          address?: string | null;
          hours?: string | null;
          booking_url?: string | null;
          emergency_note: string;
          announcement?: string | null;
        },
        {
          practice_name?: string;
          physician_name?: string;
          phone?: string | null;
          address?: string | null;
          hours?: string | null;
          booking_url?: string | null;
          emergency_note?: string;
          announcement?: string | null;
          updated_at?: string;
        }
      >;
      pages: Table<PageRow, PageInsert, PageUpdate>;
      conditions: Table<ClinicalRow, ClinicalInsert, ClinicalUpdate>;
      treatments: Table<ClinicalRow, ClinicalInsert, ClinicalUpdate>;
      faqs: Table<
        {
          id: string;
          question: string;
          answer: string;
          sort_order: number;
          review_status: ReviewStatus;
          published_at: string | null;
          updated_at: string;
        },
        {
          id?: string;
          question: string;
          answer: string;
          sort_order?: number;
          review_status?: ReviewStatus;
          published_at?: string | null;
          updated_at?: string;
        },
        {
          question?: string;
          answer?: string;
          sort_order?: number;
          review_status?: ReviewStatus;
          published_at?: string | null;
          updated_at?: string;
        }
      >;
      media_assets: Table<
        {
          id: string;
          storage_path: string;
          alt: string;
          credit: string | null;
          rights_status: RightsStatus;
          updated_at: string;
        },
        {
          id?: string;
          storage_path: string;
          alt: string;
          credit?: string | null;
          rights_status?: RightsStatus;
        },
        {
          alt?: string;
          credit?: string | null;
          rights_status?: RightsStatus;
          updated_at?: string;
        }
      >;
      audit_log: Table<
        {
          id: string;
          actor_id: string;
          action: string;
          entity_table: string;
          entity_id: string;
          summary: string;
          created_at: string;
        },
        {
          id?: string;
          actor_id: string;
          action: string;
          entity_table: string;
          entity_id: string;
          summary: string;
        },
        Record<string, never>
      >;
      intake_forms: Table<
        { id: string; title: string; introduction: string; fields: Json; updated_at: string },
        { id?: string; title: string; introduction: string; fields: Json; updated_at?: string },
        { title?: string; introduction?: string; fields?: Json; updated_at?: string }
      >;
      intake_invites: Table<
        {
          id: string;
          token: string;
          recipient_email: string;
          recipient_name: string;
          expires_at: string;
          submitted_at: string | null;
          patient_id: string | null;
          created_at: string;
        },
        {
          id: string;
          token: string;
          recipient_email?: string;
          recipient_name?: string;
          expires_at: string;
          submitted_at?: string | null;
          patient_id?: string | null;
          created_at?: string;
        },
        {
          recipient_email?: string;
          recipient_name?: string;
          expires_at?: string;
          submitted_at?: string | null;
          patient_id?: string | null;
        }
      >;
      intake_submissions: Table<
        {
          id: string;
          invite_id: string;
          patient_id: string;
          answers: Json;
          fields: Json;
          created_at: string;
        },
        {
          id: string;
          invite_id: string;
          patient_id: string;
          answers: Json;
          fields: Json;
          created_at?: string;
        },
        { answers?: Json; fields?: Json }
      >;
      portal_patients: Table<
        {
          id: string;
          mrn: string;
          chart: Json;
          answers: Json;
          fields: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          mrn: string;
          chart: Json;
          answers?: Json;
          fields?: Json;
          created_at?: string;
          updated_at?: string;
        },
        { mrn?: string; chart?: Json; answers?: Json; fields?: Json; updated_at?: string }
      >;
      portal_accounts: Table<
        { patient_id: string; email: string; password_hash: string; created_at: string },
        { patient_id: string; email: string; password_hash: string; created_at?: string },
        { email?: string; password_hash?: string }
      >;
      portal_visits: Table<
        { id: string; patient_id: string; appointment: Json; start_at: string },
        { id: string; patient_id: string; appointment: Json; start_at: string },
        { appointment?: Json; start_at?: string; patient_id?: string }
      >;
      portal_sessions: Table<
        { token_hash: string; patient_id: string; expires_at: string },
        { token_hash: string; patient_id: string; expires_at: string },
        { expires_at?: string }
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PageRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  seo_title: string;
  seo_description: string;
  review_status: ReviewStatus;
  published_at: string | null;
  updated_at: string;
};

type PageInsert = {
  id?: string;
  slug: string;
  title: string;
  summary?: string;
  body?: string;
  seo_title: string;
  seo_description: string;
  review_status?: ReviewStatus;
  published_at?: string | null;
};

type PageUpdate = Partial<Omit<PageRow, "id" | "slug">> & { slug?: string; updated_at?: string };

type ClinicalRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sections: Json;
  faqs: Json;
  related_slugs: string[];
  offering_status: OfferingStatus;
  review_status: ReviewStatus;
  seo_title: string;
  seo_description: string;
  published_at: string | null;
  updated_at: string;
};

type ClinicalInsert = {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  sections?: Json;
  faqs?: Json;
  related_slugs?: string[];
  offering_status?: OfferingStatus;
  review_status?: ReviewStatus;
  seo_title: string;
  seo_description: string;
  published_at?: string | null;
  updated_at?: string;
};

type ClinicalUpdate = Partial<Omit<ClinicalRow, "id">> & { updated_at?: string };
