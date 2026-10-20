import type { ReactNode } from 'react';

/** Documentation layout helpers; every preview inside is a real package component. */
export function State({name,children}:{name:string;children:ReactNode}) {
  return <section className="ds-stack"><h2>{name}</h2>{children}</section>;
}
export function ApiTable({rows}:{rows:string[][]}) {
  return <div className="ds-scroll"><table><caption>Public props, defaults and responsibilities</caption><thead><tr><th scope="col">Prop</th><th scope="col">Type / default</th><th scope="col">Meaning</th></tr></thead><tbody>{rows.map(([prop,type,description])=><tr key={prop}><th scope="row"><code>{prop}</code></th><td>{type}</td><td>{description}</td></tr>)}</tbody></table></div>;
}
