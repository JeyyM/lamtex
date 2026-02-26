import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  FileText,
  Truck,
  Factory,
  Box,
  BarChart3,
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  getWarehouseKPIsByBranch,
  getFinishedGoodsByBranch,
  getRawMaterialsByBranch,
  getOrderFulfillmentByBranch,
  getProductionBatchesByBranch,
  getStockMovementsByBranch,
} from '@/src/mock/warehouseDashboard';


export function WarehouseDashboard() {
  const { branch } = useAppContext();
  const navigate = useNavigate();

  // Get branch-specific data (all data, no slicing)
  const finishedGoods = getFinishedGoodsByBranch(branch);
  const rawMaterials = getRawMaterialsByBranch(branch);
  const orderFulfillment = getOrderFulfillmentByBranch(branch);
  const productionBatches = getProductionBatchesByBranch(branch);
  const stockMovements = getStockMovementsByBranch(branch);

  // Calculate critical metrics for KPIs
  const criticalFinishedGoods = finishedGoods.filter(fg => fg.riskLevel === 'High');
  const criticalRawMaterials = rawMaterials.filter(rm => rm.riskLevel === 'High');
  const ordersWaitingStock = orderFulfillment.filter(o => o.fulfillmentStatus === 'Blocked').length;
  const ordersReadyToLoad = orderFulfillment.filter(o => o.fulfillmentStatus === 'Ready').length;
  const pendingBatches = productionBatches.filter(pb => pb.qaStatus === 'Pending').length;
  const inboundMovements = stockMovements.filter(sm => sm.type === 'In').length;
  const outboundMovements = stockMovements.filter(sm => sm.type === 'Out').length;

  // Stock health chart data
  const stockHealthData = [
    {
      category: 'Finished Goods',
      healthy: finishedGoods.filter(fg => fg.riskLevel === 'Low').length,
      warning: finishedGoods.filter(fg => fg.riskLevel === 'Medium').length,
      critical: finishedGoods.filter(fg => fg.riskLevel === 'High').length,
    },
    {
      category: 'Raw Materials',
      healthy: rawMaterials.filter(rm => rm.riskLevel === 'Low').length,
      warning: rawMaterials.filter(rm => rm.riskLevel === 'Medium').length,
      critical: rawMaterials.filter(rm => rm.riskLevel === 'High').length,
    },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'Ready') return 'success';
    if (status === 'Picking' || status === 'Packing') return 'warning';
    if (status === 'Blocked') return 'danger';
    return 'default';
  };

  const getRiskBadgeVariant = (risk: string) => {
    if (risk === 'High') return 'danger';
    if (risk === 'Medium') return 'warning';
    return 'success';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {branch === 'All' ? 'All Branches' : branch} • Real-time inventory and operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/warehouse')}>
            <FileText className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Finished Goods */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Finished Goods</p>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{finishedGoods.length}</p>
            <div className="flex items-center gap-2 mt-2">
              {criticalFinishedGoods.length > 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-xs text-red-600 font-medium">
                    {criticalFinishedGoods.length} below threshold
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-green-600 font-medium">All healthy</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Raw Materials Critical */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Raw Materials</p>
              <Box className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{criticalRawMaterials.length}</p>
            <p className="text-xs text-gray-500 mt-2">Critical items</p>
            {criticalRawMaterials.length > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-red-600 h-1.5 rounded-full"
                    style={{
                      width: `${(criticalRawMaterials.length / rawMaterials.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Waiting Stock */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Orders Blocked</p>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{ordersWaitingStock}</p>
            <p className="text-xs text-gray-500 mt-2">Awaiting stock</p>
          </CardContent>
        </Card>

        {/* Orders Ready to Load */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Ready to Load</p>
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{ordersReadyToLoad}</p>
            <p className="text-xs text-gray-500 mt-2">Approved orders</p>
          </CardContent>
        </Card>

        {/* Production Batches */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Production Queue</p>
              <Factory className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{pendingBatches}</p>
            <p className="text-xs text-gray-500 mt-2">Pending batches</p>
          </CardContent>
        </Card>

        {/* Incoming Materials */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Incoming</p>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{inboundMovements}</p>
            <p className="text-xs text-gray-500 mt-2">Materials today</p>
          </CardContent>
        </Card>

        {/* Outgoing Materials */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Outgoing</p>
              <TrendingDown className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{outboundMovements}</p>
            <p className="text-xs text-gray-500 mt-2">Deliveries today</p>
          </CardContent>
        </Card>

        {/* Stock Movements */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Movements</p>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stockMovements.length}</p>
            <p className="text-xs text-gray-500 mt-2">Total today</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Section */}
      {(criticalFinishedGoods.length > 0 || criticalRawMaterials.length > 0) && (
        <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-900">Critical Stock Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Critical Finished Goods */}
              {criticalFinishedGoods.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Finished Goods ({criticalFinishedGoods.length})
                  </h4>
                  <div className="space-y-2">
                    {criticalFinishedGoods.slice(0, 3).map((fg) => (
                      <div
                        key={fg.id}
                        className="bg-white rounded-lg p-3 border border-red-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">
                              {fg.productName}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">SKU: {fg.sku}</p>
                          </div>
                          <Badge variant="danger" size="sm">
                            {fg.daysOfCover} days
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Stock: </span>
                            <span className="font-medium text-red-600">
                              {fg.availableStock} {fg.currentStock > 0 ? 'units' : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Min: </span>
                            <span className="font-medium">{fg.minLevel}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Critical Raw Materials */}
              {criticalRawMaterials.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Raw Materials ({criticalRawMaterials.length})
                  </h4>
                  <div className="space-y-2">
                    {criticalRawMaterials.slice(0, 3).map((rm) => (
                      <div
                        key={rm.id}
                        className="bg-white rounded-lg p-3 border border-red-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">
                              {rm.materialName}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {rm.productsAffected.slice(0, 2).join(', ')}
                            </p>
                          </div>
                          <Badge variant="danger" size="sm">
                            {rm.daysRemaining} days
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Stock: </span>
                            <span className="font-medium text-red-600">
                              {rm.currentQty} {rm.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Safety: </span>
                            <span className="font-medium">{rm.safetyLevel}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(criticalFinishedGoods.length > 3 || criticalRawMaterials.length > 3) && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/warehouse')}
                >
                  View All Critical Items
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders Needing Loading */}
      {ordersReadyToLoad > 0 && (
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-green-600" />
                <CardTitle className="text-green-900">
                  Orders Ready for Loading ({ordersReadyToLoad})
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/warehouse?tab=orders')}
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orderFulfillment
                .filter((o) => o.fulfillmentStatus === 'Ready')
                .slice(0, 4)
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg p-4 border border-green-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.customer}</p>
                      </div>
                      <Badge variant="success">{order.fulfillmentStatus}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs mt-3">
                      <div>
                        <span className="text-gray-500">Summary: </span>
                        <span className="font-medium">{order.productsSummary}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Required: </span>
                        <span className="font-medium">{order.requiredDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Truck: </span>
                        <span className="font-medium text-green-600">
                          {order.truckAssigned || 'Not assigned'}
                        </span>
                      </div>
                    </div>
                    {order.truckAssigned && order.weightUtilization && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500">Load utilization:</p>
                          <p className="text-xs font-medium text-gray-900">{order.weightUtilization}%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              order.weightUtilization >= 80
                                ? 'bg-green-600'
                                : order.weightUtilization >= 60
                                ? 'bg-yellow-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${order.weightUtilization}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Waiting for Stock */}
      {ordersWaitingStock > 0 && (
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-orange-900">
                  Orders Awaiting Stock ({ordersWaitingStock})
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/warehouse?tab=orders')}
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orderFulfillment
                .filter((o) => o.fulfillmentStatus === 'Blocked')
                .slice(0, 4)
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg p-4 border border-orange-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.customer}</p>
                      </div>
                      <Badge variant="danger">{order.fulfillmentStatus}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs mt-3">
                      <div>
                        <span className="text-gray-500">Summary: </span>
                        <span className="font-medium">{order.productsSummary}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Required: </span>
                        <span className="font-medium">{order.requiredDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Priority: </span>
                        <Badge
                          variant={
                            order.urgency === 'High'
                              ? 'danger'
                              : order.urgency === 'Medium'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {order.urgency || 'Medium'}
                        </Badge>
                      </div>
                    </div>
                    {order.loadingDetails.filter(ld => ld.status === 'Out of Stock').length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Blocked items:</p>
                        <div className="flex flex-wrap gap-2">
                          {order.loadingDetails
                            .filter(ld => ld.status === 'Out of Stock')
                            .slice(0, 3)
                            .map((item, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"
                              >
                                {item.productName}
                              </span>
                            ))}
                          {order.loadingDetails.filter(ld => ld.status === 'Out of Stock').length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{order.loadingDetails.filter(ld => ld.status === 'Out of Stock').length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Readiness */}
      {pendingBatches > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-blue-600" />
                <CardTitle>Production Queue ({pendingBatches})</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/warehouse?tab=requests')}
              >
                View Schedule <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productionBatches
                .filter((pb) => pb.qaStatus === 'Pending')
                .slice(0, 4)
                .map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{batch.productName}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Batch: {batch.batchNumber}
                      </p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-sm font-medium text-gray-900">
                        {batch.plannedQty} units
                      </p>
                      <p className="text-xs text-gray-500">Target qty</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {batch.scheduledDate}
                      </p>
                      <p className="text-xs text-gray-500">Scheduled</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Health Overview Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Stock Health Overview
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Distribution of inventory by risk level
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={stockHealthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}
              />
              <Legend />
              <Bar dataKey="healthy" stackId="a" fill="#10B981" name="Healthy" />
              <Bar dataKey="warning" stackId="a" fill="#F59E0B" name="Warning" />
              <Bar dataKey="critical" stackId="a" fill="#EF4444" name="Critical" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
}
