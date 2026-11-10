import { Link } from "react-router-dom";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";

// Draft copy: edit freely. Bracketed text is a placeholder for the owner.
export function AboutPage() {
  useDocumentTitle("About");
  return (
    <article className="prose-page">
      <h1>About Project Exfil</h1>
      <p className="page-lede">
        A directory of tech career programs open to veterans after separation, in software development,
        IT and support, cloud, cybersecurity, and data.
      </p>

      <h2>Why it exists</h2>
      <p>
        Programs that help veterans move into tech are scattered across company career pages, nonprofit sites,
        posts and word of mouth, and "veteran friendly" often isn't backed by an actual route in. Project Exfil
        collects real programs in one place and shows, for each one, how a veteran who has already separated
        can get in.
      </p>

      <h2>How listings are checked</h2>
      <ul>
        <li>Every listing is checked against the provider's own official page, and shows the date it was last verified.</li>
        <li>Each listing explains how veterans can access it. Programs only open to active-duty service members (such as SkillBridge-only fellowships) aren't listed.</li>
        <li>Nothing is published until an admin reviews it. When a program changes or ends, it's re-checked or archived with a reason.</li>
        <li>Anyone with an account can <Link to="/suggest">suggest a program or a correction</Link>; suggestions are verified before anything changes.</li>
      </ul>

      <h2>What you can do here</h2>
      <ul>
        <li><Link to="/programs">Browse and filter programs</Link> by tech track, format and application status.</li>
        <li>Save programs and track your progress with a checklist on your dashboard.</li>
        <li>Ask questions and share experiences in each listing's discussion.</li>
      </ul>

      <h2>Who runs it</h2>
      <p>[Add a sentence about who runs Project Exfil and why, if you'd like.]</p>

      <p className="disclaimer">
        Project Exfil isn't affiliated with any organization listed. Always confirm details on the provider's official
        page before applying. Questions? <Link to="/faq">Read the FAQ</Link> or <Link to="/contact">contact the admin</Link>.
      </p>
    </article>
  );
}
