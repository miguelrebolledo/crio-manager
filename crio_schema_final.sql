


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."adverse_event_status_enum" AS ENUM (
    'REPORTED',
    'FOLLOW_UP',
    'CLOSED'
);


ALTER TYPE "public"."adverse_event_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."adverse_event_type_enum" AS ENUM (
    'AE',
    'SAE'
);


ALTER TYPE "public"."adverse_event_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."ae_grade_enum" AS ENUM (
    'GRADE_1',
    'GRADE_2',
    'GRADE_3',
    'GRADE_4',
    'GRADE_5'
);


ALTER TYPE "public"."ae_grade_enum" OWNER TO "postgres";


CREATE TYPE "public"."ae_relation_enum" AS ENUM (
    'DEFINITELY_RELATED',
    'PROBABLY_RELATED',
    'POSSIBLY_RELATED',
    'NOT_RELATED',
    'NOT_EVALUABLE'
);


ALTER TYPE "public"."ae_relation_enum" OWNER TO "postgres";


CREATE TYPE "public"."disease_enum" AS ENUM (
    'CANCER',
    'PERINATAL',
    'AUTOIMMUNE',
    'MENTAL_HEALTH',
    'PULMONARY',
    'OTHER'
);


ALTER TYPE "public"."disease_enum" OWNER TO "postgres";


CREATE TYPE "public"."document_type_enum" AS ENUM (
    'PROTOCOL',
    'INVESTIGATORS_BROCHURE',
    'ETHICS_APPROVAL',
    'INFORMED_CONSENT',
    'CRF',
    'SAFETY_REPORT',
    'MONITORING_REPORT',
    'CONTRACT',
    'OTHER'
);


ALTER TYPE "public"."document_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."finding_category_enum" AS ENUM (
    'CRITICAL',
    'MAJOR',
    'MINOR'
);


ALTER TYPE "public"."finding_category_enum" OWNER TO "postgres";


CREATE TYPE "public"."finding_status_enum" AS ENUM (
    'OPEN',
    'RESPONDED',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."finding_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."milestone_status_enum" AS ENUM (
    'PENDING',
    'COMPLETED',
    'OVERDUE'
);


ALTER TYPE "public"."milestone_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."monitoring_visit_status_enum" AS ENUM (
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE "public"."monitoring_visit_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."monitoring_visit_type_enum" AS ENUM (
    'INITIATION',
    'FOLLOW_UP',
    'CLOSE_OUT'
);


ALTER TYPE "public"."monitoring_visit_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."org_type_enum" AS ENUM (
    'PHARMA',
    'BIOTECH',
    'ACADEMIC',
    'HOSPITAL',
    'FOUNDATION',
    'GOVERNMENT',
    'OTHER'
);


ALTER TYPE "public"."org_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."priority_enum" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE "public"."priority_enum" OWNER TO "postgres";


CREATE TYPE "public"."project_status_enum" AS ENUM (
    'LEAD',
    'PROPOSAL',
    'CONTRACTED',
    'ACTIVE',
    'PAUSED',
    'CLOSED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE "public"."project_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."project_type_enum" AS ENUM (
    'INTERVENTIONAL_TRIAL',
    'OBSERVATIONAL_TRIAL',
    'SAMPLE_COLLECTION',
    'SERVICE_OTHER'
);


ALTER TYPE "public"."project_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."sample_status_enum" AS ENUM (
    'PENDING',
    'COLLECTED',
    'PROCESSING',
    'STORED',
    'SHIPPED',
    'OMISSION',
    'SHIPPED_UNPROCESSED'
);


ALTER TYPE "public"."sample_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."sample_type_enum" AS ENUM (
    'BLOOD',
    'URINE',
    'TISSUE',
    'BONE_MARROW',
    'CSF',
    'OTHER',
    'PLACENTA',
    'CORD_BLOOD',
    'UMBILICAL_CORD',
    'SALIVA'
);


ALTER TYPE "public"."sample_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."sponsor_type_enum" AS ENUM (
    'INTERNAL',
    'EXTERNAL'
);


ALTER TYPE "public"."sponsor_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."study_type_enum" AS ENUM (
    'INTERVENTIONAL',
    'OBSERVATIONAL',
    'CLINICAL_SERIES',
    'SERVICE'
);


ALTER TYPE "public"."study_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."team_role_enum" AS ENUM (
    'PRINCIPAL_INVESTIGATOR',
    'CO_INVESTIGATOR',
    'COORDINATOR_PRINCIPAL',
    'COORDINATOR_BACKUP',
    'EXTERNAL_MONITOR',
    'LAB_TECHNICIAN',
    'FINANCE',
    'OTHER'
);


ALTER TYPE "public"."team_role_enum" OWNER TO "postgres";


CREATE TYPE "public"."trial_phase_enum" AS ENUM (
    'PHASE_0',
    'PHASE_I',
    'PHASE_II',
    'PHASE_IIA',
    'PHASE_IIB',
    'PHASE_III',
    'PHASE_IV',
    'NOT_APPLICABLE'
);


ALTER TYPE "public"."trial_phase_enum" OWNER TO "postgres";


CREATE TYPE "public"."user_role_enum" AS ENUM (
    'ADMIN',
    'PM_CRIO',
    'INVESTIGATOR',
    'COORDINATOR',
    'SPONSOR',
    'EXTERNAL_MONITOR',
    'FINANCE',
    'LAB',
    'QA'
);


ALTER TYPE "public"."user_role_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "public"."user_role_enum"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select role from public.users where id = auth.uid()
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'COORDINATOR'::user_role_enum
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla, no bloquear la creación del usuario auth
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_project_member"("p_project_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from project_team_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and is_active = true
  )
$$;


