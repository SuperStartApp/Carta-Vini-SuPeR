import { servingModes, type ServingMode } from "../lib/pairing-mode";

export function PairingModeSelect({ mode, canGlass, onChange }: {
  mode: ServingMode; canGlass: boolean; onChange: (mode: ServingMode) => void;
}) {
  return <label className="max-w-48 text-sm">Servizio<select value={mode} onChange={event => onChange(event.target.value as ServingMode)}>
    {Object.entries(servingModes).map(([key, label]) => <option key={key} value={key}
      disabled={key !== "bottle" && !canGlass && key !== mode}>{label}</option>)}
  </select>{!canGlass && mode !== "bottle" && <span className="note">Mescita non disponibile</span>}</label>;
}
