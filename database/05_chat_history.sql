-- ============================================================
-- Chat module — conversation history. Run after 01_schema.sql.
-- ============================================================

create table if not exists chat_conversations (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references app_users(id) on delete cascade,
    title       varchar(200) not null default 'New chat',
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists idx_chat_conversations_user on chat_conversations (user_id, updated_at desc);

create table if not exists chat_messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references chat_conversations(id) on delete cascade,
    role            varchar(20) not null check (role in ('user','assistant')),
    content         text not null,
    created_at      timestamptz not null default now()
);

create index if not exists idx_chat_messages_conversation on chat_messages (conversation_id, created_at);
