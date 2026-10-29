import { Migration } from "@mikro-orm/migrations";

export class Migration202610260001 extends Migration {
  override up(): void {
    this.addSql("create table \"mentor_profiles\" (\"user_id\" uuid not null, \"initial_publish_due_at\" timestamptz null, primary key (\"user_id\"));");
    this.addSql("create table \"invitations\" (\"id\" uuid not null, \"email\" varchar(254) not null, \"token_hash\" varchar(64) not null, \"stack_tags\" text[] not null, \"created_at\" timestamptz not null, \"expires_at\" timestamptz not null, \"accepted_at\" timestamptz null, \"accepted_by_id\" uuid null, \"publish_due_at\" timestamptz null, \"revoked_at\" timestamptz null, primary key (\"id\"));");
    this.addSql("alter table \"invitations\" add constraint \"invitations_token_hash_unique\" unique (\"token_hash\");");
    this.addSql("create unique index invitations_pending_email_unique on invitations (email) where accepted_at is null and revoked_at is null;");
    this.addSql("alter table \"invitations\" add constraint \"invitations_email_check\" check (email = lower(btrim(email)) and length(email) > 0);");
    this.addSql("alter table \"invitations\" add constraint \"invitations_token_hash_check\" check (token_hash ~ '^[a-f0-9]{64}$');");
    this.addSql("alter table \"invitations\" add constraint \"invitations_stack_tags_check\" check (stack_tags <@ ARRAY['typescript','react','python','ai-agents']::text[] and array_position(stack_tags, null) is null);");
    this.addSql("alter table \"invitations\" add constraint \"invitations_acceptance_check\" check (((accepted_at is null) = (accepted_by_id is null)) and ((accepted_at is null) = (publish_due_at is null)) and (accepted_at is null or revoked_at is null));");
    this.addSql("alter table \"mentor_profiles\" add constraint \"mentor_profiles_user_id_foreign\" foreign key (\"user_id\") references \"users\" (\"id\") on update cascade on delete restrict;");
    this.addSql("alter table \"invitations\" add constraint \"invitations_accepted_by_id_foreign\" foreign key (\"accepted_by_id\") references \"users\" (\"id\") on delete restrict;");
  }
  override down(): void {
    this.addSql("lock table invitations, mentor_profiles in access exclusive mode;");
    this.addSql("do $$ begin if exists (select 1 from invitations) or exists (select 1 from mentor_profiles) then raise exception 'Refusing destructive mentor rollback: data exists'; end if; end $$;");
    this.addSql("drop table invitations, mentor_profiles;");
  }
}
