import { logout, getToken, decodeToken } from './auth.js';
import { fetchAllProfileData } from './api.js';
import { renderXpOverTime, renderXpBarChart, renderPassFailDonut } from './graphs.js';

export async function showProfileView() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('profile-view').classList.remove('hidden');

  // Skeleton while loading
  document.getElementById('profile-view').innerHTML = `
    <div class="profile-layout">
      <header class="profile-header">
        <div class="header-brand">Z01</div>
        <button id="logout-btn" class="logout-btn">Sign out</button>
      </header>
      <main class="profile-main">
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading your profile…</p>
        </div>
      </main>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', logout);

  try {
    const data = await fetchAllProfileData();
    renderProfile(document.getElementById('profile-view'), data);
  } catch (err) {
    document.querySelector('.profile-main').innerHTML = `
      <div class="error-state">
        <p class="error-title">Failed to load profile</p>
        <p class="error-msg">${err.message}</p>
        <button onclick="location.reload()" class="submit-btn" style="margin-top:1.5rem">Retry</button>
      </div>
    `;
  }
}

function renderProfile(profileView, data) {
  const token = getToken();
  const decoded = token ? decodeToken(token) : {};

  // Determine campus from path (e.g. "/athens/div-01/...")
  const samplePath = data.xpOverTime?.[0]?.path || '';
  const campus = samplePath.split('/')[1] || 'zone01';

  // const auditRatioPct = (data.auditRatio * 100).toFixed(0);
  const auditBar = Math.min(data.auditRatio, 2) / 2; // cap visual at 2.0 ratio

  const recentRows = (data.recentResults || [])
    .map((r) => {
      const name = r.object?.name || r.path.split('/').pop();
      const passed = r.grade >= 1;
      return `
        <tr>
          <td class="result-name">${name}</td>
          <td><span class="badge ${passed ? 'badge-pass' : 'badge-fail'}">${passed ? 'PASS' : 'FAIL'}</span></td>
          <td class="result-grade">${r.grade.toFixed(2)}</td>
          <td class="result-date">${new Date(r.createdAt).toLocaleDateString('en-GB')}</td>
        </tr>`;
    })
    .join('');

  profileView.innerHTML = `
    <div class="profile-layout">

      <header class="profile-header">
        <div class="header-brand">Z01</div>
        <nav class="header-nav">
          <a href="#identity" class="nav-link">Identity</a>
          <a href="#xp-audits" class="nav-link">XP &amp; Audits</a>
          <a href="#results" class="nav-link">Results</a>
          <a href="#stats" class="nav-link">Stats</a>
        </nav>
        <button id="logout-btn" class="logout-btn">Sign out</button>
      </header>

      <main class="profile-main">

        <!-- ── SECTION 1: Identity ───────────────────────────────────── -->
        <section class="profile-section" id="identity">
          <h2 class="section-title"><span class="title-num">01</span>Identity</h2>
          <div class="identity-card">
            <div class="avatar">${data.user.login.slice(0, 2).toUpperCase()}</div>
            <div class="identity-info">
              <p class="identity-login">${data.user.login}</p>
              <p class="identity-meta">User ID: <code>${data.user.id}</code></p>
              <p class="identity-meta">Campus: <code>${campus}</code></p>
              ${decoded.sub ? `<p class="identity-meta">JWT sub: <code>${decoded.sub}</code></p>` : ''}
            </div>
          </div>
        </section>

        <!-- ── SECTION 2: XP & Audits ────────────────────────────────── -->
        <section class="profile-section" id="xp-audits">
          <h2 class="section-title"><span class="title-num">02</span>XP &amp; Audits</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <p class="stat-label">Total XP</p>
              <p class="stat-value">${formatXp(data.totalXp)}</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Audit Ratio</p>
              <p class="stat-value">${Number(data.auditRatio).toFixed(2)}</p>
              <div class="audit-bar-track">
                <div class="audit-bar-fill" style="width: ${(auditBar * 100).toFixed(1)}%"></div>
              </div>
            </div>
            <div class="stat-card">
              <p class="stat-label">XP Given (Up)</p>
              <p class="stat-value">${formatXp(data.totalUp)}</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">XP Received (Down)</p>
              <p class="stat-value">${formatXp(data.totalDown)}</p>
            </div>
          </div>
        </section>

        <!-- ── SECTION 3: Recent Results ─────────────────────────────── -->
        <section class="profile-section" id="results">
          <h2 class="section-title"><span class="title-num">03</span>Recent Results</h2>
          ${
            recentRows
              ? `<div class="table-wrap">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Grade</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>${recentRows}</tbody>
                  </table>
                </div>`
              : '<p class="no-data">No results found.</p>'
          }
        </section>

        <!-- ── SECTION 4: Statistical Graphs ─────────────────────────── -->
        <section class="profile-section" id="stats">
          <h2 class="section-title"><span class="title-num">04</span>Statistics</h2>

          <div class="graph-block">
            <h3 class="graph-title">XP Earned Over Time</h3>
            <p class="graph-desc">Cumulative XP growth across your journey</p>
            <div id="graph-xp-time"></div>
          </div>

          <div class="graph-block">
            <h3 class="graph-title">Project Pass / Fail Ratio</h3>
            <p class="graph-desc">Overall project completion success rate</p>
            <div id="graph-passfail"></div>
          </div>

          <div class="graph-block">
            <h3 class="graph-title">Top Projects by XP</h3>
            <p class="graph-desc">Top 10 highest-earning projects</p>
            <div id="graph-xp-bar"></div>
          </div>
        </section>

      </main>

      <footer class="profile-footer">
        <p>Zone01 Athens · Student Profile · Built with GraphQL</p>
      </footer>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', logout);

  // Render graphs after DOM is ready
  requestAnimationFrame(() => {
    renderXpOverTime(document.getElementById('graph-xp-time'), data.xpOverTime);
    renderPassFailDonut(document.getElementById('graph-passfail'), data.passCount, data.failCount);
    renderXpBarChart(document.getElementById('graph-xp-bar'), data.xpByProjectArr);
  });
}

function formatXp(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
  return `${bytes} B`;
}
