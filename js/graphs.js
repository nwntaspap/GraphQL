/**
 * Graphs module — all charts drawn with raw SVG, no external libraries.
 *
 * Graph 1: XP Earned Over Time  (line/area chart)
 * Graph 2: Project Pass vs Fail  (donut / pie chart)
 * Graph 3: Top 10 Projects by XP (horizontal bar chart)
 */

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatXp(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
  return `${bytes} B`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

// ─── Graph 1: XP Over Time (line + area) ─────────────────────────────────────

export function renderXpOverTime(container, xpOverTime) {
  if (!xpOverTime || xpOverTime.length === 0) {
    container.innerHTML = '<p class="no-data">No XP transaction data available.</p>';
    return;
  }

  const W = 680,
    H = 320;
  const pad = { top: 30, right: 30, bottom: 70, left: 70 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const dates = xpOverTime.map((d) => d.date);
  const values = xpOverTime.map((d) => d.cumulative);

  const minDate = dates[0].getTime();
  const maxDate = dates[dates.length - 1].getTime();
  const maxVal = Math.max(...values);

  const scaleX = (d) => ((d.getTime() - minDate) / (maxDate - minDate || 1)) * innerW;
  const scaleY = (v) => innerH - (v / maxVal) * innerH;

  // Build polyline points
  const points = xpOverTime.map((d) => `${scaleX(d.date)},${scaleY(d.cumulative)}`).join(' ');

  // Area path (close to bottom)
  const first = xpOverTime[0];
  const last = xpOverTime[xpOverTime.length - 1];
  const areaPath =
    `M ${scaleX(first.date)},${scaleY(first.cumulative)} ` +
    xpOverTime.map((d) => `L ${scaleX(d.date)},${scaleY(d.cumulative)}`).join(' ') +
    ` L ${scaleX(last.date)},${innerH} L ${scaleX(first.date)},${innerH} Z`;

  // Y-axis ticks (5 steps)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val: maxVal * f,
    y: scaleY(maxVal * f),
  }));

  // X-axis ticks — max 5 labels to avoid overlap on wide date ranges
  const xTickCount = Math.min(5, xpOverTime.length);
  const xTickIndices = Array.from({ length: xTickCount }, (_, i) =>
    Math.round((i / (xTickCount - 1)) * (xpOverTime.length - 1))
  );
  const xTicks = [...new Set(xTickIndices)].map((i) => ({
    date: xpOverTime[i].date,
    x: scaleX(xpOverTime[i].date),
  }));

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="graph-svg" role="img" aria-label="XP earned over time">
      <defs>
        <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"/>
        </linearGradient>
        <clipPath id="graphClip">
          <rect x="0" y="0" width="${innerW}" height="${innerH}"/>
        </clipPath>
      </defs>

      <g transform="translate(${pad.left},${pad.top})">
        <!-- Grid lines + Y labels -->
        ${yTicks
          .map(
            (t) => `
          <line x1="0" y1="${t.y}" x2="${innerW}" y2="${t.y}" class="grid-line"/>
          <text x="-10" y="${t.y + 4}" class="axis-label" text-anchor="end">${formatXp(t.val)}</text>
        `
          )
          .join('')}

        <!-- X labels — rotated 45deg so dates never overlap -->
        ${xTicks
          .map(
            (t) => `
          <text
            x="${t.x}" y="${innerH + 14}"
            class="axis-label"
            text-anchor="end"
            transform="rotate(-40, ${t.x}, ${innerH + 14})"
          >${formatDate(t.date)}</text>
          <line x1="${t.x}" y1="${innerH}" x2="${t.x}" y2="${innerH + 6}" class="tick-line"/>
        `
          )
          .join('')}

        <!-- Area fill -->
        <path d="${areaPath}" fill="url(#xpGrad)" clip-path="url(#graphClip)" class="area-path"/>

        <!-- Line -->
        <polyline points="${points}" fill="none" class="line-path" clip-path="url(#graphClip)"/>

        <!-- Data point dots (only if few points) -->
        ${
          xpOverTime.length <= 40
            ? xpOverTime
                .map(
                  (d) => `
          <circle cx="${scaleX(d.date)}" cy="${scaleY(d.cumulative)}" r="3" class="dot"
            data-xp="${formatXp(d.cumulative)}" data-date="${formatDate(d.date)}">
            <title>${formatDate(d.date)}: ${formatXp(d.cumulative)} total</title>
          </circle>`
                )
                .join('')
            : ''
        }

        <!-- Axis borders -->
        <line x1="0" y1="0" x2="0" y2="${innerH}" class="axis-line"/>
        <line x1="0" y1="${innerH}" x2="${innerW}" y2="${innerH}" class="axis-line"/>
      </g>
    </svg>
  `;
}

// ─── Graph 2: Pass / Fail Donut ───────────────────────────────────────────────

export function renderPassFailDonut(container, passCount, failCount) {
  const total = passCount + failCount;

  if (total === 0) {
    container.innerHTML = '<p class="no-data">No result data available.</p>';
    return;
  }

  const W = 340,
    H = 320;
  const cx = 130,
    cy = 150,
    R = 110,
    r = 62;

  const passAngle = (passCount / total) * 2 * Math.PI;

  function polar(angle, radius) {
    return {
      x: cx + radius * Math.sin(angle),
      y: cy - radius * Math.cos(angle),
    };
  }

  function slicePath(startAngle, endAngle, outerR, innerR) {
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const o1 = polar(startAngle, outerR);
    const o2 = polar(endAngle, outerR);
    const i1 = polar(endAngle, innerR);
    const i2 = polar(startAngle, innerR);
    return [
      `M ${o1.x} ${o1.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
      `L ${i1.x} ${i1.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${i2.x} ${i2.y}`,
      'Z',
    ].join(' ');
  }

  const passPath = slicePath(0, passAngle, R, r);
  const failPath = passAngle < 2 * Math.PI ? slicePath(passAngle, 2 * Math.PI, R, r) : '';
  const passPercent = ((passCount / total) * 100).toFixed(1);

  // Legend x position
  const legendX = cx + R + 24;

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="graph-svg" role="img" aria-label="Pass vs Fail ratio">
      <!-- Pass slice -->
      ${passCount > 0 ? `<path d="${passPath}" class="donut-pass"><title>Pass: ${passCount} (${passPercent}%)</title></path>` : ''}
      <!-- Fail slice -->
      ${failCount > 0 ? `<path d="${failPath}" class="donut-fail"><title>Fail: ${failCount} (${(100 - parseFloat(passPercent)).toFixed(1)}%)</title></path>` : ''}

      <!-- Centre text -->
      <text x="${cx}" y="${cy - 10}" class="donut-center-big" text-anchor="middle">${passPercent}%</text>
      <text x="${cx}" y="${cy + 18}" class="donut-center-sub" text-anchor="middle">Pass rate</text>

      <!-- Legend -->
      <rect x="${legendX}" y="110" width="12" height="12" rx="3" class="legend-pass"/>
      <text x="${legendX + 18}" y="121" class="legend-label">Pass (${passCount})</text>

      <rect x="${legendX}" y="136" width="12" height="12" rx="3" class="legend-fail"/>
      <text x="${legendX + 18}" y="147" class="legend-label">Fail (${failCount})</text>

      <text x="${legendX}" y="180" class="legend-total">Total: ${total}</text>
    </svg>
  `;
}

// ─── Graph 3: Top Projects by XP (horizontal bars) ───────────────────────────

export function renderXpBarChart(container, xpByProjectArr) {
  if (!xpByProjectArr || xpByProjectArr.length === 0) {
    container.innerHTML = '<p class="no-data">No project XP data available.</p>';
    return;
  }

  const data = xpByProjectArr.slice(0, 10);
  const W = 680;
  const barH = 28;
  const gap = 10;
  const padLeft = 160;
  const padRight = 90;
  const padTop = 20;
  const H = padTop + data.length * (barH + gap) + 20;

  const maxXp = Math.max(...data.map((d) => d.xp));
  const innerW = W - padLeft - padRight;

  const bars = data
    .map((d, i) => {
      const bw = (d.xp / maxXp) * innerW;
      const y = padTop + i * (barH + gap);
      const labelX = padLeft - 10;
      const name = d.name.length > 22 ? d.name.slice(0, 21) + '…' : d.name;
      return `
      <g class="bar-group">
        <text x="${labelX}" y="${y + barH / 2 + 5}" class="bar-label" text-anchor="end">${name}</text>
        <rect x="${padLeft}" y="${y}" width="${bw}" height="${barH}" rx="4" class="bar-rect">
          <title>${d.name}: ${formatXp(d.xp)}</title>
        </rect>
        <text x="${padLeft + bw + 8}" y="${y + barH / 2 + 5}" class="bar-value">${formatXp(d.xp)}</text>
      </g>`;
    })
    .join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="graph-svg" role="img" aria-label="Top projects by XP">
      ${bars}
    </svg>
  `;
}
