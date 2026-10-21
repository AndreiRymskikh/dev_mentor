import { Migration } from "@mikro-orm/migrations";

/** Additive auth foundation. Down is reserved for empty disposable schemas. */
export class Migration202610210001 extends Migration {
  override up(): void {
    this.addSql("create table \"rate_limit_buckets\" (\"key_digest\" varchar(64) not null, \"window_start\" timestamptz not null, \"attempt_count\" int not null, \"expires_at\" timestamptz not null, primary key (\"key_digest\", \"window_start\"));");
    this.addSql("create index \"rate_limit_buckets_expires_at_index\" on \"rate_limit_buckets\" (\"expires_at\");");
    this.addSql("alter table \"rate_limit_buckets\" add constraint \"rate_limit_buckets_key_digest_check\" check (key_digest ~ '^[a-f0-9]{64}$');");
    this.addSql("alter table \"rate_limit_buckets\" add constraint \"rate_limit_buckets_attempt_count_check\" check (attempt_count >= 0);");
    this.addSql("create table \"users\" (\"id\" uuid not null, \"normalized_email\" varchar(254) not null, \"display_name\" varchar(100) not null, \"email_verified_at\" timestamptz null, \"created_at\" timestamptz not null, \"updated_at\" timestamptz not null, primary key (\"id\"));");
    this.addSql("alter table \"users\" add constraint \"users_normalized_email_unique\" unique (\"normalized_email\");");
    this.addSql("alter table \"users\" add constraint \"users_normalized_email_check\" check (normalized_email = lower(btrim(normalized_email)) and length(normalized_email) > 0);");
    this.addSql("alter table \"users\" add constraint \"users_display_name_check\" check (length(btrim(display_name)) > 0);");
    this.addSql("create table \"credentials\" (\"user_id\" uuid not null, \"password_hash\" varchar(60) not null, \"password_changed_at\" timestamptz not null, primary key (\"user_id\"));");
    this.addSql("alter table \"credentials\" add constraint \"credentials_password_hash_check\" check (password_hash ~ '^\\$2[aby]\\$(1[2-9]|2[0-9]|3[01])\\$[./A-Za-z0-9]{53}$');");
    this.addSql("create table \"auth_sessions\" (\"id\" uuid not null, \"user_id\" uuid not null, \"expires_at\" timestamptz not null, \"revoked_at\" timestamptz null, primary key (\"id\"));");
    this.addSql("create index \"auth_sessions_user_id_index\" on \"auth_sessions\" (\"user_id\");");
    this.addSql("create index \"auth_sessions_expires_at_index\" on \"auth_sessions\" (\"expires_at\");");
    this.addSql("create table \"action_tokens\" (\"id\" uuid not null, \"user_id\" uuid not null, \"purpose\" text not null, \"digest\" varchar(64) not null, \"expires_at\" timestamptz not null, \"consumed_at\" timestamptz null, primary key (\"id\"));");
    this.addSql("create index \"action_tokens_user_id_index\" on \"action_tokens\" (\"user_id\");");
    this.addSql("alter table \"action_tokens\" add constraint \"action_tokens_digest_unique\" unique (\"digest\");");
    this.addSql("create index \"action_tokens_expires_at_index\" on \"action_tokens\" (\"expires_at\");");
    this.addSql("alter table \"action_tokens\" add constraint \"action_tokens_digest_check\" check (digest ~ '^[a-f0-9]{64}$');");
    this.addSql("alter table \"action_tokens\" add constraint \"action_tokens_purpose_check\" check (\"purpose\" in ('verify-email', 'reset-password'));");
    this.addSql("create table \"user_roles\" (\"user_id\" uuid not null, \"role\" text not null, primary key (\"user_id\", \"role\"));");
    this.addSql("alter table \"user_roles\" add constraint \"user_roles_role_check\" check (\"role\" in ('developer', 'mentor', 'administrator'));");
    this.addSql("alter table \"credentials\" add constraint \"credentials_user_id_foreign\" foreign key (\"user_id\") references \"users\" (\"id\") on update cascade on delete restrict;");
    this.addSql("alter table \"auth_sessions\" add constraint \"auth_sessions_user_id_foreign\" foreign key (\"user_id\") references \"users\" (\"id\") on delete restrict;");
    this.addSql("alter table \"action_tokens\" add constraint \"action_tokens_user_id_foreign\" foreign key (\"user_id\") references \"users\" (\"id\") on delete restrict;");
    this.addSql("alter table \"user_roles\" add constraint \"user_roles_user_id_foreign\" foreign key (\"user_id\") references \"users\" (\"id\") on delete restrict;");
  }

  override down(): void {
    // ACCESS EXCLUSIVE closes the concurrent insert window before the data guard.
    this.addSql('lock table users, user_roles, credentials, auth_sessions, action_tokens, rate_limit_buckets in access exclusive mode;');
    this.addSql(`do $$ begin
      if exists (select 1 from users) or exists (select 1 from rate_limit_buckets) then
        raise exception 'Refusing destructive auth rollback: data exists; retain schema and roll back application routes';
      end if;
    end $$;`);
    this.addSql('drop table rate_limit_buckets, action_tokens, auth_sessions, credentials, user_roles, users;');
  }
}
