// Default action items auto-created when a user saves an employer,
// looked up by the employer's programType. Keep each list to 2-3 items —
// a quick starting checklist, not an exhaustive plan.
export const actionItemTemplates = {
  INTERNSHIP_PIPELINE: [
    "Research the program's application timeline",
    "Find a referral or alum from this program",
    "Tailor resume to the program's stated preferences",
  ],
  DIRECT_HIRE: [
    "Identify the specific team or role this employer typically hires veterans into",
    "Connect with a current employee or recruiter on LinkedIn",
    "Tailor resume to translate MOS/experience into the employer's job description language",
  ],
  APPRENTICESHIP: [
    "Confirm program length, certification, and DoD SkillBridge eligibility",
    "Check separation date against the program's application and start window",
    "Reach out to a program alum for insight into day-to-day expectations",
  ],
  FELLOWSHIP: [
    "Confirm SkillBridge/fellowship eligibility relative to your separation date",
    "Research past host companies or placements from this fellowship",
    "Prepare for the fellowship's application process — often more structured than a standard job application",
  ],
  OTHER: [
    "Join the organization's community (Slack, local chapter, mailing list)",
    "Identify one specific event or resource to engage with in the next 30 days",
    "Connect with a chapter lead or mentor for personalized guidance",
  ],
};
