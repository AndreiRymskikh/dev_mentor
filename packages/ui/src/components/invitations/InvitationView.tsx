import type { ReactNode } from "react";
import { CalendarDays, Mail, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Link } from "../ui/link";

/** Presentation only: account authorization and invitation lookup stay in app/core. */
export function InvitationView({ account, children }: { account: ReactNode; children: ReactNode }) {
  return <div className="dm-invitation">
    <header className="dm-public-header"><Link className="dm-brand" href="/">DevMentor <Sparkles aria-hidden="true" /></Link><nav aria-label="Public navigation"><Button variant="text" disabled disabledReason="The mentor catalog is not available yet.">Mentors</Button>{account}</nav></header>
    <main className="dm-invitation-main">
      <section className="dm-invitation-hero" aria-labelledby="invitation-hero">
        <p className="dm-invitation-eyebrow">An invitation to mentor</p>
        <h1 id="invitation-hero">Mentor developers<br />through text sessions.</h1>
        <p>DevMentor sessions happen in text. You set your prices and choose when you are available.</p>
        <ul className="dm-invitation-chips" aria-label="Session format"><li>25 or 50 minutes</li><li>Written answer included</li></ul>
        <div className="dm-invitation-note"><CalendarDays aria-hidden="true" /><p>After accepting, prepare your profile, prices and first bookable session. Your mentor workspace shows your exact publication deadline.</p></div>
      </section>
      <section className="dm-invitation-card" aria-label="Your invitation"><Mail aria-hidden="true" />{children}</section>
    </main>
    <footer className="dm-public-footer"><p>Get coding help from a mentor.</p><p>Text sessions · Written answers</p></footer>
  </div>;
}
