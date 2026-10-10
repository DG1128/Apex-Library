// Modern Lightweight Inline SVG Chart Renderers (Pure Math & SVG, Zero JS Chart Libraries)

function renderSparklineSVG(values, color = '#8b5cf6', width = 120, height = 36) {
  if (!values || values.length < 2) return '';

  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const padding = 4;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const points = values.map((val, i) => {
    const x = padding + (i / (values.length - 1)) * w;
    const y = height - padding - ((val - min) / (max - min)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polylineStr = points.join(' ');
  const lastPoint = points[points.length - 1].split(',');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg">
      <polyline fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polylineStr}" />
      <circle cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="3" fill="${color}" />
    </svg>
  `.trim();
}

function renderCirculationTrendSVG(days, width = 600, height = 220) {
  if (!days || days.length === 0) return '<div class="text-muted">No circulation trend data</div>';

  const padLeft = 40;
  const padBottom = 30;
  const padTop = 20;
  const padRight = 20;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allVals = days.flatMap(d => [d.issues, d.returns]);
  const maxVal = Math.max(...allVals, 5);

  // Issues curve points
  const issuePoints = days.map((d, i) => {
    const x = padLeft + (i / (days.length - 1)) * chartW;
    const y = padTop + chartH - (d.issues / maxVal) * chartH;
    return { x, y, val: d.issues, date: d.date };
  });

  // Returns curve points
  const returnPoints = days.map((d, i) => {
    const x = padLeft + (i / (days.length - 1)) * chartW;
    const y = padTop + chartH - (d.returns / maxVal) * chartH;
    return { x, y, val: d.returns, date: d.date };
  });

  const makePath = (pts) => {
    return pts.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
    }, '');
  };

  const issuePath = makePath(issuePoints);
  const returnPath = makePath(returnPoints);

  // X-axis labels
  const xLabels = days.map((d, i) => {
    const x = padLeft + (i / (days.length - 1)) * chartW;
    const shortDate = d.date.substring(5); // MM-DD
    return `<text x="${x}" y="${height - 8}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${shortDate}</text>`;
  }).join('');

  // Grid lines
  const gridLines = [0, 0.5, 1].map(ratio => {
    const y = padTop + chartH - ratio * chartH;
    const val = Math.round(ratio * maxVal);
    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--border-subtle)" stroke-dasharray="3,3" />
      <text x="${padLeft - 8}" y="${y + 3}" text-anchor="end" font-size="10" fill="var(--text-muted)">${val}</text>
    `;
  }).join('');

  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" class="chart-svg">
      ${gridLines}
      ${xLabels}
      <!-- Area fill for issues -->
      <path d="${issuePath} L ${width - padRight},${padTop + chartH} L ${padLeft},${padTop + chartH} Z" fill="rgba(139, 92, 246, 0.12)" />
      <!-- Lines -->
      <path d="${issuePath}" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" />
      <path d="${returnPath}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />
      <!-- Data dots -->
      ${issuePoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#8b5cf6"><title>Issues: ${p.val} on ${p.date}</title></circle>`).join('')}
      ${returnPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#10b981"><title>Returns: ${p.val} on ${p.date}</title></circle>`).join('')}
    </svg>
  `.trim();
}

function renderDonutChartSVG(categories, size = 180) {
  if (!categories || categories.length === 0) return '';

  const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#3b82f6'];
  const total = categories.reduce((sum, c) => sum + c.issues_count, 0) || 1;
  const radius = size * 0.38;
  const strokeWidth = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const slices = categories.slice(0, 5).map((cat, i) => {
    const percent = cat.issues_count / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return `
      <circle cx="${center}" cy="${center}" r="${radius}"
              fill="none" stroke="${colors[i % colors.length]}" stroke-width="${strokeWidth}"
              stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"
              transform="rotate(-90 ${center} ${center})">
        <title>${cat.category}: ${cat.issues_count} loans (${Math.round(percent * 100)}%)</title>
      </circle>
    `;
  }).join('');

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="donut-chart-svg">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="var(--border-subtle)" stroke-width="${strokeWidth}" />
      ${slices}
      <text x="${center}" y="${center - 2}" text-anchor="middle" font-size="16" font-weight="800" fill="var(--text-primary)">${total}</text>
      <text x="${center}" y="${center + 14}" text-anchor="middle" font-size="9" fill="var(--text-muted)" text-transform="uppercase">Total Loans</text>
    </svg>
  `.trim();
}

function renderHorizontalBars(departments) {
  if (!departments || departments.length === 0) return '<div class="text-muted">No department usage data</div>';

  const maxBorrows = Math.max(...departments.map(d => d.total_borrows), 1);

  return departments.slice(0, 6).map(d => {
    const percent = Math.round((d.total_borrows / maxBorrows) * 100);
    return `
      <div style="margin-bottom: 12px;">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:4px;">
          <span>${d.department}</span>
          <span style="color:var(--accent-primary);">${d.total_borrows} loans (${d.active_students || d.total_members || 0} students)</span>
        </div>
        <div style="height:8px; width:100%; background:var(--bg-input); border-radius:var(--radius-pill); overflow:hidden;">
          <div style="height:100%; width:${percent}%; background:var(--accent-gradient); border-radius:var(--radius-pill); transition:width 0.8s ease;"></div>
        </div>
      </div>
    `;
  }).join('');
}
