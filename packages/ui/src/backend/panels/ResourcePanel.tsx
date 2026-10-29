import type { ReactNode } from "react";
import { LoadingMessage, ErrorMessage, EmptyState } from "../feedback";
export function ResourcePanel<T>({resource,children}:{resource:{loading:boolean;error:string|null;data:T|null;reload:()=>void};children:(data:T)=>ReactNode}) {
  if(resource.loading)return <LoadingMessage/>;
  if(resource.error)return <ErrorMessage message={resource.error} onRetry={resource.reload}/>;
  if(resource.data===null)return <EmptyState/>;
  return children(resource.data);
}
