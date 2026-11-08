"use client";
import { useEffect, useRef } from "react";
import { apiCall } from "@devmentor/ui/backend/api";
import { DataTable } from "@devmentor/ui/backend/tables";
import { ResourcePanel } from "@devmentor/ui/backend/panels";
import { EmptyState } from "@devmentor/ui/backend/feedback";
import { Link } from "@devmentor/ui/components/ui/link";
import { formatMoney } from "@devmentor/core/validators/prices";
import { StackTags, type MentorCatalog, type CatalogMentor } from "@devmentor/core/validators/mentors";
import { useAvailability } from "../../availability/use-availability";
function MentorSummary({mentor}: {mentor: CatalogMentor}) {
  return <article className="dm-catalog-summary">
    <h2>{mentor.displayName}</h2>{mentor.bio && <p className="dm-catalog-bio">{mentor.bio}</p>}
    <ul aria-label="Stack tags">{StackTags.options.filter(tag => mentor.stackTags.includes(tag.value)).map(tag => <li key={tag.value}>{tag.label}</li>)}</ul>
    {mentor.offer.prices ? <p>25 minutes: PLN {formatMoney(mentor.offer.prices.price25Cents)} · 50 minutes: PLN {formatMoney(mentor.offer.prices.price50Cents)}</p> : <p>Prices are not set within current bounds.</p>}
    <p>{mentor.offer.readiness.availability ? "Future availability published with at least two hours’ notice." : "No eligible availability currently published."}</p>
    <Link href={`/m/${encodeURIComponent(mentor.slug)}`} aria-label={`View profile: ${mentor.displayName}`}>View profile</Link>
  </article>;
}
export function Catalog({after}: {after?: string}) {
  const resource = useAvailability<MentorCatalog>(`/api/mentors${after === undefined ? "" : `?after=${encodeURIComponent(after)}`}`, apiCall<MentorCatalog>);
  const heading = useRef<HTMLHeadingElement>(null), focusResults = useRef(true);
  useEffect(() => {
    // Visibility and eligibility boundaries refresh too; periodically reconcile publication/role changes.
    const timer = setInterval(resource.reload, 60000);
    return () => clearInterval(timer);
  }, [resource.reload]);
  useEffect(() => { if (resource.data && !resource.loading && focusResults.current) { heading.current?.focus(); focusResults.current = false; } }, [resource.data, resource.loading]);
  return <div className="dm-public-profile dm-catalog">
    <header className="dm-public-header"><Link className="dm-public-brand" href="/">DevMentor <span aria-hidden="true">✦</span></Link><nav aria-label="Public navigation"><Link href="/mentors" aria-current="page">Mentors</Link><Link href="/account">My workspace</Link><Link href="/login">Sign in</Link></nav></header>
    <main><h1 ref={heading} tabIndex={-1}>Find a mentor</h1><p>Explore published mentor profiles, their approach and current session prices.</p><p>Newest publications first. Booking and payment are not available yet.</p>
      <ResourcePanel resource={{...resource, reload: () => { focusResults.current = true; resource.reload(); }}}>{page => <>
        {page.items.length ? <DataTable rows={page.items} rowKey={mentor => mentor.slug} columns={[{key: "mentor", label: "Mentors", render: mentor => <MentorSummary mentor={mentor}/>}]} /> : <EmptyState message={after === undefined ? "No mentors have published a profile yet." : "No more mentors on this page. Return to the first page for current results."}/>}
        <nav className="dm-catalog-pagination" aria-label="Mentor catalog pagination">{after !== undefined && <Link href="/mentors">Back to first page</Link>}{page.nextCursor && <Link href={`/mentors?after=${encodeURIComponent(page.nextCursor)}`}>Next mentors</Link>}</nav>
      </>}</ResourcePanel>
      {resource.error && <Link href="/mentors">Back to first page</Link>}
    </main>
    <footer className="dm-public-footer"><p>Get coding help from a mentor.</p><Link href="/account">Your workspace</Link></footer>
  </div>;
}
