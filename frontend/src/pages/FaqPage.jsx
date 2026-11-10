import { Link } from "react-router-dom";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";

// Draft copy: edit freely.

// Where locked-out users can reach the admin (the Contact form needs a login).
const ADMIN_EMAIL = "marco.garcia.650.bus@gmail.com";
const FAQS = [
  {
    q: "Who is Project Exfil for?",
    a: <>Veterans who have separated (or are about to) and want to move into tech. Some programs are also open to military spouses or Guard and Reserve members; each listing says who can apply.</>,
  },
  {
    q: "Is it free?",
    a: <>Yes. Browsing is open to everyone, and an account (also free) lets you save programs, track your progress, and join discussions.</>,
  },
  {
    q: "Are these programs affiliated with Project Exfil?",
    a: <>No. Project Exfil isn't affiliated with any listed organization. You apply directly with the provider.</>,
  },
  {
    q: "How do you verify listings?",
    a: <>Each listing is checked against the provider's official page and shows its last-verified date. An admin reviews every listing before it's published. Details can still change, so confirm on the official page before you apply.</>,
  },
  {
    q: "Why isn't SkillBridge listed?",
    a: <>DoD SkillBridge is only for active-duty service members. Project Exfil lists programs veterans can join after separation. If a program also offers a SkillBridge route, its listing mentions that, but the veteran route is what's shown.</>,
  },
  {
    q: "What does “Application status unknown” mean?",
    a: <>The provider's official page doesn't say whether applications are currently open. Check their page, or the listing's application timing.</>,
  },
  {
    q: "How do I save and track programs?",
    a: <>Create an account, then use the bookmark on any program. Your <Link to="/dashboard">dashboard</Link> lists saved programs with a status (researching, applied, interviewing…) and a checklist. Click the bookmark again, or Remove on the dashboard, to unsave.</>,
  },
  {
    q: "How do I suggest a program or a correction?",
    a: <>Use <Link to="/suggest">Suggest a program</Link>, or “Suggest an update” on a listing. Suggestions are verified against the provider's official page before anything changes; you can follow their status on <Link to="/account/submissions">My submissions</Link>.</>,
  },
  {
    q: "Who can see my username and email?",
    a: <>Your username appears on comments you post. Your email is never shown publicly.</>,
  },
  {
    q: "How do I report a comment?",
    a: <>Use Report under the comment. Reports go to the admin, who can remove comments and suspend accounts that break the rules.</>,
  },
  {
    q: "I forgot my password. What do I do?",
    // TODO(owner): replace this personal address with a domain address
    // (e.g. admin@projectexfilout.org) once one is set up. Tracked in
    // PROJECT_HANDOFF.md → open questions.
    a: <>Email the admin at <a href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a> from the address on your account, and you'll get a one-time reset link. For your security, the link is only sent to an address confirmed to belong to the account owner.</>,
  },
  {
    q: "How do I contact the admin?",
    a: <>Log in and use <Link to="/contact">Contact</Link>. Replies appear on <Link to="/account/messages">My messages</Link>.</>,
  },
];

export function FaqPage() {
  useDocumentTitle("FAQ");
  return (
    <article className="prose-page">
      <h1>Frequently asked questions</h1>
      <div className="faq-list">
        {FAQS.map(({ q, a }) => (
          <details key={q} className="faq-item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </article>
  );
}
