import React, { useEffect, useRef, useState } from 'react';
import styles from './AnalyticsPanels.module.css';

// ---- formatting ----

export const formatCount = (n) => {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 10000) return `${Math.round(n / 1000)}K`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
};

export const formatShare = (share) =>
  share === null || share === undefined ? '—' : `${Math.round(share * 100)}%`;

export const formatDay = (day, options = { day: 'numeric', month: 'short' }) =>
  new Date(`${day.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });

export const formatMonth = (month, options = { month: 'short' }) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });

// ---- layout helpers ----

const useElementWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

// Clean integer ticks (counts only): about four steps from zero
const integerScale = (maxValue) => {
  if (maxValue <= 0) return { max: 1, ticks: [0, 1] };
  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  const step = Math.max(1, [1, 2, 5, 10].find((s) => s * magnitude * 4 >= maxValue) * magnitude);
  const max = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  return { max, ticks };
};

// Column with a 4px rounded data end and a square baseline
const columnPath = (x, top, width, base) => {
  const height = base - top;
  if (height <= 0) return '';
  const r = Math.min(4, height, width / 2);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + width - r}Q${x + width},${top} ${x + width},${top + r}V${base}Z`;
};

const Tooltip = ({ x, y, containerWidth, children }) => {
  // Keep the tooltip inside the chart: flip to the left of the pointer near the edge
  const flip = x > containerWidth - 160;
  return (
    <div
      className={styles.tooltip}
      style={{ left: flip ? undefined : x + 12, right: flip ? containerWidth - x + 12 : undefined, top: y }}
      role="status"
    >
      {children}
    </div>
  );
};

export const TooltipBody = ({ value, label, detail }) => (
  <>
    <strong className={styles.tooltipValue}>{value}</strong>
    <span className={styles.tooltipLabel}>{label}</span>
    {detail && <span className={styles.tooltipDetail}>{detail}</span>}
  </>
);

// ---- charts ----

const MARGIN = { top: 12, right: 12, bottom: 28, left: 36 };

// Horizontal gridlines with count labels; the zero line doubles as the baseline
const ValueAxis = ({ ticks, y, width }) =>
  ticks.map((t) => (
    <g key={t}>
      <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} className={t === 0 ? styles.axis : styles.grid} />
      <text x={MARGIN.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={styles.tick}>
        {formatCount(t)}
      </text>
    </g>
  ));

// Pin the first and last day labels inside the plot edges
const dayLabelAnchor = (i, last) => {
  if (i === 0) return 'start';
  if (i === last) return 'end';
  return 'middle';
};

/**
 * Column chart for counts over ordered categories. An optional `context`
 * value per column is drawn behind it in grey (e.g. the population the
 * highlighted value is out of).
 */
