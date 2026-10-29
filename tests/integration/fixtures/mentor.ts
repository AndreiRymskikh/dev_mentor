import {randomUUID,randomBytes,createHash} from "node:crypto";
import type {Client} from "pg";
/** Only call with the integration runner's disposable database client. */
export async function seedPendingInvitation(client:Client,input:{email:string;expiresAt:Date;stackTags:readonly string[]}) {
 const id=randomUUID(),token=randomBytes(32).toString("base64url");await client.query("insert into invitations(id,email,token_hash,stack_tags,created_at,expires_at) values($1,$2,$3,$4,now(),$5)",[id,input.email,createHash("sha256").update(token).digest("hex"),input.stackTags,input.expiresAt]);return {id,token};
}
export async function seedPublishedMentorProfile(client:Client,input:{userId:string;slug:string;bio:string;publicWorkUrl:string;stackTags:readonly string[];initialPublishDueAt:Date}) {
 await client.query("insert into mentor_profiles(user_id,slug,bio,public_work_url,stack_tags,published_at,initial_publish_due_at) values($1,$2,$3,$4,$5,now(),$6)",[input.userId,input.slug,input.bio,input.publicWorkUrl,input.stackTags,input.initialPublishDueAt]);return {slug:input.slug};
}