ALTER FUNCTION "public"."is_project_member"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_project_sponsor"("p_project_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM projects p
    JOIN users u ON u.id = auth.uid()
    WHERE p.id = p_project_id
      AND u.role = 'SPONSOR'
      AND p.client_org_id = u.org_id
  )
$$;


ALTER FUNCTION "public"."is_project_sponsor"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_recruitment_to_project"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  prev_enrolled int;
begin
  -- calcular new_this_period vs registro anterior
  select coalesce(enrolled_total, 0) into prev_enrolled
  from recruitment_updates
  where project_id = new.project_id
    and (period_year, period_month) < (new.period_year, new.period_month)
  order by period_year desc, period_month desc
  limit 1;
 
  new.new_this_period = new.enrolled_total - coalesce(prev_enrolled, 0);
 
  -- actualizar totales en projects
  update projects set
    recruited_current        = new.enrolled_total,
    dropouts_current         = new.dropouts_total,
    excluded_current         = new.excluded_total,
    recruitment_last_updated = now(),
    updated_at               = now()
  where id = new.project_id;
 
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_recruitment_to_project"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_overdue_milestones"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update milestones
  set status = 'OVERDUE', updated_at = now()
  where status = 'PENDING'
    and due_date < current_date;
end;
$$;


ALTER FUNCTION "public"."update_overdue_milestones"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_overdue_milestones"() IS 'Ejecutar con pg_cron diariamente: select cron.schedule(''check-milestones'', ''0 8 * * *'', ''select update_overdue_milestones()'');';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."adverse_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "reported_by" "uuid" NOT NULL,
    "event_type" "public"."adverse_event_type_enum" NOT NULL,
    "grade" "public"."ae_grade_enum" NOT NULL,
    "patient_id" "text" NOT NULL,
    "detection_date" "date" NOT NULL,
    "description" "text" NOT NULL,
    "relation_to_treatment" "public"."ae_relation_enum" DEFAULT 'NOT_EVALUABLE'::"public"."ae_relation_enum" NOT NULL,
    "actions_taken" "text",
    "status" "public"."adverse_event_status_enum" DEFAULT 'REPORTED'::"public"."adverse_event_status_enum" NOT NULL,
    "pi_notified_at" timestamp with time zone,
    "sponsor_notified_at" timestamp with time zone,
    "ethics_notified_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."adverse_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."adverse_events"."patient_id" IS 'Identificador interno del estudio — NUNCA datos nominativos';



COMMENT ON COLUMN "public"."adverse_events"."sponsor_notified_at" IS 'SAE: notificación obligatoria al sponsor dentro de 24h (ICH E6 R2)';



COMMENT ON COLUMN "public"."adverse_events"."ethics_notified_at" IS 'SAE: notificación obligatoria al Comité de Ética';



CREATE TABLE IF NOT EXISTS "public"."crm_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "interaction_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "notes" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_interactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."crm_interactions" IS 'Historial de interacciones CRM por organización';



CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "doc_type" "public"."document_type_enum" DEFAULT 'OTHER'::"public"."document_type_enum" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_size_bytes" integer,
    "mime_type" "text",
    "visible_to_sponsor" boolean DEFAULT false NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."documents"."storage_path" IS 'Ruta en Supabase Storage bucket: documents/{project_id}/{filename}';



COMMENT ON COLUMN "public"."documents"."visible_to_sponsor" IS 'Si true, el sponsor puede ver y descargar este documento en su portal';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo_proyecto" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "study_type" "public"."study_type_enum" NOT NULL,
    "project_type" "public"."project_type_enum" NOT NULL,
    "trial_phase" "public"."trial_phase_enum" DEFAULT 'NOT_APPLICABLE'::"public"."trial_phase_enum",
    "disease" "public"."disease_enum" DEFAULT 'OTHER'::"public"."disease_enum",
    "therapeutic_area" "text",
    "status" "public"."project_status_enum" DEFAULT 'LEAD'::"public"."project_status_enum" NOT NULL,
    "priority" "public"."priority_enum" DEFAULT 'MEDIUM'::"public"."priority_enum" NOT NULL,
    "sponsor_type" "public"."sponsor_type_enum" DEFAULT 'EXTERNAL'::"public"."sponsor_type_enum" NOT NULL,
    "client_org_id" "uuid",
    "principal_investigator_id" "uuid",
    "co_investigator_id" "uuid",
    "start_date" "date" NOT NULL,
    "estimated_end_date" "date",
    "first_patient_recruited_date" "date",
    "recruitment_target" integer,
    "recruited_current" integer DEFAULT 0 NOT NULL,
    "dropouts_current" integer DEFAULT 0 NOT NULL,
    "excluded_current" integer DEFAULT 0 NOT NULL,
    "recruitment_last_updated" timestamp with time zone,
    "ethics_approval_date" "date",
    "ethics_renewal_date" "date",
    "ethics_committee" "text",
    "ethics_code" "text",
    "budget_total" numeric(14,2),
    "budget_executed" numeric(14,2) DEFAULT 0,
    "primary_endpoint" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_codigo_format" CHECK (("codigo_proyecto" ~ '^[0-9]{4}CR[0-9]+$'::"text")),
    CONSTRAINT "projects_dropouts_current_check" CHECK (("dropouts_current" >= 0)),
    CONSTRAINT "projects_excluded_current_check" CHECK (("excluded_current" >= 0)),
    CONSTRAINT "projects_recruited_current_check" CHECK (("recruited_current" >= 0)),
    CONSTRAINT "projects_recruitment_target_check" CHECK (("recruitment_target" >= 0))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Tabla principal de proyectos/estudios clínicos del CRO';



COMMENT ON COLUMN "public"."projects"."codigo_proyecto" IS 'Formato YYYYCR<n> — ej: 2025CR007';