export const ColumnChart = ({ data, ariaLabel, renderTooltip, height = 200 }) => {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const { max, ticks } = integerScale(Math.max(0, ...data.map((d) => Math.max(d.value, d.context || 0))));
  const y = (v) => MARGIN.top + plotHeight - (v / max) * plotHeight;
  const base = y(0);
  const band = data.length ? plotWidth / data.length : 0;
  const barWidth = Math.min(24, band * 0.6);
  const labelEvery = Math.max(1, Math.ceil(40 / Math.max(band, 1)));

  return (
    <div className={styles.chart} ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <ValueAxis ticks={ticks} y={y} width={width} />
          {data.map((d, i) => {
            const x = MARGIN.left + band * i + (band - barWidth) / 2;
            return (
              <g key={d.key}>
                {d.context > 0 && (
                  <path d={columnPath(x, y(d.context), barWidth, base)} className={styles.contextMark} />
                )}
                <path
                  d={columnPath(x, y(d.value), barWidth, base)}
                  className={active === i ? styles.seriesMarkActive : styles.seriesMark}
                />
                {i % labelEvery === 0 && (
                  <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className={styles.tick}>
                    {d.label}
                  </text>
                )}
                <rect
                  x={MARGIN.left + band * i}
                  y={MARGIN.top}
                  width={band}
                  height={plotHeight}
                  className={styles.hitArea}
                  tabIndex={0}
                  aria-label={d.ariaLabel}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {active !== null && (
        <Tooltip
          x={MARGIN.left + band * active + band / 2}
          y={Math.max(0, y(Math.max(data[active].value, data[active].context || 0)) - 8)}
          containerWidth={width}
        >
          {renderTooltip(data[active])}
        </Tooltip>
      )}
    </div>
  );
};

/**
 * Daily line with an area wash and a crosshair that snaps to the nearest day.
 * Points with a null value are drawn as a gap (no data), not as zero.
 */
export const LineChart = ({ data, ariaLabel, renderTooltip, gapLabel, height = 220 }) => {
  const [ref, width] = useElementWidth();
  const [hovered, setActive] = useState(null);
  // The hovered index outlives a data change (e.g. a shorter date range
  // arriving while the pointer rests on the chart), so check it still points
  // at a plotted day before using it
  const active = hovered !== null && data[hovered] && data[hovered].value !== null ? hovered : null;

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const { max, ticks } = integerScale(Math.max(0, ...data.map((d) => d.value || 0)));
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const x = (i) => MARGIN.left + (data.length > 1 ? stepX * i : plotWidth / 2);
  const y = (v) => MARGIN.top + plotHeight - (v / max) * plotHeight;

  const firstTracked = data.findIndex((d) => d.value !== null);
  const tracked = firstTracked === -1 ? [] : data.slice(firstTracked);
  const linePath = tracked.map((d, i) => `${i ? 'L' : 'M'}${x(firstTracked + i)},${y(d.value)}`).join('');
  const areaPath = tracked.length
    ? `${linePath}L${x(data.length - 1)},${y(0)}L${x(firstTracked)},${y(0)}Z`
    : '';
  const last = data.length - 1;

  const indexAt = (clientX, rect) => {
    const i = Math.round((clientX - rect.left - MARGIN.left) / (stepX || 1));
    return Math.min(last, Math.max(firstTracked, i));
  };
  const handleKey = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = active === null ? last : active;
    const next = current + (event.key === 'ArrowRight' ? 1 : -1);
    setActive(Math.min(last, Math.max(firstTracked, next)));
  };

  const xLabels = [...new Set([Math.max(0, firstTracked), Math.round(last / 2), last])];

  return (
    <div className={styles.chart} ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <ValueAxis ticks={ticks} y={y} width={width} />
          {firstTracked > 0 && (
            <g>
              <line x1={x(firstTracked)} x2={x(firstTracked)} y1={MARGIN.top} y2={y(0)} className={styles.axis} />
              <text x={x(firstTracked) - 6} y={MARGIN.top + 10} textAnchor="end" className={styles.tick}>
                {gapLabel}
              </text>
            </g>
          )}
          {tracked.length > 0 && (
            <>
              <path d={areaPath} className={styles.areaWash} />
              <path d={linePath} className={styles.line} />
              <circle cx={x(last)} cy={y(data[last].value)} r={4} className={styles.endDot} />
            </>
          )}
          {xLabels.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 8}
              textAnchor={dayLabelAnchor(i, last)}
              className={styles.tick}
            >
              {formatDay(data[i].day)}
            </text>
          ))}
          {active !== null && (
            <>
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={y(0)} className={styles.crosshair} />
              <circle cx={x(active)} cy={y(data[active].value)} r={4} className={styles.endDot} />
            </>
          )}
          {tracked.length > 0 && (
            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={plotWidth}
              height={plotHeight}
              className={styles.hitArea}
              tabIndex={0}
              aria-label={`${ariaLabel}. Use the arrow keys to move between days.`}
              onMouseMove={(e) => setActive(indexAt(e.clientX, e.currentTarget.ownerSVGElement.getBoundingClientRect()))}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(last)}
              onBlur={() => setActive(null)}
              onKeyDown={handleKey}
            />
          )}
        </svg>
      )}
      {active !== null && (
        <Tooltip x={x(active)} y={Math.max(0, y(data[active].value) - 8)} containerWidth={width}>
          {renderTooltip(data[active])}
        </Tooltip>
      )}
    </div>
  );
};

/**
 * Horizontal bars for shares and stage counts. Every bar is labelled at its
 * tip, so no value is hover-only.
 */
export const BarList = ({ rows, ariaLabel }) => (
  <ul className={styles.barList} aria-label={ariaLabel}>
    {rows.map((row) => (
      <li key={row.label} className={styles.barRow}>
        <span className={styles.barLabel}>{row.label}</span>
        <span className={styles.barTrack} aria-hidden="true">
          <span className={styles.barFill} style={{ width: `${Math.min(1, row.fraction || 0) * 100}%` }} />
        </span>
        <span className={styles.barValue}>{row.value}</span>
      </li>
    ))}
  </ul>
);

export const Legend = ({ items }) => (
  <ul className={styles.legend}>
    {items.map((item) => (
      <li key={item.label}>
        <span className={`${styles.legendSwatch} ${styles[item.swatch]}`} aria-hidden="true" />
        {item.label}
      </li>
    ))}
  </ul>
);

export const TableView = ({ caption, columns, rows }) => (
  <details className={styles.tableView}>
    <summary>View as table</summary>
    <div className={styles.tableScroll}>
      <table>
        <caption className={styles.visuallyHidden}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </details>
);
