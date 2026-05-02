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
  Download,
  Navigation,
  Weight,
  Box,
  Ruler,
  XCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import type {
  TruckDetails,
  TripHistoryRecord,
  MaintenanceRecord,
  CalendarBooking,
  TruckAlert,
} from '@/src/mock/truckDetails';
import {
  fetchTruckDetailBundle,
  isFleetVehicleUuid,
  updateTruck,
  type TruckFormPayload,
} from '@/src/lib/fleetTrucks';
import type { Vehicle } from '@/src/types/logistics';

const TRUCK_STATUS_OPTIONS: Vehicle['status'][] = [
  'Available',
  'On Trip',
  'Loading',
  'Maintenance',
  'Out of Service',
];

const inlineInputClass =
  'w-full max-w-[16rem] px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500';

type TabMode = 'overview' | 'trips' | 'schedule' | 'maintenance';

export function TruckDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabMode>('overview');
  const [tripFilter, setTripFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truck, setTruck] = useState<TruckDetails | null>(null);
  const [tripHistory, setTripHistory] = useState<TripHistoryRecord[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);
  const [alerts, setAlerts] = useState<TruckAlert[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailForm, setDetailForm] = useState<TruckFormPayload | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editSnapshotRef = useRef<string | null>(null);
  const isEditingRef = useRef(false);

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
      setCalendarBookings([]);
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
      setCalendarBookings(bundle.calendarBookings);
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
    if (tripHistory.length === 0) return null;
    const onTime = tripHistory.filter((t) => t.status === 'Completed').length;
    return Math.round((onTime / tripHistory.length) * 100);
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

  const getStatusColor = (status: string) => {
    if (status === 'Available') return 'success';
    if (status === 'On Trip' || status === 'Loading') return 'warning';
    if (status === 'Maintenance' || status === 'Out of Service') return 'danger';
    return 'default';
  };

  // Filter trips
  const filteredTrips = tripHistory.filter(trip => {
    if (tripFilter === 'All') return true;
    return trip.status === tripFilter;
  });

  // Generate calendar for current month
  const generateCalendar = () => {
    const today = new Date('2026-02-26');
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendar: (Date | null)[] = [];
    
    // Add empty cells for days before the first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(new Date(year, month, day));
    }
    
    return calendar;
  };

  const calendar = generateCalendar();

  const getBookingForDate = (date: Date | null) => {
    if (!date) return null;
    const dateStr = date.toISOString().split('T')[0];
    return calendarBookings.find(b => b.date === dateStr);
  };

  const getDateColor = (date: Date | null, booking: any) => {
    if (!date) return '';
    const today = new Date('2026-02-26');
    const isPast = date < today;
    
    if (isPast) return 'bg-gray-100 text-gray-400';
    if (!booking || booking.type === 'Available') return 'bg-white hover:bg-gray-50';
    if (booking.type === 'Trip') {
      if (booking.status === 'In Transit' || booking.status === 'Loading') return 'bg-blue-100 text-blue-800 font-semibold';
      return 'bg-blue-50 text-blue-700';
    }
    if (booking.type === 'Maintenance') return 'bg-orange-100 text-orange-800';
    return 'bg-white';
  };

  const startEdit = () => {
    if (!detailForm || !vehicleId || !isFleetVehicleUuid(vehicleId)) return;
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
    { id: 'trips' as TabMode, label: 'Trip History', icon: <MapPin className="w-4 h-4" /> },
    { id: 'schedule' as TabMode, label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
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
          <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Trip
          </Button>
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
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Last Maintenance</p>
                          <p className="text-xs text-gray-600">{truck.lastMaintenanceDate}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Next Due</p>
                          <p className="text-xs text-gray-600">{truck.nextMaintenanceDue}</p>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      <Wrench className="w-3 h-3 mr-2" />
                      Schedule Maintenance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TRIP HISTORY TAB */}
        {activeTab === 'trips' && (
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 w-full">
                  <select
                    value={tripFilter}
                    onChange={(e) => setTripFilter(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="All">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Failed">Failed</option>
                  </select>
                  <div className="hidden sm:block flex-1" />
                  <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Trip History Table */}
            <Card>
              <CardHeader>
                <CardTitle>Trip History ({filteredTrips.length} trips)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Trip ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Driver</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Route</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Orders</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Distance</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Duration</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Fuel</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Revenue</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrips.map((trip) => (
                        <tr key={trip.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                              {trip.tripNumber}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">{trip.date}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{trip.driverName}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {trip.route.join(' → ')}
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-900">{trip.ordersCount}</td>
                          <td className="py-3 px-4 text-center text-sm text-gray-900">{trip.distance} km</td>
                          <td className="py-3 px-4 text-center text-sm text-gray-900">{trip.duration}</td>
                          <td className="py-3 px-4 text-center text-sm text-gray-900">{trip.fuelUsed}L</td>
                          <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                            ₱{trip.revenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={trip.status === 'Completed' ? 'success' : trip.status === 'Delayed' ? 'warning' : 'danger'}>
                              {trip.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-200">
                  {filteredTrips.map((trip) => (
                    <div key={trip.id} className="p-4 space-y-3 w-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <button className="text-sm font-medium text-blue-600 hover:text-blue-700 break-words text-left">
                            {trip.tripNumber}
                          </button>
                          <p className="text-xs text-gray-500 mt-1 break-words">{trip.date} • {trip.driverName}</p>
                        </div>
                        <Badge variant={trip.status === 'Completed' ? 'success' : trip.status === 'Delayed' ? 'warning' : 'danger'} className="flex-shrink-0">
                          {trip.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="col-span-2 min-w-0">
                          <p className="text-xs text-gray-500">Route</p>
                          <p className="text-gray-900 break-words">{trip.route.join(' → ')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Orders</p>
                          <p className="text-gray-900">{trip.ordersCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Distance</p>
                          <p className="text-gray-900">{trip.distance} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="text-gray-900">{trip.duration}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Fuel</p>
                          <p className="text-gray-900">{trip.fuelUsed}L</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Revenue</p>
                          <p className="text-gray-900 font-medium">₱{trip.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle>February 2026</CardTitle>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
                      <span className="text-gray-600">On Trip</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded" />
                      <span className="text-gray-600">Maintenance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-white border border-gray-300 rounded" />
                      <span className="text-gray-600">Available</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendar.map((date, index) => {
                    const booking = getBookingForDate(date);
                    const colorClass = getDateColor(date, booking);
                    
                    return (
                      <div
                        key={index}
                        className={`min-h-[72px] sm:min-h-[80px] p-1.5 sm:p-2 border rounded-lg ${colorClass} ${
                          date ? 'cursor-pointer transition-shadow hover:shadow-md' : ''
                        }`}
                      >
                        {date && (
                          <>
                            <p className="text-sm font-medium mb-1">{date.getDate()}</p>
                            {booking && booking.type !== 'Available' && (
                              <div className="text-xs">
                                {booking.type === 'Trip' ? (
                                  <>
                                    <p className="font-medium truncate">{booking.tripNumber}</p>
                                    <p className="text-gray-600 truncate">{booking.driver}</p>
                                  </>
                                ) : (
                                  <p className="font-medium">Maintenance</p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calendarBookings
                    .filter(b => new Date(b.date) >= new Date('2026-02-26'))
                    .slice(0, 5)
                    .map((booking, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {booking.type === 'Trip' ? (
                            <MapPin className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Wrench className="w-5 h-5 text-orange-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {booking.type === 'Trip' ? booking.tripNumber : 'Scheduled Maintenance'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {booking.date} {booking.driver && `• ${booking.driver}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={booking.type === 'Trip' ? 'warning' : 'danger'}>
                          {booking.status || booking.type}
                        </Badge>
                      </div>
                    ))}
                </div>
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
                  <Button variant="primary" size="sm" className="w-full sm:w-auto justify-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Maintenance Record
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {maintenanceHistory.map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            record.category === 'Preventive' ? 'bg-green-100' :
                            record.category === 'Corrective' ? 'bg-orange-100' :
                            'bg-red-100'
                          }`}>
                            <Wrench className={`w-5 h-5 ${
                              record.category === 'Preventive' ? 'text-green-600' :
                              record.category === 'Corrective' ? 'text-orange-600' :
                              'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{record.type}</p>
                            <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₱{record.cost.toLocaleString()}</p>
                          <Badge variant={
                            record.category === 'Preventive' ? 'success' :
                            record.category === 'Corrective' ? 'warning' :
                            'danger'
                          }>
                            {record.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-3 border-t border-gray-200 text-sm">
                        <div>
                          <span className="text-gray-500">Date</span>
                          <p className="font-medium text-gray-900">{record.date}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Mileage</span>
                          <p className="font-medium text-gray-900">{record.mileage.toLocaleString()} km</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Service Provider</span>
                          <p className="font-medium text-gray-900">{record.serviceProvider}</p>
                        </div>
                        {record.nextDue && (
                          <div>
                            <span className="text-gray-500">Next Due</span>
                            <p className="font-medium text-gray-900">{record.nextDue}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
