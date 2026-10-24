import { useState } from 'react';
import { backupAgeText, downloadBackup, lastBackupAt } from '../backup';

interface Props {
  onClose: () => void;
}

// Shown on Home right after a workout is saved. Inline rather than a modal, like the rest
// of the app. A backup is a plain file download; the date of the last one is on this phone.
export function BackupPrompt({ onClose }: Props) {
  const [saved, setSaved] = useState(false);
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3" aria-label="Back up your data">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-red-950">{saved ? 'Backup downloaded' : 'Workout saved. Back up your data?'}</h2>
        <p className="text-sm text-red-950">
          {saved ? 'Keep the file somewhere safe, like Files or iCloud Drive.' : `Last backup: ${backupAgeText(lastBackupAt())}.`}
        </p>
      </div>
      {saved ? (
        <button type="button" onClick={onClose} className="h-12 w-full rounded-xl bg-white border border-red-200 font-medium text-red-950 active:bg-red-100">
          Done
        </button>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="h-12 flex-1 rounded-xl bg-white border border-red-200 font-medium text-red-950 active:bg-red-100">
            Not now
          </button>
          <button
            type="button"
            onClick={() => {
              downloadBackup();
              setSaved(true);
            }}
            className="h-12 flex-[2] rounded-xl bg-red-700 font-semibold text-white active:bg-red-800"
          >
            Download backup
          </button>
        </div>
      )}
    </section>
  );
}
