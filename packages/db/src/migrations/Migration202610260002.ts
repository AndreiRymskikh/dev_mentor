import { Migration } from "@mikro-orm/migrations";
export class Migration202610260002 extends Migration {
  override up():void {
    this.addSql("alter table \"mentor_profiles\" add \"public_work_url\" text null, add \"bio\" text null, add \"stack_tags\" text[] not null default '{}', add \"slug\" varchar(60) null, add \"published_at\" timestamptz null;");
    this.addSql("alter table \"mentor_profiles\" add constraint \"mentor_profiles_slug_unique\" unique (\"slug\");");
    this.addSql("alter table \"mentor_profiles\" add constraint \"mentor_profiles_published_slug_check\" check (published_at is null or slug is not null);");
    this.addSql("alter table \"mentor_profiles\" add constraint \"mentor_profiles_stack_tags_check\" check (stack_tags <@ ARRAY['typescript','react','python','ai-agents']::text[] and array_position(stack_tags, null) is null);");
  }
  override down():void {
    this.addSql("lock table mentor_profiles in access exclusive mode;");
    this.addSql("do $$ begin if exists (select 1 from mentor_profiles where public_work_url is not null or bio is not null or cardinality(stack_tags)>0 or slug is not null or published_at is not null) then raise exception 'Refusing destructive profile rollback: profile content exists'; end if; end $$;");
    this.addSql("alter table mentor_profiles drop constraint mentor_profiles_stack_tags_check, drop constraint mentor_profiles_published_slug_check, drop constraint mentor_profiles_slug_unique, drop column public_work_url, drop column bio, drop column stack_tags, drop column slug, drop column published_at;");
  }
}
