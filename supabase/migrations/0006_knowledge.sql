-- ============================================================================
-- 0006_knowledge.sql
-- SOPs / documents / policies with versions, plus pgvector chunks for RAG.
-- ============================================================================

create table documents (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organizations (id) on delete cascade,
  workspace_id       uuid not null references workspaces (id) on delete cascade,
  type               document_type not null default 'doc',
  title              text not null,
  status             document_status not null default 'draft',
  current_version_id uuid,
  created_by         uuid not null references profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index documents_workspace_idx on documents (workspace_id);
create index documents_title_trgm_idx on documents using gin (title gin_trgm_ops);
create trigger documents_set_updated_at before update on documents
  for each row execute function set_updated_at();

create table doc_versions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  body        text not null,
  version_no  int not null,
  author_id   uuid not null references profiles (id),
  created_at  timestamptz not null default now(),
  unique (document_id, version_no)
);
create index doc_versions_document_idx on doc_versions (document_id);

alter table documents
  add constraint documents_current_version_fk
  foreign key (current_version_id) references doc_versions (id) on delete set null;

-- RAG index: embedded chunks of published documents (1536 dims = text-embedding sizes).
create table doc_chunks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  version_id  uuid not null references doc_versions (id) on delete cascade,
  chunk_index int not null,
  chunk_text  text not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now()
);
create index doc_chunks_document_idx on doc_chunks (document_id);
-- Approximate-nearest-neighbour index for similarity search.
create index doc_chunks_embedding_idx on doc_chunks
  using hnsw (embedding vector_cosine_ops);

-- A guided checklist instance generated from an SOP document.
create table sop_runs (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations (id) on delete cascade,
  workspace_id      uuid not null references workspaces (id) on delete cascade,
  document_id       uuid not null references documents (id) on delete cascade,
  started_by        uuid not null references profiles (id),
  generated_task_ids jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);
create index sop_runs_document_idx on sop_runs (document_id);
