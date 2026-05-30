const GRAPHQL_ENDPOINT = 'https://platform.zone01.gr/api/graphql-engine/v1/graphql';

/**
 * Core GraphQL request helper — attaches JWT Bearer token automatically
 */
async function graphqlRequest(query, variables = {}) {
  const token = localStorage.getItem('jwt_token');

  if (!token) throw new Error('No authentication token found. Please log in.');

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) throw new Error(`HTTP Network Error: ${response.status}`);

  const result = await response.json();
  if (result.errors) throw new Error(result.errors[0].message);

  return result.data;
}

// ─── QUERY TYPE 1: Normal query ──────────────────────────────────────────────
/**
 * Fetches basic user identification (id + login)
 */
export function getUserBasic() {
  const query = `{
     user {
      id
      login
    }
  }`;
  return graphqlRequest(query);
}

// ─── QUERY TYPE 2: Nested query ───────────────────────────────────────────────
/**
 * Fetches XP transactions nested inside the user table.
 * Also fetches audit-related transactions (up/down) for audit ratio.
 */
export async function getUserWithTransactions() {
  const query = `{
    user {
      id
      login
      transactions(
        where: { type: { _eq: "xp" } }
        order_by: { createdAt: asc }
      ) {
        id
        amount
        path
        createdAt
      }
    }
  }`;
  return graphqlRequest(query);
}

/**
 * Fetches audit transactions (up/down) nested inside the user table.
 */
export async function getUserWithAudits() {
  const query = `{
    user {
      id
      login
      auditRatio
      totalUp
      totalDown
    }
  }`;
  return graphqlRequest(query);
}

/**
 * Fetches results (pass/fail) nested inside the user table.
 * No type filter — the type column is often null in this platform.
 * We filter client-side after fetching.
 */
export async function getUserWithResults() {
  const query = `{
    user {
      id
      login
      results(
        order_by: { createdAt: desc }
      ) {
        id
        grade
        createdAt
        path
        object {
          name
          type
        }
      }
    }
  }`;
  return graphqlRequest(query);
}

/**
 * All-in-one fetch: gets everything needed for the profile page in parallel
 */
export async function fetchAllProfileData() {
  const [basicData, transactionData, auditData, resultsData] = await Promise.all([
    getUserBasic(),
    getUserWithTransactions(),
    getUserWithAudits(),
    getUserWithResults(),
  ]);

  const user = basicData.user[0];
  const userWithTx = transactionData.user[0];
  const userWithAudits = auditData.user[0];
  const userWithResults = resultsData.user[0];

  // Total XP
  const totalXp = userWithTx.transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // XP over time (for line graph)
  let cumulative = 0;
  const xpOverTime = userWithTx.transactions.map((tx) => {
    cumulative += tx.amount;
    return { date: new Date(tx.createdAt), cumulative, amount: tx.amount, path: tx.path };
  });

  // XP per project (for bar graph) — extract project name from path
  const xpByProject = {};
  userWithTx.transactions.forEach((tx) => {
    const parts = tx.path.split('/');
    const name = parts[parts.length - 1] || tx.path;
    xpByProject[name] = (xpByProject[name] || 0) + tx.amount;
  });
  const xpByProjectArr = Object.entries(xpByProject)
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10); // top 10

  // Pass/fail from results
  const allResults = userWithResults.results || [];

  // Keep only top-level projects: path has exactly 3 segments e.g. /athens/div-01/graphql
  // Exercises and piscine tasks have deeper paths like /athens/div-01/piscine-js/node/foo
  const projectResults = allResults.filter((r) => r.path.split('/').length === 4);

  // Keep only the latest attempt per project (results are already ordered by createdAt desc)
  const seen = new Set();
  const results = projectResults.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });

  const passCount = results.filter((r) => r.grade >= 1).length;
  const failCount = results.filter((r) => r.grade < 1).length;

  return {
    user,
    totalXp,
    xpOverTime,
    xpByProjectArr,
    auditRatio: userWithAudits.auditRatio ?? 0,
    totalUp: userWithAudits.totalUp ?? 0,
    totalDown: userWithAudits.totalDown ?? 0,
    passCount,
    failCount,
    recentResults: results.slice(0, 8),
  };
}
