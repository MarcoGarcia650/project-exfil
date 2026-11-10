import { RATE } from "./communityRules.js";

// DB-counted posting limit: counts the user's own rows in the window.
// `delegate` is a Prisma model (e.g. prisma.comment); `userField` is the
// column holding the user's id on that model.
// Returns an error message when the user is at the limit, else null.
export async function checkPostingLimit(delegate, userField, userId, kind) {
  const { limit, windowMs, label } = RATE[kind];
  const recent = await delegate.count({
    where: { [userField]: userId, createdAt: { gte: new Date(Date.now() - windowMs) } },
  });
  return recent >= limit ? `You've reached the limit of ${label}. Please try again later.` : null;
}