COMMENT ON COLUMN "public"."projects"."ethics_renewal_date" IS 'Alerta automática si vence en ≤ 60 días';



CREATE OR REPLACE VIEW "public"."ethics_alerts" AS
 SELECT "id",
    "codigo_proyecto",
    "titulo",
    "ethics_renewal_date",
    "ethics_committee",
    "ethics_code",
    ("ethics_renewal_date" - CURRENT_DATE) AS "days_until_renewal",
        CASE
            WHEN ("ethics_renewal_date" < CURRENT_DATE) THEN 'EXPIRED'::"text"
            WHEN ("ethics_renewal_date" <= (CURRENT_DATE + 30)) THEN 'URGENT'::"text"
            WHEN ("ethics_renewal_date" <= (CURRENT_DATE + 60)) THEN 'WARNING'::"text"
            ELSE 'OK'::"text"
        END AS "renewal_alert_level"
   FROM "public"."projects"
  WHERE (("ethics_renewal_date" IS NOT NULL) AND ("status" <> ALL (ARRAY['CLOSED'::"public"."project_status_enum", 'COMPLETED'::"public"."project_status_enum", 'CANCELLED'::"public"."project_status_enum"])))
  ORDER BY "ethics_renewal_date";


ALTER VIEW "public"."ethics_alerts" OWNER TO "postgres";


COMMENT ON VIEW "public"."ethics_alerts" IS 'Vista de alertas de renovación ética. Usar en dashboard y panel de alertas.';



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "quotation_id" "uuid",
    "number" "text" NOT NULL,
    "description" "text",
    "amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "issue_date" "date" NOT NULL,
    "due_date" "date",
    "paid_date" "date",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'SENT'::"text", 'PAID'::"text", 'OVERDUE'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "due_date" "date" NOT NULL,
    "completed_date" "date",
    "status" "public"."milestone_status_enum" DEFAULT 'PENDING'::"public"."milestone_status_enum" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monitoring_findings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visit_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "category" "public"."finding_category_enum" NOT NULL,
    "status" "public"."finding_status_enum" DEFAULT 'OPEN'::"public"."finding_status_enum" NOT NULL,
    "response_text" "text",
    "response_by" "uuid",
    "response_date" timestamp with time zone,
    "decision_approved" boolean,
    "decision_text" "text",
    "decision_by" "uuid",
    "decision_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."monitoring_findings" OWNER TO "postgres";


COMMENT ON TABLE "public"."monitoring_findings" IS 'Hallazgos detectados en visitas de monitoreo con ciclo respuesta→aprobación';



CREATE TABLE IF NOT EXISTS "public"."monitoring_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "monitor_id" "uuid" NOT NULL,
    "visit_type" "public"."monitoring_visit_type_enum" NOT NULL,
    "status" "public"."monitoring_visit_status_enum" DEFAULT 'SCHEDULED'::"public"."monitoring_visit_status_enum" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "actual_date" "date",
    "training_date" "date",
    "report_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "monitoring_type" "text" DEFAULT 'EXTERNAL'::"text" NOT NULL,
    CONSTRAINT "monitoring_visits_monitoring_type_check" CHECK (("monitoring_type" = ANY (ARRAY['EXTERNAL'::"text", 'INTERNAL_QA'::"text"])))
);


ALTER TABLE "public"."monitoring_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role_enum" DEFAULT 'COORDINATOR'::"public"."user_role_enum" NOT NULL,
    "specialty" "text",
    "institution" "text",
    "phone" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Perfiles de usuario extendidos sobre auth.users de Supabase';



