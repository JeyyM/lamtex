import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  ArrowLeft,
  Truck,
  Calendar,
  Wrench,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  Edit,
  Navigation,
  Search,
  Weight,
  Box,
  Ruler,
  XCircle,
  Plus,
  Loader2,
  X,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import type {
  TruckDetails,
  TripHistoryRecord,
  MaintenanceRecord,
  TruckAlert,
} from '@/src/mock/truckDetails';
import {
  fetchTruckDetailBundle,
  isFleetVehicleUuid,
  updateTruck,
  scheduleMaintenance,
  confirmMaintenance,
  type TruckFormPayload,
  type ScheduleMaintenancePayload,
  type ConfirmMaintenancePayload,
} from '@/src/lib/fleetTrucks';
import type { Vehicle, Trip } from '@/src/types/logistics';
import { TripDetailsModal } from '@/src/components/logistics/TripDetailsModal';
import { fetchTripById, fetchTripForVehicleByTripNumber } from '@/src/lib/logisticsScheduling';
import {
  localYmd,
  DISPATCH_QUEUE_STATUS_OPTIONS,
  dispatchQueueStatusSelectClass,
  tripStatusDisplay,
  tripStatusIsCompletedUi,
  getDispatchVehicleColor,
  dispatchTableStatusBadgeVariant,
} from '@/src/lib/dispatchQueueUi';

const TRUCK_STATUS_OPTIONS: Vehicle['status'][] = [
  'Available',
  'On Trip',
  'Loading',
  'Maintenance',
  'Out of Service',
];

const inlineInputClass =
  'w-full max-w-[16rem] px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500';

type TabMode = 'overview' | 'trips' | 'maintenance';

