import { ReadinessError } from "../http/errors";
export interface ReadinessItem { field: string; label: string; met: boolean }
export function defineReadiness<T>(rules: readonly { field: string; label: string; message: string; test: (value: T) => boolean }[]) {
  function evaluate(value: T): ReadinessItem[] { return rules.map(rule=>({field:rule.field,label:rule.label,met:rule.test(value)})); }
  function assert(value: T) {
    const missing=rules.filter(rule=>!rule.test(value));
    if(missing.length) throw new ReadinessError(Object.fromEntries(missing.map(item=>[item.field,[item.message]])));
  }
  return {evaluate,assert};
}
