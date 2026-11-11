import { Migration } from "@mikro-orm/migrations";
export class Migration202611090001 extends Migration {
  override up():void {
    this.addSql("create table \"bookings\" (\"id\" uuid not null, \"developer_user_id\" uuid not null, \"mentor_user_id\" uuid not null, \"slot_id\" uuid not null, \"starts_at\" timestamptz not null, \"ends_at\" timestamptz not null, \"duration_minutes\" int not null, \"price_cents\" int not null, \"currency\" varchar(3) not null, \"status\" varchar(10) not null, \"version\" int not null, \"created_at\" timestamptz not null, \"updated_at\" timestamptz not null, \"cancelled_at\" timestamptz null, \"completed_at\" timestamptz null, \"retention_expires_at\" timestamptz not null, primary key (\"id\"));");
    this.addSql("create index \"bookings_mentor_start_index\" on \"bookings\" (\"mentor_user_id\", \"starts_at\");");
    this.addSql("create index \"bookings_developer_start_index\" on \"bookings\" (\"developer_user_id\", \"starts_at\");");
    this.addSql("create index \"bookings_retention_index\" on \"bookings\" (\"retention_expires_at\", \"id\");");
    this.addSql("alter table \"bookings\" add constraint \"bookings_terms_check\" check (developer_user_id <> mentor_user_id and duration_minutes in (25,50) and price_cents > 0 and currency = 'PLN' and version > 0);");
    this.addSql("alter table \"bookings\" add constraint \"bookings_time_check\" check (isfinite(starts_at) and isfinite(ends_at) and isfinite(retention_expires_at) and ends_at = starts_at + duration_minutes * interval '1 minute');");
    this.addSql("alter table \"bookings\" add constraint \"bookings_state_check\" check ((status = 'booked' and cancelled_at is null and completed_at is null) or (status = 'cancelled' and cancelled_at is not null and completed_at is null) or (status = 'completed' and completed_at is not null and cancelled_at is null));");
    this.addSql("create table \"booking_events\" (\"id\" uuid not null, \"booking_id\" uuid not null, \"actor_user_id\" uuid not null, \"kind\" varchar(12) not null, \"version\" int not null, \"occurred_at\" timestamptz not null, \"reason\" text null, \"old_slot_id\" uuid null, \"new_slot_id\" uuid null, \"old_starts_at\" timestamptz null, \"new_starts_at\" timestamptz null, primary key (\"id\"));");
    this.addSql("alter table \"booking_events\" add constraint \"booking_events_version_unique\" unique (\"booking_id\", \"version\");");
    this.addSql("alter table \"booking_events\" add constraint \"booking_events_kind_check\" check (kind in ('created','rescheduled','cancelled','completed') and version > 0);");
    this.addSql("alter table \"booking_events\" add constraint \"booking_events_reason_check\" check ((kind = 'cancelled' and reason is not null and length(btrim(reason)) between 1 and 1000) or (kind <> 'cancelled' and reason is null));");
    this.addSql("alter table \"booking_events\" add constraint \"booking_events_move_check\" check ((kind = 'rescheduled' and old_slot_id is not null and new_slot_id is not null and old_starts_at is not null and new_starts_at is not null) or (kind <> 'rescheduled' and old_slot_id is null and new_slot_id is null and old_starts_at is null and new_starts_at is null));");
    this.addSql("create table \"booking_commands\" (\"id\" uuid not null, \"actor_user_id\" uuid not null, \"request_id\" uuid not null, \"operation\" varchar(10) not null, \"digest\" varchar(64) not null, \"booking_id\" uuid not null, \"applied_version\" int not null, \"created_at\" timestamptz not null, primary key (\"id\"));");
    this.addSql('create index "booking_commands_booking_index" on "booking_commands" ("booking_id");');
    this.addSql("alter table \"booking_commands\" add constraint \"booking_commands_actor_request_unique\" unique (\"actor_user_id\", \"request_id\");");
    this.addSql("alter table \"booking_commands\" add constraint \"booking_commands_input_check\" check (digest ~ '^[a-f0-9]{64}$' and operation in ('create','reschedule','cancel','complete') and applied_version > 0);");
    this.addSql("alter table \"bookings\" add constraint \"bookings_developer_user_id_foreign\" foreign key (\"developer_user_id\") references \"users\" (\"id\") on delete restrict;");
    this.addSql("alter table \"bookings\" add constraint \"bookings_mentor_user_id_foreign\" foreign key (\"mentor_user_id\") references \"users\" (\"id\") on delete restrict;");
    this.addSql("alter table \"bookings\" add constraint \"bookings_slot_id_foreign\" foreign key (\"slot_id\") references \"slots\" (\"id\") on delete restrict;");
    this.addSql("alter table \"booking_events\" add constraint \"booking_events_booking_id_foreign\" foreign key (\"booking_id\") references \"bookings\" (\"id\") on delete cascade;");
    this.addSql("alter table \"booking_events\" add constraint \"booking_events_actor_user_id_foreign\" foreign key (\"actor_user_id\") references \"users\" (\"id\") on delete restrict;");
    this.addSql("alter table \"booking_events\" add constraint \"booking_events_old_slot_id_foreign\" foreign key (\"old_slot_id\") references \"slots\" (\"id\") on delete restrict;");
    this.addSql("alter table \"booking_events\" add constraint \"booking_events_new_slot_id_foreign\" foreign key (\"new_slot_id\") references \"slots\" (\"id\") on delete restrict;");
    this.addSql("alter table \"booking_commands\" add constraint \"booking_commands_actor_user_id_foreign\" foreign key (\"actor_user_id\") references \"users\" (\"id\") on delete restrict;");
    this.addSql("alter table \"booking_commands\" add constraint \"booking_commands_booking_id_foreign\" foreign key (\"booking_id\") references \"bookings\" (\"id\") on delete cascade;");
  }
  override down():void {
    this.addSql("lock table bookings, booking_events, booking_commands in access exclusive mode;");
    this.addSql("do $$ begin if exists (select 1 from bookings) or exists (select 1 from booking_events) or exists (select 1 from booking_commands) then raise exception 'Refusing destructive booking rollback: reservation history exists'; end if; end $$;");
    this.addSql("drop table booking_commands, booking_events, bookings;");
  }
}
