import { Link } from "../../components/ui/link";
export function ReadinessChecklist({items}:{items:readonly {field:string;label:string;met:boolean;href?:string}[]}) {return <ul aria-label="Profile readiness">{items.map(item=><li key={item.field}>{item.met?"Complete":"Missing"}: {item.href?<Link href={item.href}>{item.label}</Link>:item.label}</li>)}</ul>;}
