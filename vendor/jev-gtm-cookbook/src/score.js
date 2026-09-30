// Everything here is plain code applied to Jev's saved answers. Change a weight
// or a cutoff in icp.json and the dashboard updates without a single new Jev call.

const topLevel = (answer) => Object.keys(answer.probabilities).length - 1;

export function fitParts(answers) {
  return {
    role_fit: answers.role_fit.score / topLevel(answers.role_fit),
    seniority: answers.seniority.score / topLevel(answers.seniority),
    likely_buyer: answers.likely_buyer.noul,
    company_fit: answers.company_fit.probabilities.fits ?? 0,
  };
}

// 0 to 100. A weighted average, so the weights do not need to add up to 1.
export function fitScore(answers, weights) {
  const parts = fitParts(answers);
  let total = 0, weightSum = 0;
  for (const [name, weight] of Object.entries(weights)) {
    if (!(name in parts)) continue;
    total += parts[name] * weight;
    weightSum += weight;
  }
  return weightSum ? Math.round((total / weightSum) * 100) : 0;
}

// Decide what to do about one detected change. Returns { action, reason }.
export function routeChange(change, answers, icp) {
  const { fit: fitCut, reach_out, review } = icp.cutoffs;
  const fit = fitScore(answers, icp.weights);

  if (change.kind === 'new_connection') {
    return fit >= fitCut
      ? { action: 'review', fit, reason: `New connection who fits your ICP (fit ${fit})` }
      : { action: 'ignore', fit, reason: `New connection, low fit (${fit})` };
  }

  const reworded = answers.change_type.probabilities.same_job_reworded ?? 0;
  if (reworded >= 0.5) return { action: 'ignore', fit, reason: 'Same job, title just reworded' };

  const signal = answers.current_role_buys.noul;
  const pct = Math.round(signal * 100);
  const gained = answers.new_budget_owner.noul >= 0.5 ? ', and they just gained the budget' : '';
  if (fit >= fitCut && signal >= reach_out) {
    return { action: 'reach_out', fit, signal, reason: `Fits your ICP (fit ${fit}) and the new role buys this (${pct}%)${gained}` };
  }
  if (fit >= fitCut || signal >= review) {
    return { action: 'review', fit, signal, reason: `Worth a look: fit ${fit}, new role buys ${pct}%` };
  }
  return { action: 'ignore', fit, signal, reason: `Low fit (${fit}) and the new role does not buy this (${pct}%)` };
}
