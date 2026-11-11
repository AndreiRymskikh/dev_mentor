import { ServiceUnavailableError } from "../../http/errors";
/** Only these explicit public instructions leave the server. Read lazily. */
export function readBookingHandoff(source:Record<string,string|undefined>=process.env) {
 const guidance=source.BOOKING_SESSION_GUIDANCE?.trim(),supportUrl=source.BOOKING_SUPPORT_URL?.trim();
 if(!guidance||guidance.length>2000||!supportUrl||supportUrl.length>2048||/[\r\n]/.test(supportUrl)||/%0[ad]/i.test(supportUrl))throw new ServiceUnavailableError();
 try {
  const url=new URL(supportUrl);
  if(url.username||url.password||!((url.protocol==="https:"&&url.hostname)||(url.protocol==="mailto:"&&/^[^\s@?]+@[^\s@?]+$/.test(url.pathname)&&!url.search)))throw new Error("Invalid support");
 }catch {throw new ServiceUnavailableError();}
 return {guidance,supportUrl};
}
