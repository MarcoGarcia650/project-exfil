// Default action items auto-created when a user saves a program, looked up
// by the program's `format` (ProgramFormat enum). Keep each list to 2-3
// items — a quick starting checklist, not an exhaustive plan.
//
// Wording rule: never imply that training or a certificate guarantees a job.
export const actionItemTemplates = {
  TRAINING: [
    "Confirm the next cohort's application window and start date",
    "Check eligibility and what you need to submit (e.g. DD-214)",
    "Plan how you'll turn the training into applications: target roles and employers",
  ],
  CERTIFICATION_TRAINING: [
    "Confirm which certification exam this prepares you for and whether the voucher is covered",
    "Set a target exam date and a weekly study schedule",
    "List roles that ask for this certification and start tailoring your resume",
  ],
  FELLOWSHIP: [
    "Confirm eligibility and the application deadline for the next cohort",
    "Research past host companies or placements from this fellowship",
    "Prepare for a structured application: essays, interviews, references",
  ],
  INTERNSHIP: [
    "Check when this internship's next posting usually opens",
    "Find a referral or a past intern from this program",
    "Tailor your resume to the posting's stated qualifications",
  ],
  APPRENTICESHIP: [
    "Confirm the program length, pay, and what happens after it ends",
    "Check the eligibility rules (degree, citizenship, prior training) against your background",
    "Reach out to a program alum for insight into day-to-day expectations",
  ],
  DIRECT_HIRE: [
    "Read the posting's qualifications and note any gaps",
    "Connect with a current employee or recruiter on LinkedIn",
    "Translate your military experience into the posting's language on your resume",
  ],
};
