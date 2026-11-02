import { Migration } from "@mikro-orm/migrations";
export class Migration202611020001 extends Migration {
  override up(): void {
    this.addSql('alter table "mentor_profiles" add "last_published_availability_at" timestamptz null;');
    this.addSql('create table "slots" ("id" uuid not null, "mentor_profile_id" uuid not null, "starts_at" timestamptz not null, "removed_at" timestamptz null, constraint "slots_pkey" primary key ("id"));');
    this.addSql('alter table "slots" add constraint "slots_mentor_profile_id_foreign" foreign key ("mentor_profile_id") references "mentor_profiles" ("user_id") on delete cascade;');
    this.addSql('create unique index slots_active_start_unique on slots (mentor_profile_id, starts_at) where removed_at is null;');
    this.addSql('create index "slots_mentor_start_index" on "slots" ("mentor_profile_id", "starts_at");');
  }
  override down(): void {
    this.addSql('lock table mentor_profiles, slots in access exclusive mode;');
    this.addSql("do $$ begin if exists (select 1 from slots) or exists (select 1 from mentor_profiles where last_published_availability_at is not null) then raise exception 'Refusing destructive availability rollback: availability history exists'; end if; end $$;");
    this.addSql('drop table "slots";');
    this.addSql('alter table "mentor_profiles" drop column "last_published_availability_at";');
  }
}