CREATE OR REPLACE VIEW "public"."open_findings_summary" AS
 SELECT "f"."id",
    "f"."description",
    "f"."category",
    "f"."status",
    "f"."created_at",
    "v"."project_id",
    "v"."scheduled_date" AS "visit_date",
    "v"."monitor_id",
    "p"."codigo_proyecto",
    "p"."titulo" AS "project_title",
    "u"."full_name" AS "monitor_name"
   FROM ((("public"."monitoring_findings" "f"
     JOIN "public"."monitoring_visits" "v" ON (("v"."id" = "f"."visit_id")))
     JOIN "public"."projects" "p" ON (("p"."id" = "v"."project_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "v"."monitor_id")))
  WHERE ("f"."status" = ANY (ARRAY['OPEN'::"public"."finding_status_enum", 'RESPONDED'::"public"."finding_status_enum"]))
  ORDER BY
        CASE "f"."category"
            WHEN 'CRITICAL'::"public"."finding_category_enum" THEN 1
            WHEN 'MAJOR'::"public"."finding_category_enum" THEN 2
            ELSE 3
        END, "f"."created_at";


ALTER VIEW "public"."open_findings_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "org_type" "public"."org_type_enum" DEFAULT 'OTHER'::"public"."org_type_enum" NOT NULL,
    "sponsor_type" "public"."sponsor_type_enum" DEFAULT 'EXTERNAL'::"public"."sponsor_type_enum" NOT NULL,
    "country" "text" DEFAULT 'Chile'::"text" NOT NULL,
    "city" "text",
    "website" "text",
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Organizaciones clientes/sponsors';



CREATE TABLE IF NOT EXISTS "public"."project_budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expense_budget" numeric(12,2) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."project_budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "expense_date" "date" NOT NULL,
    "vendor" "text",
    "notes" "text",
    "registered_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_expenses_category_check" CHECK (("category" = ANY (ARRAY['RRHH'::"text", 'REACTIVOS'::"text", 'EXAMENES'::"text", 'EQUIPAMIENTO'::"text", 'OVERHEAD'::"text", 'OTROS'::"text"])))
);


ALTER TABLE "public"."project_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_notes" IS 'Solo visible para ADMIN e INVESTIGATOR — RLS bloquea otros roles';



CREATE TABLE IF NOT EXISTS "public"."project_sample_collection_details" (
    "project_id" "uuid" NOT NULL,
    "sample_type" "text",
    "collection_protocol" "text",
    "n_samples_target" integer,
    "processing_required" boolean DEFAULT false NOT NULL,
    "cold_chain_required" boolean DEFAULT false NOT NULL,
    "storage_conditions" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_sample_collection_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_service_details" (
    "project_id" "uuid" NOT NULL,
    "service_category" "text",
    "deliverables" "text",
    "sla_due_date" "date",
    "estimated_hours" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_service_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_sites" (
    "project_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "activation_date" "date"
);


ALTER TABLE "public"."project_sites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "team_role" "public"."team_role_enum" NOT NULL,
    "assigned_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."project_team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_team_members" IS 'Asignación de usuarios a proyectos con roles específicos';



CREATE TABLE IF NOT EXISTS "public"."project_trial_details" (
    "project_id" "uuid" NOT NULL,
    "sample_size_target" integer,
    "sample_type" "text",
    "recruitment_start" "date",
    "recruitment_end" "date",
    "ethics_submission_date" "date",
    "primary_endpoint" "text",
    "secondary_endpoints" "text",
    "inclusion_criteria" "text",
    "exclusion_criteria" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_trial_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "number" "text" NOT NULL,
    "description" "text",
    "amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "issue_date" "date" NOT NULL,
    "valid_until" "date",
    "status" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quotations_status_check" CHECK (("status" = ANY (ARRAY['DRAFT'::"text", 'SENT'::"text", 'ACCEPTED'::"text", 'REJECTED'::"text", 'EXPIRED'::"text"])))
);


ALTER TABLE "public"."quotations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."recruitment_dashboard" AS
 SELECT "id",
    "codigo_proyecto",
    "titulo",
    "recruitment_target",
    "recruited_current",
    "dropouts_current",
    "excluded_current",
    (("recruited_current" - "dropouts_current") - "excluded_current") AS "active_net",
        CASE
            WHEN ("recruitment_target" > 0) THEN "round"(((("recruited_current")::numeric / ("recruitment_target")::numeric) * (100)::numeric), 1)
            ELSE NULL::numeric
        END AS "pct_recruited",
    "recruitment_last_updated",
    "status",
    "first_patient_recruited_date"
   FROM "public"."projects" "p"
  WHERE ("status" <> ALL (ARRAY['LEAD'::"public"."project_status_enum", 'PROPOSAL'::"public"."project_status_enum", 'CANCELLED'::"public"."project_status_enum", 'CLOSED'::"public"."project_status_enum", 'COMPLETED'::"public"."project_status_enum"]));


ALTER VIEW "public"."recruitment_dashboard" OWNER TO "postgres";


COMMENT ON VIEW "public"."recruitment_dashboard" IS 'Vista de progreso de reclutamiento para el dashboard. Excluye proyectos no activos.';



CREATE TABLE IF NOT EXISTS "public"."recruitment_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "reported_by" "uuid" NOT NULL,
    "period_year" integer NOT NULL,
    "period_month" integer NOT NULL,
    "report_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "enrolled_total" integer NOT NULL,
    "dropouts_total" integer DEFAULT 0 NOT NULL,
    "excluded_total" integer DEFAULT 0 NOT NULL,
    "new_this_period" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recruitment_updates_dropouts_total_check" CHECK (("dropouts_total" >= 0)),
    CONSTRAINT "recruitment_updates_enrolled_total_check" CHECK (("enrolled_total" >= 0)),
    CONSTRAINT "recruitment_updates_excluded_total_check" CHECK (("excluded_total" >= 0)),
    CONSTRAINT "recruitment_updates_period_month_check" CHECK ((("period_month" >= 1) AND ("period_month" <= 12))),
    CONSTRAINT "recruitment_updates_period_year_check" CHECK (("period_year" >= 2020))
);


ALTER TABLE "public"."recruitment_updates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."recruitment_updates"."new_this_period" IS 'Incremento vs período anterior — calculado por trigger';



CREATE TABLE IF NOT EXISTS "public"."sample_collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "patient_id" "text" NOT NULL,
    "sample_type" "public"."sample_type_enum" NOT NULL,
    "visit_timepoint" "text",
    "scheduled_date" "date" NOT NULL,
    "collected_date" "date",
    "volume_quantity" "text",
    "cold_chain_required" boolean DEFAULT false NOT NULL,
    "processing_required" boolean DEFAULT false NOT NULL,
    "status" "public"."sample_status_enum" DEFAULT 'PENDING'::"public"."sample_status_enum" NOT NULL,
    "storage_location" "text",
    "shipping_destination" "text",
    "notes" "text",
    "registered_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "collected_by" "uuid"
);


ALTER TABLE "public"."sample_collections" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sample_collections"."patient_id" IS 'ID interno del estudio — no usar nombre real';



CREATE TABLE IF NOT EXISTS "public"."sample_processing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "patient_id" "text" NOT NULL,
    "sample_type" "public"."sample_type_enum" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "processed_date" "date",
    "volume_quantity" "text",
    "processed_by" "uuid",
    "registered_by" "uuid",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "special_instructions" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sample_processing_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'IN_PROGRESS'::"text", 'STORED'::"text", 'READY_FOR_PICKUP'::"text", 'SHIPPED'::"text"])))
);


ALTER TABLE "public"."sample_processing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "org_id" "uuid",
    "address" "text",
    "city" "text",
    "country" "text" DEFAULT 'Chile'::"text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sites" OWNER TO "postgres";


