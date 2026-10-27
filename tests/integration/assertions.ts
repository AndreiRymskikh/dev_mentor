import type {IntegrationContext} from "./context";
/** E02 excludes public reputation UI; preview is not a review feature. */
export async function expectAbsent(browser:IntegrationContext["browser"]) {await browser("wait","--fn","!/\\b(?:ratings?|scores?|reviews?|rankings?)\\b/i.test(document.body.innerText)");}
