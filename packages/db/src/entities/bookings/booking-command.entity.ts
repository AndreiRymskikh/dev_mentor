import { defineEntity, p } from "@mikro-orm/postgresql";
import { Booking } from "./booking.entity";
import { User } from "../users/user.entity";
export const BookingCommand = defineEntity({
  name:"BookingCommand", tableName:"booking_commands",
  indexes:[{name:"booking_commands_booking_index",properties:["bookingId"]}],
  uniques:[{name:"booking_commands_actor_request_unique",properties:["actorUserId","requestId"]}],
  checks:[{name:"booking_commands_input_check",expression:"digest ~ '^[a-f0-9]{64}$' and operation in ('create','reschedule','cancel','complete') and applied_version > 0"}],
  properties:{
    id:p.uuid().primary(), actorUserId:p.manyToOne(User).fieldName("actor_user_id").mapToPk().deleteRule("restrict"),
    requestId:p.uuid(),operation:p.string().length(10),digest:p.string().length(64),
    bookingId:p.manyToOne(Booking).fieldName("booking_id").mapToPk().deleteRule("cascade"), appliedVersion:p.integer(),createdAt:p.datetime(),
  },
});