ALTER TABLE ONLY "public"."adverse_events"
    ADD CONSTRAINT "adverse_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_interactions"
    ADD CONSTRAINT "crm_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monitoring_findings"
    ADD CONSTRAINT "monitoring_findings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monitoring_visits"
    ADD CONSTRAINT "monitoring_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_budgets"
    ADD CONSTRAINT "project_budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_budgets"
    ADD CONSTRAINT "project_budgets_project_id_key" UNIQUE ("project_id");



ALTER TABLE ONLY "public"."project_expenses"
    ADD CONSTRAINT "project_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_notes"
    ADD CONSTRAINT "project_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_sample_collection_details"
    ADD CONSTRAINT "project_sample_collection_details_pkey" PRIMARY KEY ("project_id");



ALTER TABLE ONLY "public"."project_service_details"
    ADD CONSTRAINT "project_service_details_pkey" PRIMARY KEY ("project_id");



ALTER TABLE ONLY "public"."project_sites"
    ADD CONSTRAINT "project_sites_pkey" PRIMARY KEY ("project_id", "site_id");



ALTER TABLE ONLY "public"."project_team_members"
    ADD CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_team_members"
    ADD CONSTRAINT "project_team_members_project_id_user_id_team_role_key" UNIQUE ("project_id", "user_id", "team_role");



