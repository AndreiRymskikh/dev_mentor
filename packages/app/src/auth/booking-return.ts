/** Exact canonical intent only; no arbitrary URLs, duplicate fields, fragments or extra parameters. */
export function parseBookingReturn(input:string):string|null {
 if(input.length>250||!/^\/book\/[a-z0-9][a-z0-9-]{1,59}\?/.test(input))return null;
 const match=/^\/book\/([a-z0-9][a-z0-9-]{1,59})\?slot=([a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})&duration=(25|50)(?![\s\S])/.exec(input);
 return match?input:null;
}
