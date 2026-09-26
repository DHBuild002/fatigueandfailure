import { useState } from 'react';
import { distanceFromDisplay, distanceToDisplay, distanceUnit, formatNumber, saveCardio, setState, type State } from '../store';
import { PrimaryButton, Screen } from '../components/Screen';

interface Props {
  state: State;
  week: number;
  onBack: () => void;
}

const field = 'h-12 w-full min-w-0 rounded-xl bg-white border border-zinc-300 px-4 text-lg focus:outline-none focus:border-red-600';
const numField = `${field} text-xl text-center`;

export function Cardio({ state, week, onBack }: Props) {
  const existing = state.cardio[week];
  const du = distanceUnit(state.unit);
  const [type, setType] = useState(existing?.type ?? 'Run');
  const [minutes, setMinutes] = useState(existing ? String(existing.minutes) : '');
  const [distance, setDistance] = useState(
    existing?.distanceKm !== undefined ? formatNumber(distanceToDisplay(existing.distanceKm, state.unit)) : '',
  );

  const minutesN = parseInt(minutes, 10);
  const distanceN = parseFloat(distance.replace(',', '.'));
  const valid = type.trim() !== '' && Number.isInteger(minutesN) && minutesN > 0 && (distance.trim() === '' || distanceN >= 0);

  const save = () => {
    if (!valid) return;
    let distanceKm: number | undefined;
    if (distance.trim() !== '') {
      // Keep the stored value exact if the displayed distance wasn't touched.
      const unchanged = existing?.distanceKm !== undefined && distanceToDisplay(existing.distanceKm, state.unit) === distanceN;
      distanceKm = unchanged ? existing!.distanceKm : distanceFromDisplay(distanceN, state.unit);
    }
    saveCardio(week, { type: type.trim(), minutes: minutesN, distanceKm });
    onBack();
  };

  return (
    <Screen
      title="Weekly cardio"
      subtitle={`Week ${week}`}
      onBack={onBack}
      action={
        <PrimaryButton disabled={!valid} onClick={save}>
          {existing ? 'Save changes' : 'Save entry'}
        </PrimaryButton>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm text-zinc-600">Type</span>
          <input className={field} value={type} onChange={(e) => setType(e.target.value)} autoCapitalize="sentences" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-zinc-600">Duration (minutes)</span>
          <input className={numField} inputMode="numeric" pattern="[0-9]*" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-zinc-600">Distance ({du}, optional)</span>
          <input className={numField} inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </label>
        <button type="submit" hidden />
      </form>

      {existing && (
        <button
          type="button"
          className="h-12 w-full text-sm text-zinc-600 underline underline-offset-2"
          onClick={() => {
            setState((s) => {
              const cardio = { ...s.cardio };
              delete cardio[week];
              return { ...s, cardio };
            });
            onBack();
          }}
        >
          Remove this week's entry
        </button>
      )}
    </Screen>
  );
}