ALTER TABLE ONLY "public"."project_trial_details"
    ADD CONSTRAINT "project_trial_details_pkey" PRIMARY KEY ("project_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_codigo_proyecto_key" UNIQUE ("codigo_proyecto");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recruitment_updates"
    ADD CONSTRAINT "recruitment_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recruitment_updates"
    ADD CONSTRAINT "recruitment_updates_project_id_period_year_period_month_key" UNIQUE ("project_id", "period_year", "period_month");



ALTER TABLE ONLY "public"."sample_collections"
    ADD CONSTRAINT "sample_collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sample_processing"
    ADD CONSTRAINT "sample_processing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_ae_project" ON "public"."adverse_events" USING "btree" ("project_id");



CREATE INDEX "idx_ae_status" ON "public"."adverse_events" USING "btree" ("status");



CREATE INDEX "idx_ae_type" ON "public"."adverse_events" USING "btree" ("event_type");



CREATE INDEX "idx_budgets_project" ON "public"."project_budgets" USING "btree" ("project_id");



CREATE INDEX "idx_crm_org" ON "public"."crm_interactions" USING "btree" ("org_id");



CREATE INDEX "idx_docs_project" ON "public"."documents" USING "btree" ("project_id");



CREATE INDEX "idx_docs_visible_sponsor" ON "public"."documents" USING "btree" ("project_id", "visible_to_sponsor");



CREATE INDEX "idx_expenses_category" ON "public"."project_expenses" USING "btree" ("category");



CREATE INDEX "idx_expenses_date" ON "public"."project_expenses" USING "btree" ("expense_date");



CREATE INDEX "idx_expenses_project" ON "public"."project_expenses" USING "btree" ("project_id");



CREATE INDEX "idx_findings_status" ON "public"."monitoring_findings" USING "btree" ("status");



CREATE INDEX "idx_findings_visit" ON "public"."monitoring_findings" USING "btree" ("visit_id");



CREATE INDEX "idx_invoices_due_date" ON "public"."invoices" USING "btree" ("due_date");



CREATE INDEX "idx_invoices_project" ON "public"."invoices" USING "btree" ("project_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_milestones_due_date" ON "public"."milestones" USING "btree" ("due_date");



CREATE INDEX "idx_milestones_project" ON "public"."milestones" USING "btree" ("project_id");



CREATE INDEX "idx_projects_client_org" ON "public"."projects" USING "btree" ("client_org_id");



CREATE INDEX "idx_projects_codigo" ON "public"."projects" USING "btree" ("codigo_proyecto");



CREATE INDEX "idx_projects_ethics_renewal" ON "public"."projects" USING "btree" ("ethics_renewal_date");



CREATE INDEX "idx_projects_pi" ON "public"."projects" USING "btree" ("principal_investigator_id");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_quotations_project" ON "public"."quotations" USING "btree" ("project_id");



CREATE INDEX "idx_recruitment_period" ON "public"."recruitment_updates" USING "btree" ("period_year", "period_month");



CREATE INDEX "idx_recruitment_project" ON "public"."recruitment_updates" USING "btree" ("project_id");



CREATE INDEX "idx_sample_processing_collection" ON "public"."sample_processing" USING "btree" ("collection_id");



CREATE INDEX "idx_sample_processing_project" ON "public"."sample_processing" USING "btree" ("project_id");



CREATE INDEX "idx_sample_processing_status" ON "public"."sample_processing" USING "btree" ("status");



CREATE INDEX "idx_samples_collected_by" ON "public"."sample_collections" USING "btree" ("collected_by");



CREATE INDEX "idx_samples_project" ON "public"."sample_collections" USING "btree" ("project_id");



CREATE INDEX "idx_samples_scheduled_date" ON "public"."sample_collections" USING "btree" ("scheduled_date");



CREATE INDEX "idx_samples_status" ON "public"."sample_collections" USING "btree" ("status");



CREATE INDEX "idx_team_members_project" ON "public"."project_team_members" USING "btree" ("project_id");



CREATE INDEX "idx_team_members_user" ON "public"."project_team_members" USING "btree" ("user_id");



CREATE INDEX "idx_users_org" ON "public"."users" USING "btree" ("org_id");



CREATE INDEX "idx_visits_monitor" ON "public"."monitoring_visits" USING "btree" ("monitor_id");



CREATE INDEX "idx_visits_monitoring_type" ON "public"."monitoring_visits" USING "btree" ("monitoring_type");



CREATE INDEX "idx_visits_project" ON "public"."monitoring_visits" USING "btree" ("project_id");



CREATE INDEX "idx_visits_scheduled" ON "public"."monitoring_visits" USING "btree" ("scheduled_date");



CREATE OR REPLACE TRIGGER "trg_adverse_events_updated_at" BEFORE UPDATE ON "public"."adverse_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_milestones_updated_at" BEFORE UPDATE ON "public"."milestones" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_monitoring_findings_updated_at" BEFORE UPDATE ON "public"."monitoring_findings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_monitoring_visits_updated_at" BEFORE UPDATE ON "public"."monitoring_visits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sample_collections_updated_at" BEFORE UPDATE ON "public"."sample_collections" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_recruitment" BEFORE INSERT OR UPDATE ON "public"."recruitment_updates" FOR EACH ROW EXECUTE FUNCTION "public"."sync_recruitment_to_project"();



ALTER TABLE ONLY "public"."adverse_events"
    ADD CONSTRAINT "adverse_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."adverse_events"
    ADD CONSTRAINT "adverse_events_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_interactions"
    ADD CONSTRAINT "crm_interactions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_interactions"
    ADD CONSTRAINT "crm_interactions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monitoring_findings"
    ADD CONSTRAINT "monitoring_findings_decision_by_fkey" FOREIGN KEY ("decision_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."monitoring_findings"
    ADD CONSTRAINT "monitoring_findings_response_by_fkey" FOREIGN KEY ("response_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."monitoring_findings"
    ADD CONSTRAINT "monitoring_findings_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."monitoring_visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monitoring_visits"
    ADD CONSTRAINT "monitoring_visits_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."monitoring_visits"
    ADD CONSTRAINT "monitoring_visits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_budgets"
    ADD CONSTRAINT "project_budgets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_expenses"
    ADD CONSTRAINT "project_expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_expenses"
    ADD CONSTRAINT "project_expenses_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_notes"
    ADD CONSTRAINT "project_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."project_notes"
    ADD CONSTRAINT "project_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_sample_collection_details"
    ADD CONSTRAINT "project_sample_collection_details_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_service_details"
    ADD CONSTRAINT "project_service_details_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_sites"
    ADD CONSTRAINT "project_sites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_sites"
    ADD CONSTRAINT "project_sites_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_team_members"
    ADD CONSTRAINT "project_team_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_team_members"
    ADD CONSTRAINT "project_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_trial_details"
    ADD CONSTRAINT "project_trial_details_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_co_investigator_id_fkey" FOREIGN KEY ("co_investigator_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_principal_investigator_id_fkey" FOREIGN KEY ("principal_investigator_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recruitment_updates"
    ADD CONSTRAINT "recruitment_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recruitment_updates"
    ADD CONSTRAINT "recruitment_updates_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sample_collections"
    ADD CONSTRAINT "sample_collections_collected_by_fkey" FOREIGN KEY ("collected_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sample_collections"
    ADD CONSTRAINT "sample_collections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sample_collections"
    ADD CONSTRAINT "sample_collections_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sample_collections"
    ADD CONSTRAINT "sample_collections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sample_processing"
    ADD CONSTRAINT "sample_processing_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."sample_collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sample_processing"
    ADD CONSTRAINT "sample_processing_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sample_processing"
    ADD CONSTRAINT "sample_processing_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sample_processing"
    ADD CONSTRAINT "sample_processing_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE "public"."adverse_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ae_read_staff" ON "public"."adverse_events" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum", 'FINANCE'::"public"."user_role_enum"])) OR (("public"."current_user_role"() = ANY (ARRAY['COORDINATOR'::"public"."user_role_enum", 'LAB'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id"))));



CREATE POLICY "ae_update_staff" ON "public"."adverse_events" FOR UPDATE USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id")));



CREATE POLICY "ae_write_coordinator" ON "public"."adverse_events" FOR INSERT WITH CHECK ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id")));



CREATE POLICY "budgets_finance" ON "public"."project_budgets" TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['FINANCE'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"]))) WITH CHECK ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['FINANCE'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



ALTER TABLE "public"."crm_interactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_read_staff" ON "public"."crm_interactions" FOR SELECT USING (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum"])));



CREATE POLICY "crm_write_staff" ON "public"."crm_interactions" FOR INSERT WITH CHECK (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



CREATE POLICY "docs_admin_all" ON "public"."documents" USING (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



CREATE POLICY "docs_sponsor_visible" ON "public"."documents" FOR SELECT USING ((("public"."current_user_role"() = 'SPONSOR'::"public"."user_role_enum") AND ("visible_to_sponsor" = true) AND "public"."is_project_sponsor"("project_id")));



CREATE POLICY "docs_staff_read" ON "public"."documents" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum", 'FINANCE'::"public"."user_role_enum", 'LAB'::"public"."user_role_enum", 'EXTERNAL_MONITOR'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id")));



CREATE POLICY "docs_write_staff" ON "public"."documents" FOR INSERT WITH CHECK ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id")));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_finance" ON "public"."project_expenses" TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['FINANCE'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"]))) WITH CHECK ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['FINANCE'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



CREATE POLICY "findings_admin_all" ON "public"."monitoring_findings" USING (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



CREATE POLICY "findings_decide_monitor" ON "public"."monitoring_findings" FOR UPDATE USING ((("public"."current_user_role"() = 'EXTERNAL_MONITOR'::"public"."user_role_enum") AND ("visit_id" IN ( SELECT "monitoring_visits"."id"
   FROM "public"."monitoring_visits"
  WHERE ("monitoring_visits"."monitor_id" = "auth"."uid"())))));



CREATE POLICY "findings_read_project" ON "public"."monitoring_findings" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])) OR (("public"."current_user_role"() = ANY (ARRAY['COORDINATOR'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum", 'EXTERNAL_MONITOR'::"public"."user_role_enum"])) AND ("visit_id" IN ( SELECT "monitoring_visits"."id"
   FROM "public"."monitoring_visits"
  WHERE ("public"."is_project_member"("monitoring_visits"."project_id") OR ("monitoring_visits"."monitor_id" = "auth"."uid"())))))));



CREATE POLICY "findings_respond_coordinator" ON "public"."monitoring_findings" FOR UPDATE USING ((("public"."current_user_role"() = 'COORDINATOR'::"public"."user_role_enum") AND ("visit_id" IN ( SELECT "monitoring_visits"."id"
   FROM "public"."monitoring_visits"
  WHERE "public"."is_project_member"("monitoring_visits"."project_id")))));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_finance" ON "public"."invoices" TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['FINANCE'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"]))) WITH CHECK ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['FINANCE'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



ALTER TABLE "public"."milestones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "milestones_read" ON "public"."milestones" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'FINANCE'::"public"."user_role_enum"])) OR "public"."is_project_member"("project_id") OR "public"."is_project_sponsor"("project_id")));



CREATE POLICY "milestones_write" ON "public"."milestones" USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])) OR (("public"."current_user_role"() = 'INVESTIGATOR'::"public"."user_role_enum") AND "public"."is_project_member"("project_id"))));



