import { Migration } from "@mikro-orm/migrations";
export class Migration202611030001 extends Migration {
  override up(): void {
    this.addSql('alter table "mentor_profiles" add "price_25_cents" integer null, add "price_50_cents" integer null;');
    this.addSql('alter table "mentor_profiles" add constraint "mentor_profiles_price_25_check" check (price_25_cents > 0), add constraint "mentor_profiles_price_50_check" check (price_50_cents > 0);');
  }
  override down(): void {
    this.addSql('lock table mentor_profiles in access exclusive mode;');
    this.addSql("do $$ begin if exists (select 1 from mentor_profiles where price_25_cents is not null or price_50_cents is not null) then raise exception 'Refusing destructive price rollback: saved prices exist'; end if; end $$;");
    this.addSql('alter table "mentor_profiles" drop column "price_25_cents", drop column "price_50_cents";');
  }
}