export function TruckDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabMode>('overview');
  const [tripSearchQuery, setTripSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [tripRecordsTimeframe, setTripRecordsTimeframe] = useState<'all' | 'upcoming' | 'past'>('all');
  const [tripSortKey, setTripSortKey] = useState<string>('scheduledDate');
  const [tripSortDir, setTripSortDir] = useState<'asc' | 'desc'>('asc');
  const [truckStripDetailKey, setTruckStripDetailKey] = useState<string | null>(null);
  const [truckCalOpen, setTruckCalOpen] = useState(false);
  const [truckCalYear, setTruckCalYear] = useState(() => new Date().getFullYear());
  const [truckCalMonth, setTruckCalMonth] = useState(() => new Date().getMonth());
  const [truckCalSelectedKey, setTruckCalSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truck, setTruck] = useState<TruckDetails | null>(null);
  const [tripHistory, setTripHistory] = useState<TripHistoryRecord[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [alerts, setAlerts] = useState<TruckAlert[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailForm, setDetailForm] = useState<TruckFormPayload | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editSnapshotRef = useRef<string | null>(null);
  const isEditingRef = useRef(false);

  // ── Maintenance modals ───────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleMaintenancePayload>({
    description: '',
    scheduledDate: today,
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<MaintenanceRecord | null>(null);
  const [confirmForm, setConfirmForm] = useState<ConfirmMaintenancePayload>({
    completedDate: today,
    notes: '',
  });
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [tripDetailOpen, setTripDetailOpen] = useState(false);
  const [tripDetailTrip, setTripDetailTrip] = useState<Trip | null>(null);
  const [tripDetailLoading, setTripDetailLoading] = useState(false);

  /** Computed display status — 'Overdue' if past scheduled date and not completed. */
  const getDisplayStatus = (
    record: MaintenanceRecord,
  ): 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue' => {
    if (record.dbStatus === 'Completed') return 'Completed';
    if (record.scheduledDate && record.scheduledDate < today) return 'Overdue';
    return (record.dbStatus as 'Scheduled' | 'In Progress') ?? 'Scheduled';
  };

  const openScheduleModal = () => {
    setScheduleForm({
      description: '',
      scheduledDate: today,
    });
    setScheduleError(null);
    setShowScheduleModal(true);
  };

  const openConfirmModal = (record: MaintenanceRecord) => {
    setConfirmTarget(record);
    setConfirmForm({
      completedDate: today,
      notes: '',
    });
    setConfirmError(null);
    setShowConfirmModal(true);
  };

  const handleScheduleSave = async () => {
    if (!vehicleId || !isFleetVehicleUuid(vehicleId)) return;
    if (!scheduleForm.description.trim()) {
      setScheduleError('Description is required.');
      return;
    }
    if (!scheduleForm.scheduledDate) {
      setScheduleError('Scheduled date is required.');
      return;
    }
    setScheduleSaving(true);
    setScheduleError(null);
    const res = await scheduleMaintenance(vehicleId, scheduleForm);
    setScheduleSaving(false);
    if (!res.ok) {
      setScheduleError(res.error ?? 'Could not schedule maintenance.');
      return;
    }
    setShowScheduleModal(false);
    setRefreshKey((k) => k + 1);
  };

  const handleConfirmSave = async () => {
    if (!vehicleId || !confirmTarget) return;
    if (!confirmForm.completedDate) {
      setConfirmError('Completed date is required.');
      return;
    }
    setConfirmSaving(true);
    setConfirmError(null);
    const res = await confirmMaintenance(confirmTarget.id, vehicleId, confirmForm);
    setConfirmSaving(false);
    if (!res.ok) {
      setConfirmError(res.error ?? 'Could not confirm maintenance.');
      return;
    }
    setShowConfirmModal(false);
    setConfirmTarget(null);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    if (!vehicleId) {
      setLoading(false);
      return;
    }
    if (!isFleetVehicleUuid(vehicleId)) {
      setLoading(false);
      setLoadError('This URL needs a database truck id. Open the truck from Logistics → Fleet.');
      setTruck(null);
      setTripHistory([]);
      setMaintenanceHistory([]);
      setAlerts([]);
      setDetailForm(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const bundle = await fetchTruckDetailBundle(vehicleId);
      if (cancelled) return;
      setLoading(false);
      if (bundle.error) setLoadError(bundle.error);
      setTruck(bundle.truck);
      setTripHistory(bundle.tripHistory);
      setMaintenanceHistory(bundle.maintenanceHistory);
      setAlerts(bundle.alerts);
      if (!isEditingRef.current) {
        setDetailForm(bundle.editForm ?? null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, refreshKey]);

  const avgCapacityUsePct = useMemo(() => {
    const rates = tripHistory
      .map((t) => t.deliverySuccessRate)
      .filter((n): n is number => n != null && Number.isFinite(n) && n >= 0);
    if (rates.length === 0) return null;
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [tripHistory]);

  const onTimeRatePct = useMemo(() => {
    const terminal = tripHistory.filter((t) => ['Completed', 'Delayed', 'Failed'].includes(t.status));
    if (terminal.length === 0) return null;
    const onTime = terminal.filter((t) => t.status === 'Completed').length;
    return Math.round((onTime / terminal.length) * 100);
  }, [tripHistory]);

  /** Total distance (km): live value while editing form, else saved truck odometer. */
  const displayTotalDistanceKm = useMemo(() => {
    if (!truck) return 0;
    if (isEditing && detailForm) {
      const raw = detailForm.currentOdometerKm.trim();
      if (raw === '') return truck.totalDistance;
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : truck.totalDistance;
    }
    return truck.totalDistance;
  }, [truck, isEditing, detailForm]);

  const truckTripsByDateKey = useMemo(() => {
    const m: Record<string, TripHistoryRecord[]> = {};
    for (const t of tripHistory) {
      const key = t.date?.slice(0, 10) ?? '';
      if (!key) continue;
      if (!m[key]) m[key] = [];
      m[key].push(t);
    }
    return m;
  }, [tripHistory]);

  const nextFourteenCalendarDays = useMemo(() => {
    const out: { date: string; day: string; dayNum: number; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = localYmd(today);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const date = localYmd(d);
      out.push({
        date,
        day: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: date === todayKey,
      });
    }
    return out;
  }, []);

  const filteredSortedTrips = useMemo(() => {
    const todayYmd = localYmd(new Date());
    const q = tripSearchQuery.trim().toLowerCase();
    const filtered = tripHistory.filter((trip) => {
      const dk = (trip.date ?? '').slice(0, 10);
      const matchesTimeframe =
        tripRecordsTimeframe === 'all'
          ? true
          : !dk
            ? false
            : tripRecordsTimeframe === 'upcoming'
              ? dk >= todayYmd
              : dk < todayYmd;
      const matchesSearch =
        !q ||
        trip.tripNumber.toLowerCase().includes(q) ||
        trip.driverName.toLowerCase().includes(q) ||
        trip.route.some((d) => d.toLowerCase().includes(q));
      const matchesStatus =
        filterStatus === 'All' ||
        (trip.status === 'Completed' ? 'Complete' : trip.status) === filterStatus;
      return matchesTimeframe && matchesSearch && matchesStatus;
    });

    const vehicleLabel = truck?.vehicleName ?? '';
    return [...filtered].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (tripSortKey) {
        case 'vehicleName':
          av = `${vehicleLabel} ${a.driverName}`.toLowerCase();
          bv = `${vehicleLabel} ${b.driverName}`.toLowerCase();
          break;
        case 'scheduledDate':
          av = a.date || '';
          bv = b.date || '';
          break;
        case 'orders':
          av = a.ordersCount;
          bv = b.ordersCount;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        default:
          av = a.date || '';
          bv = b.date || '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return tripSortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return tripSortDir === 'asc' ? -1 : 1;
      if (as > bs) return tripSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [
    tripHistory,
    tripSearchQuery,
    filterStatus,
    tripRecordsTimeframe,
    tripSortKey,
    tripSortDir,
    truck?.vehicleName,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-600">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-red-500 mb-3" />
          <p className="text-sm">Loading truck…</p>
        </div>
      </div>
    );
  }

  if (!truck) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md px-4">
          <Truck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-xl font-semibold text-gray-900">Truck Not Found</p>
          {loadError && (
            <p className="text-sm text-red-600 mt-2">{loadError}</p>
          )}
          <p className="text-gray-500 mt-2">The truck you&apos;re looking for doesn&apos;t exist or is not a fleet truck.</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/logistics')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fleet
          </Button>
        </div>
      </div>
    );
  }

  const kmSinceLastMaintenance = Math.max(0, displayTotalDistanceKm - truck.mileageAtLastMaintenance);

  const lastCompletedMaintenance = maintenanceHistory
    .filter((r) => r.dbStatus === 'Completed')
    .sort((a, b) => (b.completedDate ?? '').localeCompare(a.completedDate ?? ''))
    [0] ?? null;

  const getStatusColor = (status: string) => {
    if (status === 'Available') return 'success';
    if (status === 'On Trip' || status === 'Loading') return 'warning';
    if (status === 'Maintenance' || status === 'Out of Service') return 'danger';
    return 'default';
  };

  const handleTripSort = (key: string) => {
    if (tripSortKey === key) setTripSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setTripSortKey(key);
      setTripSortDir('asc');
    }
  };
  const tripSortIcon = (col: string) => {
    if (tripSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return tripSortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-red-600 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-red-600 inline" />
    );
  };

  const tripHistoryStatusBadgeVariant = dispatchTableStatusBadgeVariant;

  const openTripDetailFromHistory = async (rec: TripHistoryRecord) => {
    setTripDetailLoading(true);
    const finish = () => setTripDetailLoading(false);
    try {
      if (rec.tripId) {
        const { trip, error } = await fetchTripById(rec.tripId);
        finish();
        if (error || !trip) {
          window.alert(error ?? 'Could not load trip.');
          return;
        }
        setTripDetailTrip(trip);
        setTripDetailOpen(true);
        return;
      }
      if (
        vehicleId &&
        isFleetVehicleUuid(vehicleId) &&
        rec.tripNumber &&
        rec.tripNumber !== '—'
      ) {
        const { trip, error } = await fetchTripForVehicleByTripNumber(vehicleId, rec.tripNumber);
        finish();
        if (!trip) {
          window.alert(
            error ??
              'This row is an archived snapshot without a linked trip record, so details are not available.',
          );
          return;
        }
        setTripDetailTrip(trip);
        setTripDetailOpen(true);
        return;
      }
      finish();
      window.alert(
        'This row is an archived snapshot without a linked trip record, so details are not available.',
      );
    } catch {
      finish();
      window.alert('Could not load trip.');
    }
  };

  const closeTripDetail = () => {
    setTripDetailOpen(false);
    setTripDetailTrip(null);
  };

  const startEdit = () => {
    editSnapshotRef.current = JSON.stringify(detailForm);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (editSnapshotRef.current) {
      try {
        setDetailForm(JSON.parse(editSnapshotRef.current) as TruckFormPayload);
      } catch {
        /* ignore corrupt snapshot */
      }
    }
    editSnapshotRef.current = null;
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!vehicleId || !detailForm) return;
    setSavingEdit(true);
    const res = await updateTruck(vehicleId, detailForm);
    setSavingEdit(false);
    if (!res.ok) {
      window.alert(res.error ?? 'Could not save truck.');
      return;
    }
    editSnapshotRef.current = null;
    setIsEditing(false);
    setRefreshKey((k) => k + 1);
  };

  const titleVehicleId = isEditing && detailForm ? detailForm.vehicleId : truck.vehicleId;
  const titleVehicleName = isEditing && detailForm ? detailForm.vehicleName : truck.vehicleName;
  const subtitlePlate = isEditing && detailForm ? detailForm.plateNumber : truck.plateNumber;

  const tabs = [
    { id: 'overview' as TabMode, label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'trips' as TabMode, label: 'Trip Records', icon: <MapPin className="w-4 h-4" /> },
    { id: 'maintenance' as TabMode, label: 'Maintenance', icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden px-4 md:px-6">
      {/* Header with Back Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 md:gap-4 min-w-0">
          <Button variant="outline" onClick={() => navigate('/logistics')} className="w-full sm:w-auto justify-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fleet
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 break-words min-w-0">
                {titleVehicleId} - {titleVehicleName}
              </h1>
              <Badge variant={getStatusColor(isEditing && detailForm ? detailForm.status : truck.status)} className="flex-shrink-0">
                {isEditing && detailForm ? detailForm.status : truck.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1 break-words">
              {subtitlePlate} • {(isEditing && detailForm ? `${detailForm.make} ${detailForm.model}` : `${truck.make} ${truck.model}`).trim() || '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {vehicleId && isFleetVehicleUuid(vehicleId) && detailForm && (
            <>
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto justify-center"
                    onClick={cancelEdit}
                    disabled={savingEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto justify-center bg-red-600 hover:bg-red-700"
                    onClick={saveEdit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center" onClick={startEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hero Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{truck.totalTrips}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500">Total Distance</p>
                {isEditing && detailForm ? (
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className="w-full min-w-0 max-w-[12rem] text-2xl font-bold text-gray-900 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      value={detailForm.currentOdometerKm}
                      onChange={(e) =>
                        setDetailForm((f) => (f ? { ...f, currentOdometerKm: e.target.value } : f))
                      }
                      aria-label="Total distance in kilometers"
                    />
                    <span className="text-lg font-medium text-gray-500">km</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">{truck.totalDistance.toLocaleString()} km</p>
                )}
              </div>
              <div className="p-3 bg-green-100 rounded-lg shrink-0 self-start">
                <Navigation className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              {kmSinceLastMaintenance.toLocaleString()} km since last maintenance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Utilization (Week)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{truck.utilizationPercent}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    alert.type === 'Critical' ? 'bg-red-50 border border-red-200' :
                    alert.type === 'Warning' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  {alert.type === 'Critical' ? (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : alert.type === 'Warning' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      alert.type === 'Critical' ? 'text-red-900' :
                      alert.type === 'Warning' ? 'text-yellow-900' :
                      'text-blue-900'
                    }`}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{alert.category} • {alert.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 w-full max-w-full">
        <div className="md:hidden pb-3">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as TabMode)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>
        <nav className="hidden md:flex gap-6 lg:gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabMode)}
              className={`
                flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="w-full max-w-full min-w-0">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Specifications */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Avg Capacity Use</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {avgCapacityUsePct != null ? `${avgCapacityUsePct}%` : '—'}
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-blue-600 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-500">On-Time Rate</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {onTimeRatePct != null ? `${onTimeRatePct}%` : '—'}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Vehicle Specifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing && detailForm ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle code</label>
                          <input
                            className={inlineInputClass}
                            value={detailForm.vehicleId}
                            onChange={(e) => setDetailForm((f) => (f ? { ...f, vehicleId: e.target.value } : f))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Display name</label>
                          <input
                            className={inlineInputClass}
                            value={detailForm.vehicleName}
                            onChange={(e) => setDetailForm((f) => (f ? { ...f, vehicleName: e.target.value } : f))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                          <select
                            className={inlineInputClass}
                            value={detailForm.status}
                            onChange={(e) =>
                              setDetailForm((f) =>
                                f ? { ...f, status: e.target.value as Vehicle['status'] } : f,
                              )
                            }
                          >
                            {TRUCK_STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Maintenance due</label>
                          <input
                            type="date"
                            className={inlineInputClass}
                            value={detailForm.maintenanceDue}
                            onChange={(e) => setDetailForm((f) => (f ? { ...f, maintenanceDue: e.target.value } : f))}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-4">Basic Information</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                            <input
                              type="text"
                              className={`${inlineInputClass} bg-gray-50 text-gray-700 cursor-not-allowed`}
                              value={truck.type}
                              readOnly
                              disabled
                              aria-readonly="true"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Make</label>
                            <input
                              className={inlineInputClass}
                              value={detailForm.make}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, make: e.target.value } : f))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                            <input
                              className={inlineInputClass}
                              value={detailForm.model}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, model: e.target.value } : f))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                            <input
                              className={inlineInputClass}
                              inputMode="numeric"
                              value={detailForm.yearModel}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, yearModel: e.target.value } : f))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                            <input
                              className={inlineInputClass}
                              value={detailForm.color}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, color: e.target.value } : f))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Engine</label>
                            <input
                              className={inlineInputClass}
                              value={detailForm.engine}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, engine: e.target.value } : f))}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-4">Capacity & Dimensions</p>
                        <div className="space-y-3">
                          <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
                              <Weight className="w-3 h-3" />
                              Max weight (kg)
                            </label>
                            <input
                              type="number"
                              min={0}
                              className={inlineInputClass}
                              value={detailForm.maxWeightKg}
                              onChange={(e) =>
                                setDetailForm((f) => (f ? { ...f, maxWeightKg: e.target.value } : f))
                              }
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
                              <Box className="w-3 h-3" />
                              Max volume (m³)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              className={inlineInputClass}
                              value={detailForm.maxVolumeCbm}
                              onChange={(e) =>
                                setDetailForm((f) => (f ? { ...f, maxVolumeCbm: e.target.value } : f))
                              }
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
                              <Ruler className="w-3 h-3" />
                              Length (m)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className={inlineInputClass}
                              value={detailForm.lengthM}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, lengthM: e.target.value } : f))}
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
                              <Ruler className="w-3 h-3" />
                              Width (m)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className={inlineInputClass}
                              value={detailForm.widthM}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, widthM: e.target.value } : f))}
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
                              <Ruler className="w-3 h-3" />
                              Height (m)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className={inlineInputClass}
                              value={detailForm.heightM}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, heightM: e.target.value } : f))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-4">Basic Information</p>
                      <div className="space-y-3">
                        <div className="flex justify-between gap-3">
                          <span className="text-sm text-gray-600">Type</span>
                          <span className="text-sm font-medium text-gray-900 text-right break-words min-w-0">{truck.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Make</span>
                          <span className="text-sm font-medium text-gray-900">{truck.make}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Model</span>
                          <span className="text-sm font-medium text-gray-900">{truck.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Year</span>
                          <span className="text-sm font-medium text-gray-900">{truck.yearModel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Color</span>
                          <span className="text-sm font-medium text-gray-900">{truck.color}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Engine</span>
                          <span className="text-sm font-medium text-gray-900">{truck.engineType}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-4">Capacity & Dimensions</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Weight className="w-3 h-3" />
                            Max Weight
                          </span>
                          <span className="text-sm font-medium text-gray-900">{truck.maxWeight} kg</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Box className="w-3 h-3" />
                            Max Volume
                          </span>
                          <span className="text-sm font-medium text-gray-900">{truck.maxVolume} m³</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Ruler className="w-3 h-3" />
                            Length
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {truck.dimensions.length != null ? `${truck.dimensions.length} m` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Ruler className="w-3 h-3" />
                            Width
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {truck.dimensions.width != null ? `${truck.dimensions.width} m` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Ruler className="w-3 h-3" />
                            Height
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {truck.dimensions.height != null ? `${truck.dimensions.height} m` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </CardContent>
              </Card>

              {/* Registration & Acquisition */}
              <Card>
                <CardHeader>
                  <CardTitle>Registration & Acquisition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-4">Registration Details</p>
                      {isEditing && detailForm ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Plate number</label>
                            <input
                              className={inlineInputClass}
                              value={detailForm.plateNumber}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, plateNumber: e.target.value } : f))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">OR/CR number</label>
                            <input
                              className={inlineInputClass}
                              value={detailForm.orcrNumber}
                              onChange={(e) => setDetailForm((f) => (f ? { ...f, orcrNumber: e.target.value } : f))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Registered</label>
                            <input
                              type="date"
                              className={inlineInputClass}
                              value={detailForm.registrationRecordedDate}
                              onChange={(e) =>
                                setDetailForm((f) =>
                                  f ? { ...f, registrationRecordedDate: e.target.value } : f,
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Registration expiry</label>
                            <input
                              type="date"
                              className={inlineInputClass}
                              value={detailForm.registrationExpiry}
                              onChange={(e) =>
                                setDetailForm((f) => (f ? { ...f, registrationExpiry: e.target.value } : f))
                              }
                            />
                          </div>
                        </div>
                      ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Plate Number</span>
                          <span className="text-sm font-medium text-gray-900">{truck.plateNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">OR/CR Number</span>
                          <span className="text-sm font-medium text-gray-900">{truck.orcrNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Registered</span>
                          <span className="text-sm font-medium text-gray-900">{truck.registrationDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Expires</span>
                          <span className="text-sm font-medium text-gray-900">{truck.registrationExpiry}</span>
                        </div>
                      </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-4">Acquisition</p>
                      {isEditing && detailForm ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Acquired</label>
                            <input
                              type="date"
                              className={inlineInputClass}
                              value={detailForm.acquisitionDate}
                              onChange={(e) =>
                                setDetailForm((f) => (f ? { ...f, acquisitionDate: e.target.value } : f))
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                            <input
                              type="text"
                              className={inlineInputClass}
                              value={detailForm.branchName}
                              onChange={(e) =>
                                setDetailForm((f) => (f ? { ...f, branchName: e.target.value } : f))
                              }
                              placeholder="e.g. Batangas"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Must match a branch name exactly (as in your branch directory).
                            </p>
                          </div>
                        </div>
                      ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Acquired</span>
                          <span className="text-sm font-medium text-gray-900">{truck.acquisitionDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Branch</span>
                          <span className="text-sm font-medium text-gray-900">{truck.branch}</span>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing && detailForm ? (
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      value={detailForm.notesText}
                      onChange={(e) => setDetailForm((f) => (f ? { ...f, notesText: e.target.value } : f))}
                    />
                  ) : (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {detailForm?.notesText?.trim() ? detailForm.notesText : '—'}
                    </p>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Right Column - Maintenance */}
            <div className="space-y-6">
              {/* Maintenance Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Last Maintenance</p>
                          <p className="text-xs text-gray-600">{truck.lastMaintenanceDate || '—'}</p>
                          {lastCompletedMaintenance?.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic leading-snug">
                              "{lastCompletedMaintenance.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        {truck.nextMaintenanceDue && truck.nextMaintenanceDue < today ? (
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Next Due</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-600">{truck.nextMaintenanceDue || '—'}</p>
                            {truck.nextMaintenanceDue && truck.nextMaintenanceDue !== '—' && truck.nextMaintenanceDue < today && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <Button variant="outline" size="sm" className="w-full justify-center" onClick={openScheduleModal}>
                        <Wrench className="w-3 h-3 mr-2" />
                        Schedule Maintenance
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Trip Records: dispatch strip + table */}
        {activeTab === 'trips' && truck && (
          <div className="space-y-4">
            {isFleetVehicleUuid(vehicleId ?? '') && (
              <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <CardTitle>Dispatch schedule (14 days)</CardTitle>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const t = new Date();
                          setTruckCalYear(t.getFullYear());
                          setTruckCalMonth(t.getMonth());
                          setTruckCalSelectedKey(localYmd(t));
                          setTruckCalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 bg-white"
                      >
                        <Calendar className="w-4 h-4 text-blue-600" />
                        View calendar
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                      {nextFourteenCalendarDays.map((day) => {
                        const dayTrips = truckTripsByDateKey[day.date] ?? [];
                        const colors = getDispatchVehicleColor(vehicleId ?? '');
                        return (
                          <div
                            key={day.date}
                            onClick={() => {
                              if (dayTrips.length === 0) return;
                              if (dayTrips.length === 1) {
                                void openTripDetailFromHistory(dayTrips[0]);
                                return;
                              }
                              setTruckStripDetailKey(day.date);
                            }}
                            className={`min-h-28 p-2 rounded-lg border transition-all ${
                              day.isToday
                                ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                                : 'bg-white border-gray-200'
                            } ${dayTrips.length > 0 ? 'hover:shadow-md cursor-pointer' : 'opacity-60'}`}
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-semibold ${day.isToday ? 'text-red-700' : 'text-gray-500'}`}>
                                  {day.day}
                                </span>
                                <span className={`text-sm font-bold ${day.isToday ? 'text-red-700' : 'text-gray-900'}`}>
                                  {day.dayNum}
                                </span>
                              </div>
                              <div className="flex-1 space-y-1 overflow-hidden">
                                {dayTrips.slice(0, 2).map((trip, tripIdx) => (
                                  <div
                                    key={trip.id + String(tripIdx)}
                                    role="presentation"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void openTripDetailFromHistory(trip);
                                    }}
                                    className="text-xs p-1.5 rounded cursor-pointer hover:opacity-90"
                                    style={{
                                      backgroundColor: colors.bg,
                                      borderLeft: `3px solid ${colors.border}`,
                                    }}
                                    title={`${trip.tripNumber} (${trip.driverName})`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <Truck className="w-3 h-3 flex-shrink-0" style={{ color: colors.text }} />
                                      <span className="font-medium truncate flex-1" style={{ color: colors.text }}>
                                        {trip.tripNumber}
                                      </span>
                                    </div>
                                    <div className="truncate text-[10px] mt-0.5" style={{ color: colors.text, opacity: 0.8 }}>
                                      {trip.driverName || '—'}
                                    </div>
                                  </div>
                                ))}
                                {dayTrips.length > 2 && (
                                  <div className="text-[10px] text-gray-500 text-center font-medium pt-0.5">
                                    +{dayTrips.length - 2} more
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <div className="relative flex-1 w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by trip #, driver, or stop…"
                    value={tripSearchQuery}
                    onChange={(e) => setTripSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 min-w-0">
                  <CardTitle className="text-lg">Trip records ({filteredSortedTrips.length})</CardTitle>
                  <div
                    className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-0.5 w-fit max-w-full"
                    role="group"
                    aria-label="Filter trips by schedule"
                  >
                    {(
                      [
                        ['all', 'All'],
                        ['upcoming', 'Upcoming'],
                        ['past', 'Past'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTripRecordsTimeframe(value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          tripRecordsTimeframe === value
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <select
                    aria-label="Filter trip records by status"
                    value={filterStatus === 'All' ? '' : filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value === '' ? 'All' : e.target.value)}
                    className={`${dispatchQueueStatusSelectClass} w-[min(100%,14rem)] md:hidden`}
                  >
                    <option value="">Status</option>
                    {DISPATCH_QUEUE_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s === 'Complete' ? 'Completed' : s}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredSortedTrips.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10 px-4">
                    {tripRecordsTimeframe === 'past'
                      ? 'No past trips for this truck with the current filters.'
                      : tripRecordsTimeframe === 'upcoming'
                        ? 'No upcoming trips for this truck with the current filters.'
                        : 'No trips match these filters. Assign routes on Logistics; they appear here for this truck.'}
                  </p>
                ) : (
                  <>
                    <div className="hidden md:block relative">
                      {tripDetailLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                          <Loader2 className="w-8 h-8 animate-spin text-red-500" aria-hidden />
                        </div>
                      )}
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th
                              onClick={() => handleTripSort('vehicleName')}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                            >
                              <span className="inline-flex items-center">
                                Vehicle & Driver{tripSortIcon('vehicleName')}
                              </span>
                            </th>
                            <th
                              onClick={() => handleTripSort('scheduledDate')}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                            >
                              <span className="inline-flex items-center">
                                Schedule{tripSortIcon('scheduledDate')}
                              </span>
                            </th>
                            <th
                              onClick={() => handleTripSort('orders')}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                            >
                              <span className="inline-flex items-center">
                                Orders{tripSortIcon('orders')}
                              </span>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-top min-w-[10.5rem] max-w-[14rem]">
                              <div className="normal-case">
                                <select
                                  aria-label="Filter trip records by status"
                                  value={filterStatus === 'All' ? '' : filterStatus}
                                  onChange={(e) => setFilterStatus(e.target.value === '' ? 'All' : e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={dispatchQueueStatusSelectClass}
                                >
                                  <option value="">Status</option>
                                  {DISPATCH_QUEUE_STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                      {s === 'Complete' ? 'Completed' : s}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredSortedTrips.map((trip) => {
                            const cap = trip.deliverySuccessRate != null && Number.isFinite(trip.deliverySuccessRate)
                              ? Math.round(trip.deliverySuccessRate)
                              : 0;
                            return (
                              <tr
                                key={trip.id}
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => void openTripDetailFromHistory(trip)}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-gray-400" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{truck.vehicleName}</div>
                                      <div className="text-xs text-gray-500">{trip.driverName || '—'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{trip.date}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {trip.ordersCount} order{trip.ordersCount !== 1 ? 's' : ''}
                                  </div>
                                  <div className="text-xs text-gray-500">{cap}% full</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge
                                    variant={tripHistoryStatusBadgeVariant(trip.status)}
                                    className="min-w-[120px] justify-center"
                                  >
                                    {trip.status}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden divide-y divide-gray-200 relative">
                      {tripDetailLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg min-h-[120px]">
                          <Loader2 className="w-8 h-8 animate-spin text-red-500" aria-hidden />
                        </div>
                      )}
                      {filteredSortedTrips.map((trip) => {
                        const cap = trip.deliverySuccessRate != null && Number.isFinite(trip.deliverySuccessRate)
                          ? Math.round(trip.deliverySuccessRate)
                          : 0;
                        return (
                          <div
                            key={trip.id}
                            className="p-4 space-y-3 w-full transition-colors cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                            onClick={() => void openTripDetailFromHistory(trip)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 break-words">{truck.vehicleName}</p>
                                <p className="text-xs text-gray-500 mt-1 break-words">
                                  {trip.ordersCount} order{trip.ordersCount !== 1 ? 's' : ''} • {trip.driverName || '—'}
                                </p>
                              </div>
                              <Badge
                                variant={tripHistoryStatusBadgeVariant(trip.status)}
                                className="flex-shrink-0"
                              >
                                {trip.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-gray-500">Driver</p>
                                <p className="text-gray-900 break-words">{trip.driverName || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Schedule</p>
                                <p className="text-gray-900">{trip.date}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-gray-500">Capacity</p>
                                <p className="text-gray-900">{cap}% full</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle>Maintenance History</CardTitle>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto justify-center bg-red-600 hover:bg-red-700"
                    onClick={openScheduleModal}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Maintenance
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {maintenanceHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Wrench className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No maintenance records yet</p>
                    <p className="text-xs mt-1">Use "Schedule Maintenance" to add one.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {maintenanceHistory.map((record) => {
                      const displayStatus = getDisplayStatus(record);
                      const isActionable = displayStatus !== 'Completed';
                      return (
                        <div
                          key={record.id}
                          className={`border rounded-lg p-4 transition-shadow hover:shadow-md ${
                            displayStatus === 'Overdue'
                              ? 'border-red-200 bg-red-50'
                              : displayStatus === 'Completed'
                              ? 'border-gray-200'
                              : 'border-orange-200 bg-orange-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3 gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div
                                className={`p-2 rounded-lg flex-shrink-0 ${
                                  record.category === 'Preventive'
                                    ? 'bg-green-100'
                                    : record.category === 'Corrective'
                                    ? 'bg-orange-100'
                                    : 'bg-red-100'
                                }`}
                              >
                                <Wrench
                                  className={`w-5 h-5 ${
                                    record.category === 'Preventive'
                                      ? 'text-green-600'
                                      : record.category === 'Corrective'
                                      ? 'text-orange-600'
                                      : 'text-red-600'
                                  }`}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <p className="font-semibold text-gray-900">{record.notes || record.type}</p>
                                  <Badge
                                    variant={
                                      displayStatus === 'Completed'
                                        ? 'success'
                                        : displayStatus === 'Overdue'
                                        ? 'danger'
                                        : 'warning'
                                    }
                                  >
                                    {displayStatus === 'Overdue' && (
                                      <AlertTriangle className="w-3 h-3 mr-1 inline" />
                                    )}
                                    {displayStatus}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 break-words">{record.notes}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-semibold text-gray-900">
                                {record.cost > 0 ? `₱${record.cost.toLocaleString()}` : '—'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pt-3 border-t border-gray-200 text-sm">
                            <div>
                              <span className="text-gray-500 text-xs">Scheduled</span>
                              <p className="font-medium text-gray-900">{record.scheduledDate ?? '—'}</p>
                            </div>
                            {record.completedDate && (
                              <div>
                                <span className="text-gray-500 text-xs">Completed</span>
                                <p className="font-medium text-green-700">{record.completedDate}</p>
                              </div>
                            )}
                            {record.serviceProvider && (
                              <div>
                                <span className="text-gray-500 text-xs">Vendor</span>
                                <p className="font-medium text-gray-900">{record.serviceProvider}</p>
                              </div>
                            )}
                            {record.mileage > 0 && (
                              <div>
                                <span className="text-gray-500 text-xs">Mileage</span>
                                <p className="font-medium text-gray-900">{record.mileage.toLocaleString()} km</p>
                              </div>
                            )}
                          </div>

                          {isActionable && (
                            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 justify-center"
                                onClick={() => openConfirmModal(record)}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                Confirm Maintenance Done
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Schedule Maintenance Modal ─────────────────────────────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-red-600" />
                <h2 className="text-base font-semibold text-gray-900">Schedule Maintenance</h2>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {scheduleError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {scheduleError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Oil change & filter replacement, brake inspection, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={scheduleForm.scheduledDate}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <Button variant="outline" size="sm" onClick={() => setShowScheduleModal(false)} disabled={scheduleSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleScheduleSave}
                disabled={scheduleSaving}
              >
                {scheduleSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Maintenance Modal ──────────────────────────────────────── */}
      {showConfirmModal && confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-base font-semibold text-gray-900">Confirm Maintenance Done</h2>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {/* Summary of the record being confirmed */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-1">
                <p className="font-medium text-gray-900">{confirmTarget.notes || confirmTarget.type}</p>
                <p className="text-gray-500">
                  {confirmTarget.category} •{' '}
                  Scheduled: {confirmTarget.scheduledDate ?? '—'}
                </p>
                {getDisplayStatus(confirmTarget) === 'Overdue' && (
                  <div className="flex items-center gap-1 mt-1 text-red-700 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    This maintenance is overdue
                  </div>
                )}
              </div>

              {confirmError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {confirmError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Completed <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={confirmForm.completedDate}
                  onChange={(e) => setConfirmForm((f) => ({ ...f, completedDate: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Can be any date — before or after scheduled date.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Any remarks about the completed maintenance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  value={confirmForm.notes ?? ''}
                  onChange={(e) => setConfirmForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <Button variant="outline" size="sm" onClick={() => setShowConfirmModal(false)} disabled={confirmSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleConfirmSave}
                disabled={confirmSaving}
              >
                {confirmSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Completed
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 14-day strip: pick trip for a day */}
      {truckStripDetailKey &&
        (() => {
          const [y, mo, d] = truckStripDetailKey.split('-').map(Number);
          const dateLabel = new Date(y, mo - 1, d).toLocaleDateString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const dayTrips = truckTripsByDateKey[truckStripDetailKey] ?? [];
          const colors = getDispatchVehicleColor(vehicleId ?? '');
          return (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setTruckStripDetailKey(null)}
            >
              <div
                className="bg-white rounded-xl shadow-xl w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-3">
                  <h3 className="font-bold text-gray-900 text-base">{dateLabel}</h3>
                  <button
                    type="button"
                    onClick={() => setTruckStripDetailKey(null)}
                    className="text-gray-400 hover:text-gray-600 shrink-0 p-1 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2">
                  {dayTrips.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      onClick={() => {
                        void openTripDetailFromHistory(trip);
                        setTruckStripDetailKey(null);
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <Truck className="w-4 h-4" style={{ color: colors.text }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{trip.tripNumber}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {truck?.vehicleName}
                          {trip.driverName ? ` · ${trip.driverName}` : ''}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border shrink-0 ${
                          tripStatusIsCompletedUi(trip.status)
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : trip.status === 'In Transit'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : trip.status === 'Loading'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : trip.status === 'Delayed'
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        {tripStatusDisplay(trip.status)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Full truck dispatch calendar */}
      {truckCalOpen &&
        (() => {
          const MONTH_NAMES = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ];
          const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const todayKey = localYmd(new Date());
          const firstDay = new Date(truckCalYear, truckCalMonth, 1);
          const lastDay = new Date(truckCalYear, truckCalMonth + 1, 0);
          const cells: (Date | null)[] = [];
          for (let i = 0; i < firstDay.getDay(); i++) cells.push(null);
          for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(truckCalYear, truckCalMonth, d));
          const shiftMonth = (delta: number) => {
            const d = new Date(truckCalYear, truckCalMonth + delta, 1);
            setTruckCalYear(d.getFullYear());
            setTruckCalMonth(d.getMonth());
          };
          const selectedTrips = truckCalSelectedKey ? truckTripsByDateKey[truckCalSelectedKey] ?? [] : [];
          const colors = getDispatchVehicleColor(vehicleId ?? '');
          return (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setTruckCalOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="truck-dispatch-cal-title"
                className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-gray-200">
                  <div>
                    <h2 id="truck-dispatch-cal-title" className="text-lg md:text-xl font-bold text-gray-900">
                      Dispatch calendar
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{truck?.vehicleName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRefreshKey((k) => k + 1)}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                      title="Refresh"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTruckCalOpen(false)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <select
                        value={truckCalMonth}
                        onChange={(e) => setTruckCalMonth(Number(e.target.value))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        {MONTH_NAMES.map((n, i) => (
                          <option key={n} value={i}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={truckCalYear}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (e.target.value !== '' && Number.isFinite(n)) setTruckCalYear(Math.trunc(n));
                        }}
                        className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        aria-label="Year"
                      />
                      <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                        aria-label="Next month"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {DAY_NAMES.map((d) => (
                      <div key={d} className="py-2">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((cell, idx) => {
                      if (!cell) return <div key={`pad-${idx}`} className="min-h-[4.5rem] rounded-lg bg-gray-50/50" />;
                      const cellKey = localYmd(cell);
                      const isToday = cellKey === todayKey;
                      const isSelected = cellKey === truckCalSelectedKey;
                      const dayTrips = truckTripsByDateKey[cellKey] ?? [];
                      const shown = dayTrips.slice(0, 2);
                      const overflow = dayTrips.length - shown.length;
                      return (
                        <button
                          key={cellKey}
                          type="button"
                          onClick={() =>
                            setTruckCalSelectedKey(cellKey === truckCalSelectedKey ? null : cellKey)
                          }
                          className={`min-h-[4.5rem] rounded-lg border p-1.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/60'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/20'
                          }`}
                        >
                          <div className={`text-sm font-semibold mb-0.5 ${isToday ? 'text-red-600' : 'text-gray-900'}`}>
                            {cell.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {shown.map((trip) => {
                              const chipColor = tripStatusIsCompletedUi(trip.status)
                                ? 'bg-green-600 text-white'
                                : trip.status === 'In Transit'
                                  ? 'bg-blue-600 text-white'
                                  : trip.status === 'Loading'
                                    ? 'bg-amber-500 text-white'
                                    : trip.status === 'Delayed'
                                      ? 'bg-red-500 text-white'
                                      : 'bg-gray-500 text-white';
                              return (
                                <div
                                  key={trip.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void openTripDetailFromHistory(trip);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void openTripDetailFromHistory(trip);
                                    }
                                  }}
                                  className={`truncate rounded px-0.5 py-0.5 text-[10px] leading-tight font-medium cursor-pointer ${chipColor}`}
                                  title={`${trip.tripNumber} · ${trip.driverName}`}
                                >
                                  {trip.tripNumber}
                                </div>
                              );
                            })}
                            {overflow > 0 && (
                              <div className="text-[10px] text-gray-500 font-medium text-center">+{overflow}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {truckCalSelectedKey && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        {(() => {
                          const [y, mo, d] = truckCalSelectedKey.split('-').map(Number);
                          return new Date(y, mo - 1, d).toLocaleDateString('en-PH', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          });
                        })()}
                      </h3>
                      {selectedTrips.length === 0 ? (
                        <p className="text-sm text-gray-500">No trips on this date.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {selectedTrips.map((trip) => (
                            <li key={trip.id}>
                              <button
                                type="button"
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                                onClick={() => {
                                  void openTripDetailFromHistory(trip);
                                  setTruckCalOpen(false);
                                }}
                              >
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: colors.bg }}
                                >
                                  <Truck className="w-4 h-4" style={{ color: colors.text }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 text-sm">{trip.tripNumber}</p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {truck?.vehicleName}
                                    {trip.driverName !== '—' ? ` · ${trip.driverName}` : ''}
                                  </p>
                                </div>
                                <span
                                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border shrink-0 ${
                                    tripStatusIsCompletedUi(trip.status)
                                      ? 'bg-green-100 text-green-800 border-green-300'
                                      : trip.status === 'In Transit'
                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                        : trip.status === 'Loading'
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : trip.status === 'Delayed'
                                            ? 'bg-red-100 text-red-800 border-red-300'
                                            : 'bg-gray-100 text-gray-800 border-gray-300'
                                  }`}
                                >
                                  {tripStatusDisplay(trip.status)}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 bg-gray-50 px-4 md:px-5 py-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setTruckCalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {tripDetailTrip && (
        <TripDetailsModal
          isOpen={tripDetailOpen}
          onClose={closeTripDetail}
          trip={tripDetailTrip}
          onEdit={() => {
            closeTripDetail();
            navigate('/logistics');
          }}
          onTripStatusChange={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