ALTER TABLE "public"."monitoring_findings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monitoring_visits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notes_read" ON "public"."project_notes" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum"])) AND (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])) OR "public"."is_project_member"("project_id"))));



CREATE POLICY "notes_write" ON "public"."project_notes" FOR INSERT WITH CHECK ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id")));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs_read_all_staff" ON "public"."organizations" FOR SELECT USING (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum", 'FINANCE'::"public"."user_role_enum", 'LAB'::"public"."user_role_enum", 'EXTERNAL_MONITOR'::"public"."user_role_enum"])));



CREATE POLICY "orgs_sponsor_own" ON "public"."organizations" FOR SELECT USING ((("public"."current_user_role"() = 'SPONSOR'::"public"."user_role_enum") AND ("id" IN ( SELECT "projects"."client_org_id"
   FROM "public"."projects"
  WHERE ("projects"."id" IN ( SELECT "project_team_members"."project_id"
           FROM "public"."project_team_members"
          WHERE ("project_team_members"."user_id" = "auth"."uid"())))))));



CREATE POLICY "orgs_write_admin" ON "public"."organizations" USING (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



CREATE POLICY "processing_insert" ON "public"."sample_processing" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum"])));



CREATE POLICY "processing_read" ON "public"."sample_processing" FOR SELECT TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum", 'LAB'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum", 'QA'::"public"."user_role_enum"])));



CREATE POLICY "processing_update" ON "public"."sample_processing" FOR UPDATE TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum", 'LAB'::"public"."user_role_enum"])));



ALTER TABLE "public"."project_budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_sample_collection_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_service_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_sites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_trial_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_admin_all" ON "public"."projects" USING (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



CREATE POLICY "projects_finance_select" ON "public"."projects" FOR SELECT USING (("public"."current_user_role"() = 'FINANCE'::"public"."user_role_enum"));



CREATE POLICY "projects_investigator_update" ON "public"."projects" FOR UPDATE USING ((("public"."current_user_role"() = 'INVESTIGATOR'::"public"."user_role_enum") AND "public"."is_project_member"("id")));



CREATE POLICY "projects_member_select" ON "public"."projects" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['INVESTIGATOR'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum", 'LAB'::"public"."user_role_enum", 'EXTERNAL_MONITOR'::"public"."user_role_enum"])) AND "public"."is_project_member"("id")));



CREATE POLICY "projects_sponsor_select" ON "public"."projects" FOR SELECT USING ((("public"."current_user_role"() = 'SPONSOR'::"public"."user_role_enum") AND "public"."is_project_sponsor"("id")));



ALTER TABLE "public"."quotations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotations_finance" ON "public"."quotations" TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['FINANCE'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"]))) WITH CHECK ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['FINANCE'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



CREATE POLICY "recruitment_read" ON "public"."recruitment_updates" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'FINANCE'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum"])) OR "public"."is_project_member"("project_id") OR "public"."is_project_sponsor"("project_id")));



CREATE POLICY "recruitment_update_coordinator" ON "public"."recruitment_updates" FOR UPDATE USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id")));



ALTER TABLE "public"."recruitment_updates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recruitment_write_coordinator" ON "public"."recruitment_updates" FOR INSERT WITH CHECK ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id")));



ALTER TABLE "public"."sample_collections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sample_details_access" ON "public"."project_sample_collection_details" USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])) OR "public"."is_project_member"("project_id")));



ALTER TABLE "public"."sample_processing" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "samples_read" ON "public"."sample_collections" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum", 'LAB'::"public"."user_role_enum"])) OR (("public"."current_user_role"() = 'COORDINATOR'::"public"."user_role_enum") AND "public"."is_project_member"("project_id"))));



CREATE POLICY "samples_write_coordinator" ON "public"."sample_collections" USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])) OR (("public"."current_user_role"() = ANY (ARRAY['COORDINATOR'::"public"."user_role_enum", 'LAB'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id"))));



CREATE POLICY "service_details_access" ON "public"."project_service_details" USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])) OR "public"."is_project_member"("project_id")));



ALTER TABLE "public"."sites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_read" ON "public"."project_team_members" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])) OR "public"."is_project_member"("project_id") OR "public"."is_project_sponsor"("project_id")));



