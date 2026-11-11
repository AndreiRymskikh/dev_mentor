import { database, BookingRepository } from "../packages/db/src/index.ts";
/** Bounded invocation. The deployment scheduler owns daily execution and alerting. */
try {
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required");
 const deleted=await new BookingRepository().maintain(new Date());
 console.log(JSON.stringify({event:"bookings.retention.completed",deleted}));
} catch {
 console.error("Booking retention failed; no request or participant details logged.");process.exitCode=1;
} finally {await database.close();}
