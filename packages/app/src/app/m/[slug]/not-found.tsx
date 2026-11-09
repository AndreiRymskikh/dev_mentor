import "../../mentor.css";
import { Link } from "@devmentor/ui/components/ui/link";
export default function MentorNotFound() {
  return <main className="dm-mentor"><h1>Mentor profile not available</h1><p>This profile is not public. Browse the catalog for currently published mentors.</p><Link href="/mentors">Browse mentors</Link></main>;
}