CREATE POLICY "team_members_write_admin" ON "public"."project_team_members" USING (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



CREATE POLICY "trial_details_access" ON "public"."project_trial_details" USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])) OR (("public"."current_user_role"() = ANY (ARRAY['INVESTIGATOR'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum", 'LAB'::"public"."user_role_enum", 'EXTERNAL_MONITOR'::"public"."user_role_enum", 'SPONSOR'::"public"."user_role_enum"])) AND "public"."is_project_member"("project_id"))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_admin_all" ON "public"."users" USING (("public"."current_user_role"() = 'ADMIN'::"public"."user_role_enum"));



CREATE POLICY "users_select" ON "public"."users" FOR SELECT USING ((("id" = "auth"."uid"()) OR ("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"]))));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "visits_admin_all" ON "public"."monitoring_visits" USING (("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum"])));



CREATE POLICY "visits_monitor_own" ON "public"."monitoring_visits" TO "authenticated" USING ((("monitoring_type" = 'EXTERNAL'::"text") AND (( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'EXTERNAL_MONITOR'::"public"."user_role_enum") AND ("monitor_id" = "auth"."uid"())));



CREATE POLICY "visits_qa_internal" ON "public"."monitoring_visits" FOR SELECT TO "authenticated" USING ((("monitoring_type" = 'INTERNAL_QA'::"text") AND (( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['QA'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum"]))));



CREATE POLICY "visits_staff_read" ON "public"."monitoring_visits" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'INVESTIGATOR'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum", 'QA'::"public"."user_role_enum"])) AND (("monitoring_type" = 'EXTERNAL'::"text") OR ("public"."current_user_role"() = ANY (ARRAY['QA'::"public"."user_role_enum", 'ADMIN'::"public"."user_role_enum", 'PM_CRIO'::"public"."user_role_enum", 'COORDINATOR'::"public"."user_role_enum"]))) AND "public"."is_project_member"("project_id")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_project_member"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_project_member"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_project_member"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_project_sponsor"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_project_sponsor"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_project_sponsor"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_recruitment_to_project"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_recruitment_to_project"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_recruitment_to_project"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_overdue_milestones"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_overdue_milestones"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_overdue_milestones"() TO "service_role";


















GRANT ALL ON TABLE "public"."adverse_events" TO "anon";
GRANT ALL ON TABLE "public"."adverse_events" TO "authenticated";
GRANT ALL ON TABLE "public"."adverse_events" TO "service_role";



GRANT ALL ON TABLE "public"."crm_interactions" TO "anon";
GRANT ALL ON TABLE "public"."crm_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."ethics_alerts" TO "anon";
GRANT ALL ON TABLE "public"."ethics_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."ethics_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."milestones" TO "anon";
GRANT ALL ON TABLE "public"."milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."milestones" TO "service_role";



GRANT ALL ON TABLE "public"."monitoring_findings" TO "anon";
GRANT ALL ON TABLE "public"."monitoring_findings" TO "authenticated";
GRANT ALL ON TABLE "public"."monitoring_findings" TO "service_role";



GRANT ALL ON TABLE "public"."monitoring_visits" TO "anon";
GRANT ALL ON TABLE "public"."monitoring_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."monitoring_visits" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."open_findings_summary" TO "anon";
GRANT ALL ON TABLE "public"."open_findings_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."open_findings_summary" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."project_budgets" TO "anon";
GRANT ALL ON TABLE "public"."project_budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."project_budgets" TO "service_role";



GRANT ALL ON TABLE "public"."project_expenses" TO "anon";
GRANT ALL ON TABLE "public"."project_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."project_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."project_notes" TO "anon";
GRANT ALL ON TABLE "public"."project_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."project_notes" TO "service_role";



GRANT ALL ON TABLE "public"."project_sample_collection_details" TO "anon";
GRANT ALL ON TABLE "public"."project_sample_collection_details" TO "authenticated";
GRANT ALL ON TABLE "public"."project_sample_collection_details" TO "service_role";



GRANT ALL ON TABLE "public"."project_service_details" TO "anon";
GRANT ALL ON TABLE "public"."project_service_details" TO "authenticated";
GRANT ALL ON TABLE "public"."project_service_details" TO "service_role";



GRANT ALL ON TABLE "public"."project_sites" TO "anon";
GRANT ALL ON TABLE "public"."project_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."project_sites" TO "service_role";



GRANT ALL ON TABLE "public"."project_team_members" TO "anon";
GRANT ALL ON TABLE "public"."project_team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_team_members" TO "service_role";



GRANT ALL ON TABLE "public"."project_trial_details" TO "anon";
GRANT ALL ON TABLE "public"."project_trial_details" TO "authenticated";
GRANT ALL ON TABLE "public"."project_trial_details" TO "service_role";



GRANT ALL ON TABLE "public"."quotations" TO "anon";
GRANT ALL ON TABLE "public"."quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."quotations" TO "service_role";



GRANT ALL ON TABLE "public"."recruitment_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."recruitment_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."recruitment_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."recruitment_updates" TO "anon";
GRANT ALL ON TABLE "public"."recruitment_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."recruitment_updates" TO "service_role";



GRANT ALL ON TABLE "public"."sample_collections" TO "anon";
GRANT ALL ON TABLE "public"."sample_collections" TO "authenticated";
GRANT ALL ON TABLE "public"."sample_collections" TO "service_role";



GRANT ALL ON TABLE "public"."sample_processing" TO "anon";
GRANT ALL ON TABLE "public"."sample_processing" TO "authenticated";
GRANT ALL ON TABLE "public"."sample_processing" TO "service_role";



GRANT ALL ON TABLE "public"."sites" TO "anon";
GRANT ALL ON TABLE "public"."sites" TO "authenticated";
GRANT ALL ON TABLE "public"."sites" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































