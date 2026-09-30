import { createHash } from 'node:crypto';

// Bump this whenever a question's wording changes. It is part of the fingerprint,
// so old saved answers stop matching and records are judged again.
export const QUESTION_VERSION = 1;
// Versions the job-change questions separately, so rewording them only re-judges changed records.
export const CHANGE_QUESTION_VERSION = 2;

// What Jev sees. No names, emails or profile URLs: only the role, the company
// and your description of who you sell to.
export function buildState(icp, current, previous) {
  const state = {
    ideal_customer: icp.ideal_customer,
    connection: { current_position: current.position || 'unknown', current_company: current.company || 'unknown' },
  };
  // Only enriched records have this. It is what lets company_fit say more than "cannot tell".
  if (current.company_description) state.connection.company_description = current.company_description;
  if (previous) {
    state.previous = { position: previous.position || 'unknown', company: previous.company || 'unknown' };
  }
  return state;
}

export function buildQuestions(icp, hasPrevious) {
  const questions = {
    persona: {
      type: 'choice',
      instructions: 'Which group best describes the role in `connection.current_position`?',
      criteria: icp.personas,
    },
    seniority: {
      type: 'score',
      instructions: 'How senior is the role in `connection.current_position`?',
      criteria: [
        'A student, intern, or someone not currently working in a professional role',
        'An individual contributor who does the work and does not manage people or a budget',
        'A manager or team lead who runs a team and influences what that team buys',
        'A director, head of department or vice president who owns the budget for their function',
        'A founder, owner, partner or C-level executive who makes final buying decisions',
      ],
    },
    role_fit: {
      type: 'score',
      instructions:
        'How closely does the role in `connection.current_position` match the buyers described in `ideal_customer.target_roles`, given what is sold in `ideal_customer.what_we_sell`?',
      criteria: [
        'The role has nothing to do with the target roles or with the problem the product solves',
        'The role sits in a neighbouring function and would only hear about the problem second-hand',
        'The role works inside the target function and deals with the problem day to day',
        'The role is one of the target roles and would own the decision to solve the problem',
      ],
    },
    company_fit: {
      type: 'choice',
      instructions:
        'Judging from `connection.current_company` and, if given, `connection.company_description`, does the company match `ideal_customer.target_companies`?',
      criteria: {
        fits: 'The company is recognisably the kind of company described as a target',
        does_not_fit: 'The company is recognisably outside the target, or matches `ideal_customer.not_a_fit`',
        cannot_tell: 'The information given does not reveal what the company does or how big it is',
      },
    },
    likely_buyer: {
      type: 'noul',
      instructions:
        'Would the person in this role plausibly take part in deciding whether to buy what is described in `ideal_customer.what_we_sell`?',
      criteria: {
        true: 'They own, approve or strongly influence this kind of purchase',
        false: 'They would not be involved in this kind of purchase, or they match `ideal_customer.not_a_fit`',
      },
    },
  };
  if (!hasPrevious) return questions;

  // Asked in the same request, so a changed record still costs one call.
  return {
    ...questions,
    change_type: {
      type: 'choice',
      instructions: 'Compare the role in `previous` with the role in `connection`. What kind of change is this?',
      criteria: {
        moved_up: 'A step up in seniority, scope or responsibility',
        moved_sideways: 'A different job at a similar level of seniority',
        same_job_reworded: 'The same job and employer written differently, such as an abbreviation being spelled out',
        moved_down_or_unclear: 'A step down, a gap in employment, or not enough information to say',
      },
    },
    // Measured in cookbook/02: a broad "good time to reach out?" question could not tell cases
    // apart (42-73%). These two narrow ones separate them cleanly.
    new_budget_owner: {
      type: 'noul',
      instructions: 'Does the role in `connection` own a budget for what is described in `ideal_customer.what_we_sell` that the role in `previous` did not?',
      criteria: {
        true: 'The new role runs the function that would buy this, and the old role did not',
        false: 'Buying power for this is unchanged, lower, or was already there before',
      },
    },
    current_role_buys: {
      type: 'noul',
      instructions: 'Is the role in `connection` one whose holder decides whether to buy what is described in `ideal_customer.what_we_sell`?',
      criteria: {
        true: 'They run sales, revenue, growth or the whole company, so they would own this decision',
        false: 'Their function does not buy this, even if the role is senior',
      },
    },
  };
}

// Same role + same company + same ICP + same questions = same answer, whoever
// the person is. So the person is deliberately left out of the fingerprint.
export function fingerprint({ icpHash, model, current, previous }) {
  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const parts = [QUESTION_VERSION, model, icpHash, norm(current.position), norm(current.company)];
  // Added only when present, so records without enrichment keep their existing fingerprints.
  if (current.company_description) parts.push('desc', norm(current.company_description));
  if (previous) parts.push(CHANGE_QUESTION_VERSION, norm(previous.position), norm(previous.company));
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 24);
}
