import { useState } from 'react';
import { TOTAL_WEEKS, isDeload, type Exercise } from '../routine';
import { formatNumber, toDisplay, type State, type Unit } from '../store';
import { displayKg, projection, weeklyBests, workingSet, type Projection, type WeekBest } from '../progress';
import { Screen } from '../components/Screen';

interface Props {
  state: State;
  exercise: Exercise;
  onBack: () => void;
}

const fmt = (kg: number, unit: Unit) => `${formatNumber(displayKg(kg, unit))} ${unit}`;

export function Progress({ state, exercise, onBack }: Props) {
  const { unit } = state;
  const bests = weeklyBests(state.logs, exercise.id);
  const proj = projection(bests);
  const first = bests[0];
  const top = bests.reduce<WeekBest | undefined>((a, b) => (!a || b.e1rmKg > a.e1rmKg ? b : a), undefined);
  const perSide = exercise.perSide ? `/${exercise.perSide}` : '';

  return (
    <Screen title={exercise.name} subtitle="Progress" onBack={onBack}>
      {bests.length === 0 ? (
        <p className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-sm text-zinc-600">
          No weighted sets logged yet. Your progress chart starts after your first session.
        </p>
      ) : (
        <>
          <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-4 space-y-1" aria-label="Week 12 projection">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">By week {TOTAL_WEEKS}</p>
            {proj ? (
              <ProjectionSummary proj={proj} bests={bests} unit={unit} perSide={perSide} />
            ) : (
              <p className="text-sm text-zinc-600">
                {bests[bests.length - 1].week >= TOTAL_WEEKS
                  ? 'Block complete.'
                  : 'Log 2 weeks (outside deloads) to see where you could be by week 12.'}
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-4 space-y-3">
            <div>
              <h2 className="font-semibold">Estimated max, week by week</h2>
              <p className="text-xs text-zinc-500">From your best set each week (weight × reps, Epley formula).</p>
            </div>
            <Chart bests={bests} proj={proj} unit={unit} perSide={perSide} />
          </section>

          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Best set" value={`${fmt(top!.set.weightKg!, unit)} × ${top!.set.reps}${perSide}`} note={`Week ${top!.week}`} />
            <Stat
              label="Since start"
              value={bests.length > 1 ? signed(displayKg(top!.e1rmKg, unit) - displayKg(first.e1rmKg, unit), unit) : '–'}
              note={bests.length > 1 ? `est. max, ${signedPct((top!.e1rmKg / first.e1rmKg - 1) * 100)}` : 'Needs 2 weeks'}
            />
            <Stat label="Weeks logged" value={String(bests.length)} note={`of ${TOTAL_WEEKS}`} />
          </dl>

          <details className="text-sm">
            <summary className="cursor-pointer text-zinc-700 py-3">Show as a table</summary>
            <table className="w-full text-left tabular-nums">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="py-1 font-medium">Week</th>
                  <th className="py-1 font-medium">Best set</th>
                  <th className="py-1 font-medium text-right">Est. max</th>
                </tr>
              </thead>
              <tbody>
                {bests.map((b) => (
                  <tr key={b.week} className="border-t border-zinc-100">
                    <td className="py-1.5">
                      {b.week}
                      {isDeload(b.week) && <span className="text-xs text-zinc-500"> deload</span>}
                    </td>
                    <td className="py-1.5">
                      {fmt(b.set.weightKg!, unit)} × {b.set.reps}
                      {perSide}
                    </td>
                    <td className="py-1.5 text-right">{fmt(b.e1rmKg, unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Screen>
  );
}

function ProjectionSummary({ proj, bests, unit, perSide }: { proj: Projection; bests: WeekBest[]; unit: Unit; perSide: string }) {
  const ws = workingSet(proj.e1rmKg, bests, unit);
  const perWeek = displayKg(proj.perWeekKg, unit);
  return (
    <>
      <p className="text-2xl font-semibold tabular-nums">
        ≈ {fmt(ws.weightKg, unit)} × {ws.reps}
        {perSide}
      </p>
      <p className="text-sm text-zinc-700">
        Estimated max ~{fmt(proj.e1rmKg, unit)} if you keep this pace
        {perWeek > 0 ? ` (+${formatNumber(perWeek)} ${unit} a week).` : '. Beat your targets to bend the line up.'}
      </p>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-2">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-zinc-900">{value}</dd>
      <dd className="text-xs text-zinc-500">{note}</dd>
    </div>
  );
}

const signed = (n: number, unit: Unit) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatNumber(Math.abs(n))} ${unit}`;
const signedPct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.round(Math.abs(n))}%`;

// ---------- chart ----------

const W = 340;
const H = 200;
const PAD = { top: 24, right: 44, bottom: 26, left: 36 };
const RED = '#b91c1c';

// Round the y range out to clean 5/10-unit ticks.
function niceTicks(lo: number, hi: number): number[] {
  const span = Math.max(hi - lo, 1);
  const step = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].find((s) => span / s <= 4) ?? 100;
  const start = Math.floor(lo / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= hi + step * 0.001 || ticks.length < 2; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < hi) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

function Chart({ bests, proj, unit, perSide }: { bests: WeekBest[]; proj: Projection | null; unit: Unit; perSide: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const vals = bests.map((b) => toDisplay(b.e1rmKg, unit));
  const projEnd = proj ? toDisplay(proj.e1rmKg, unit) : undefined;
  const projStart = proj ? toDisplay(proj.fromKg, unit) : undefined;
  const all = [...vals, ...(projEnd !== undefined ? [projEnd, projStart!] : [])];
  const ticks = niceTicks(Math.min(...all) * 0.97, Math.max(...all) * 1.02);
  const [y0, y1] = [ticks[0], ticks[ticks.length - 1]];

  const x = (week: number) => PAD.left + ((week - 1) / (TOTAL_WEEKS - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);
  const colW = (W - PAD.left - PAD.right) / (TOTAL_WEEKS - 1);

  const line = bests.map((b, i) => `${i ? 'L' : 'M'}${x(b.week)},${y(vals[i])}`).join(' ');
  const sel = bests.find((b) => b.week === selected);
  const last = bests[bests.length - 1];

  const summary =
    `Estimated max rose from ${formatNumber(displayKg(bests[0].e1rmKg, unit))} to ${formatNumber(displayKg(last.e1rmKg, unit))} ${unit}` +
    ` over ${bests.length} logged weeks` +
    (proj ? `, projected ${formatNumber(displayKg(proj.e1rmKg, unit))} ${unit} by week ${TOTAL_WEEKS}.` : '.');

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label={summary}>
        {/* deload weeks */}
        {[4, 8, 12].map((w) => (
          <rect key={w} x={x(w) - colW / 2} y={PAD.top} width={colW} height={H - PAD.top - PAD.bottom} fill="#f4f4f5" />
        ))}
        {/* grid + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e4e4e7" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#71717a">
              {formatNumber(t)}
            </text>
          </g>
        ))}
        <text x={PAD.left - 6} y={10} textAnchor="end" fontSize={10} fill="#71717a">
          {unit}
        </text>
        {/* x labels */}
        {[1, 4, 8, 12].map((w) => (
          <text key={w} x={x(w)} y={H - 8} textAnchor="middle" fontSize={10} fill="#71717a">
            {w === 1 ? 'Wk 1' : w}
          </text>
        ))}
        {/* projection: same series, continued as a dashed line */}
        {proj && (
          <g>
            <line
              x1={x(proj.fromWeek)}
              y1={y(projStart!)}
              x2={x(TOTAL_WEEKS)}
              y2={y(projEnd!)}
              stroke={RED}
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
            <circle cx={x(TOTAL_WEEKS)} cy={y(projEnd!)} r={4} fill="#fff" stroke={RED} strokeOpacity={0.7} strokeWidth={2} />
            <text x={x(TOTAL_WEEKS) + 7} y={y(projEnd!)} dominantBaseline="middle" fontSize={10} fill="#3f3f46">
              ~{formatNumber(displayKg(proj.e1rmKg, unit))}
            </text>
          </g>
        )}
        {/* actual */}
        <path d={line} fill="none" stroke={RED} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {sel && <line x1={x(sel.week)} x2={x(sel.week)} y1={PAD.top} y2={H - PAD.bottom} stroke="#a1a1aa" strokeWidth={1} />}
        {bests.map((b, i) => (
          <circle key={b.week} cx={x(b.week)} cy={y(vals[i])} r={b.week === selected ? 6 : 4} fill={RED} stroke="#fff" strokeWidth={2} />
        ))}
        <text x={x(last.week) + 6} y={y(vals[vals.length - 1]) + 16} fontSize={10} fill="#3f3f46">
          {formatNumber(displayKg(last.e1rmKg, unit))}
        </text>
        {/* tap targets: one full-height column per logged week */}
        {bests.map((b) => (
          <rect
            key={`hit-${b.week}`}
            x={x(b.week) - colW / 2}
            y={0}
            width={colW}
            height={H}
            fill="transparent"
            onClick={() => setSelected(b.week === selected ? null : b.week)}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setSelected(b.week)}
          >
            <title>{`Week ${b.week}`}</title>
          </rect>
        ))}
      </svg>
      <div className="flex items-center gap-4 text-xs text-zinc-600" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8">
            <line x1="1" x2="17" y1="4" y2="4" stroke={RED} strokeWidth="2" strokeLinecap="round" />
          </svg>
          Logged
        </span>
        {proj && (
          <span className="flex items-center gap-1.5">
            <svg width="18" height="8">
              <line x1="1" x2="17" y1="4" y2="4" stroke={RED} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="5 4" />
            </svg>
            Projection
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-zinc-100 border border-zinc-200" />
          Deload
        </span>
      </div>
      <p className="text-sm text-zinc-700 min-h-5" aria-live="polite">
        {sel
          ? `Week ${sel.week}: ${fmt(sel.set.weightKg!, unit)} × ${sel.set.reps}${perSide}, est. max ${fmt(sel.e1rmKg, unit)}`
          : 'Tap a week for details.'}
      </p>
    </div>
  );
}
