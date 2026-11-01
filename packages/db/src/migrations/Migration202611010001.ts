import { Migration } from "@mikro-orm/migrations";
export class Migration202611010001 extends Migration {
  override up():void {
    this.addSql(`alter table "mentor_profiles" add "session_language" varchar(35) null, add "mentor_time_zone" varchar(100) null, add "help_topics" jsonb not null default '[]', add "sample_answer" jsonb null, add "session_steps" jsonb not null default '[]';`);
  }
  override down():void {
    this.addSql("lock table mentor_profiles in access exclusive mode;");
    this.addSql("do $$ begin if exists (select 1 from mentor_profiles where session_language is not null or mentor_time_zone is not null or help_topics <> '[]'::jsonb or sample_answer is not null or session_steps <> '[]'::jsonb) then raise exception 'Refusing destructive details rollback: public content exists'; end if; end $$;");
    this.addSql("alter table mentor_profiles drop column session_language, drop column mentor_time_zone, drop column help_topics, drop column sample_answer, drop column session_steps;");
  }
}
