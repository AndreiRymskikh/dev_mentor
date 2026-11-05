"use client";
import { useCallback, useEffect, useState } from "react";
import type { OwnerPrices } from "@devmentor/core/validators/prices";
import type { OwnerMentorProfile } from "@devmentor/core/validators/mentors";
import { useApiResource } from "@devmentor/ui/backend/api";
import { ErrorMessage } from "@devmentor/ui/backend/feedback";
import { Button } from "@devmentor/ui/components/ui/button";
import { Link } from "@devmentor/ui/components/ui/link";
import { LocalTime } from "@devmentor/ui/time";
import { protectedRequest } from "../../auth/protected-request";
import { useAvailability } from "../../availability/use-availability";
import { PriceEditor } from "./prices/price-editor";
import { SlotEditor } from "./slots/slot-editor";

/** Compose existing E02 consumers; the server remains the only source of readiness. */
export function MentorHome({ initialPublishDueAt }: { initialPublishDueAt: string | null }) {
  const [denied, setDenied] = useState(false);
  const request = useCallback<typeof protectedRequest>(async <T,>(...args: Parameters<typeof protectedRequest<T>>) => {
    const result = await protectedRequest<T>(...args);
    if (!args[1]?.signal?.aborted && !result.ok && (result.error.code === "FORBIDDEN" || result.error.code === "UNAUTHORIZED")) setDenied(true);
    return result;
  }, []);
  const offer = useAvailability<OwnerPrices>("/api/mentors/me/prices", request);
  const profile = useApiResource<OwnerMentorProfile>("/api/mentors/me", request);
  const reloadProfile = profile.reload;
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") reloadProfile(); };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [reloadProfile]);
  if (denied) return <ErrorMessage message="Mentor access is required. Reload after signing in." />;
  const data = offer.data;
  const steps = [
    { key: "profile" as const, label: "Publish your mentor profile", description: "Add your public work, a description and your technologies.", href: "/mentor/profile", action: "Edit profile" },
    { key: "prices" as const, label: "Set your session prices", description: "Choose a price for 25 minutes and 50 minutes.", href: "#session-prices", action: "Set prices" },
    { key: "availability" as const, label: "Publish an available time", description: "At least one start two hours ahead is required for offer preparation.", href: "#available-time", action: "Add time" },
  ];
  const completed = data ? steps.filter(step => data.readiness[step.key]).length : null;
  return <div className="dm-mentor-home">
    <div className="dm-mentor-home-heading"><div><p className="dm-home-eyebrow">Mentor workspace</p><h1>Your mentor workspace</h1><p>Manage your public profile, session prices and availability.</p></div><Link href="/mentor/profile">Edit profile</Link></div>
    <section className="dm-workspace-panel dm-home-setup" aria-label="Mentor setup">
      <h2>Set up your mentor profile</h2><p>Complete your profile, set your prices and add time for sessions.</p>
      {initialPublishDueAt && <p>Initial publication deadline: <LocalTime value={initialPublishDueAt} /></p>}
      {offer.loading && <p role="status">Checking mentor setup…</p>}
      {offer.error && <ErrorMessage message={offer.error} onRetry={offer.reload} />}
      {data && <><p role="status">{completed} of 3 steps complete</p><progress aria-label="Mentor setup progress" value={completed!} max={3} />
        <ol>{steps.map((step, index) => <li key={step.key}><span className="dm-home-step" aria-hidden="true">{data.readiness[step.key] ? "✓" : index + 1}</span><div><h3>{step.label} <span>{data.readiness[step.key] ? "Complete" : "Incomplete"}</span></h3><p>{step.description}</p></div><Link href={step.href}>{step.action}</Link></li>)}</ol></>}
      <p>Offer preparation does not enable booking or payments. These are not available yet.</p>
    </section>
    <div className="dm-home-editors">
      <section className="dm-workspace-panel dm-home-prices" id="session-prices" aria-label="Session prices"><h2>Session prices</h2><PriceEditor request={request} onSaved={offer.reload} showReadiness={false}/></section>
      <div className="dm-home-slots"><SlotEditor request={request} onChanged={offer.reload}/></div>
    </div>
    <section className="dm-workspace-panel dm-home-share" aria-label="Share your profile">
      <h2>{data?.mentorOfferReady && profile.data?.publishedAt ? "Your profile is ready to share" : "Your public profile"}</h2>
      {profile.loading && <p role="status">Checking public profile…</p>}
      {profile.error && <ErrorMessage message={profile.error} onRetry={profile.reload}/>}
      {profile.data && <>{data?.readiness.profile && profile.data.publishedAt && profile.data.slug ? <><p>Check what mentees see, including your current prices and availability.</p><Link href={`/m/${profile.data.slug}`}>View public profile</Link></> : <><p>Publish your profile before sharing it with mentees.</p><Link href="/mentor/profile">Complete your profile</Link></>}</>}
      <Button disabled disabledReason="Payouts are not available yet.">Payout settings</Button>
    </section>
  </div>;
}
