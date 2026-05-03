import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, Weight, Box, Ruler } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import type { Vehicle } from '@/src/types/logistics';
import {
  emptyTruckForm,
  fetchTruckFormById,
  createTruck,
  updateTruck,
  type TruckFormPayload,
} from '@/src/lib/fleetTrucks';

const STATUS_OPTIONS: Vehicle['status'][] = [
  'Available',
  'On Trip',
  'Loading',
  'Maintenance',
  'Out of Service',
];

export type TruckFormModalProps = React.Attributes & {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  /** Header branch name — must match `branches.name` */
  branchName: string;
  vehicleUuid?: string | null;
  /** If provided with edit mode, skips fetch (e.g. detail page already loaded row) */
  initialForm?: TruckFormPayload | null;
  onSaved: () => void;
};

function inputClass(disabled?: boolean) {
  return `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 ${disabled ? 'text-gray-500' : ''}`;
}

export function TruckFormModal({
  isOpen,
  onClose,
  mode,
  branchName,
  vehicleUuid,
  initialForm,
  onSaved,
}: TruckFormModalProps) {
  const [form, setForm] = useState<TruckFormPayload>(() => emptyTruckForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const run = async () => {
      if (mode === 'create') {
        setForm({ ...emptyTruckForm(), branchName: branchName.trim() });
        setLoadError(null);
        setLoading(false);
        return;
      }

      if (!vehicleUuid) {
        setLoadError('Missing truck id.');
        setLoading(false);
        return;
      }

      if (initialForm) {
        setForm(initialForm);
        setLoadError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      const { form: fetched, error } = await fetchTruckFormById(vehicleUuid);
      if (cancelled) return;
      setLoading(false);
      if (error) setLoadError(error);
      if (fetched) setForm(fetched);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, vehicleUuid, initialForm, branchName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === 'create') {
        const res = await createTruck(branchName, form);
        if (!res.ok) {
          window.alert(res.error ?? 'Could not add truck.');
          return;
        }
      } else {
        if (!vehicleUuid) {
          window.alert('Missing truck id.');
          return;
        }
        const res = await updateTruck(vehicleUuid, form);
        if (!res.ok) {
          window.alert(res.error ?? 'Could not update truck.');
          return;
        }
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const title = mode === 'create' ? 'Add truck' : 'Edit truck';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-0 sm:p-4">
      <div className="bg-white w-full max-w-full h-full max-h-screen sm:h-auto sm:max-w-3xl sm:max-h-[90vh] sm:rounded-lg shadow-xl flex flex-col relative overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 sm:rounded-t-lg px-4 sm:px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Branch: {branchName || '—'}
              {mode === 'edit' && form.vehicleId && (
                <span className="ml-2 text-gray-700">• {form.vehicleId}</span>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {loading && (
              <div className="flex items-center gap-2 text-gray-600 text-sm py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                Loading truck…
              </div>
            )}
            {loadError && !loading && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm px-3 py-2">{loadError}</div>
            )}

            {!loading && (
              <>
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Identity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle code</label>
                      <input
                        type="text"
                        className={inputClass()}
                        value={form.vehicleId}
                        onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                        placeholder="e.g. TRK-MNL-011"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Display name</label>
                      <input
                        type="text"
                        className={inputClass()}
                        value={form.vehicleName}
                        onChange={(e) => setForm((f) => ({ ...f, vehicleName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Plate number</label>
                      <input
                        type="text"
                        className={inputClass()}
                        value={form.plateNumber}
                        onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Vehicle specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-3">Basic information</p>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                          <input type="text" className={inputClass(true)} value="Truck" readOnly disabled />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Make</label>
                          <input
                            type="text"
                            className={inputClass()}
                            value={form.make}
                            onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                          <input
                            type="text"
                            className={inputClass()}
                            value={form.model}
                            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={inputClass()}
                            value={form.yearModel}
                            onChange={(e) => setForm((f) => ({ ...f, yearModel: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                          <input
                            type="text"
                            className={inputClass()}
                            value={form.color}
                            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Engine</label>
                          <input
                            type="text"
                            className={inputClass()}
                            value={form.engine}
                            onChange={(e) => setForm((f) => ({ ...f, engine: e.target.value }))}
                            placeholder="e.g. Diesel"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-3">Capacity & dimensions</p>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                            <Weight className="w-3 h-3 shrink-0" aria-hidden />
                            Max weight (kg)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className={inputClass()}
                            value={form.maxWeightKg}
                            onChange={(e) => setForm((f) => ({ ...f, maxWeightKg: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                            <Box className="w-3 h-3 shrink-0" aria-hidden />
                            Max volume (m³)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            className={inputClass()}
                            value={form.maxVolumeCbm}
                            onChange={(e) => setForm((f) => ({ ...f, maxVolumeCbm: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                            <Ruler className="w-3 h-3 shrink-0" aria-hidden />
                            Length (m)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className={inputClass()}
                            value={form.lengthM}
                            onChange={(e) => setForm((f) => ({ ...f, lengthM: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                            <Ruler className="w-3 h-3 shrink-0" aria-hidden />
                            Width (m)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className={inputClass()}
                            value={form.widthM}
                            onChange={(e) => setForm((f) => ({ ...f, widthM: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                            <Ruler className="w-3 h-3 shrink-0" aria-hidden />
                            Height (m)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className={inputClass()}
                            value={form.heightM}
                            onChange={(e) => setForm((f) => ({ ...f, heightM: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Operations</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {mode === 'edit' && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select
                          className={inputClass()}
                          value={form.status}
                          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Vehicle['status'] }))}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Maintenance due</label>
                      <input
                        type="date"
                        className={inputClass()}
                        value={form.maintenanceDue}
                        onChange={(e) => setForm((f) => ({ ...f, maintenanceDue: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Total distance (km)</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={inputClass()}
                        value={form.currentOdometerKm}
                        onChange={(e) => setForm((f) => ({ ...f, currentOdometerKm: e.target.value }))}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Registration & acquisition</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">OR/CR number</label>
                      <input
                        type="text"
                        className={inputClass()}
                        value={form.orcrNumber}
                        onChange={(e) => setForm((f) => ({ ...f, orcrNumber: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Registered (date)</label>
                      <input
                        type="date"
                        className={inputClass()}
                        value={form.registrationRecordedDate}
                        onChange={(e) => setForm((f) => ({ ...f, registrationRecordedDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Registration expiry</label>
                      <input
                        type="date"
                        className={inputClass()}
                        value={form.registrationExpiry}
                        onChange={(e) => setForm((f) => ({ ...f, registrationExpiry: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Acquired (date)</label>
                      <input
                        type="date"
                        className={inputClass()}
                        value={form.acquisitionDate}
                        onChange={(e) => setForm((f) => ({ ...f, acquisitionDate: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                      <input
                        type="text"
                        className={inputClass()}
                        value={form.branchName}
                        onChange={(e) => setForm((f) => ({ ...f, branchName: e.target.value }))}
                        placeholder="Must match branch name in directory"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    className={inputClass()}
                    value={form.notesText}
                    onChange={(e) => setForm((f) => ({ ...f, notesText: e.target.value }))}
                  />
                </section>
              </>
            )}
          </div>

          <div className="border-t border-gray-200 px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Add truck' : 'Save changes'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
