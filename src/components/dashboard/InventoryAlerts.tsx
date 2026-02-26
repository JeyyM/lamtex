import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { FinishedGoodsAlert, RawMaterialAlert } from '@/src/types/executive';
import { useAppContext } from '@/src/store/AppContext';
import { AlertTriangle, ArrowRight, Package, ArrowRightLeft, ShoppingCart, X, User, Calendar, TrendingDown } from 'lucide-react';
import { getBranchById } from '@/src/mock/branches';

interface InventoryAlertsProps {
  finishedGoods: FinishedGoodsAlert[];
  rawMaterials: RawMaterialAlert[];
  showViewAll?: boolean;
}

export function InventoryAlerts({ finishedGoods, rawMaterials, showViewAll = false }: InventoryAlertsProps) {
  const navigate = useNavigate();
  const { addAuditLog, branch } = useAppContext();
  const [schedulingBatch, setSchedulingBatch] = useState<FinishedGoodsAlert | null>(null);
  const [transferringStock, setTransferringStock] = useState<FinishedGoodsAlert | null>(null);
  const [creatingPR, setCreatingPR] = useState<RawMaterialAlert | null>(null);

  const handleScheduleBatch = (item: FinishedGoodsAlert) => {
    setSchedulingBatch(item);
  };

  const confirmScheduleBatch = () => {
    if (!schedulingBatch) return;
    const branchData = getBranchById(schedulingBatch.branch || branch);
    addAuditLog('Scheduled Batch', 'Production', `Scheduled new batch for ${schedulingBatch.productName} at ${schedulingBatch.branch || branch}`);
    alert(`✅ Production batch scheduled!\n\n${branchData?.warehouseManager || 'Warehouse Manager'} will be notified.`);
    setSchedulingBatch(null);
  };

  const handleTransferStock = (item: FinishedGoodsAlert) => {
    setTransferringStock(item);
  };

  const confirmTransferStock = () => {
    if (!transferringStock) return;
    addAuditLog('Transferred Stock', 'Inventory', `Initiated stock transfer for ${transferringStock.productName}`);
    alert(`✅ Stock transfer initiated!\n\nWarehouse managers will be notified.`);
    setTransferringStock(null);
  };

  const handlePurchaseRequest = (item: RawMaterialAlert) => {
    setCreatingPR(item);
  };

  const confirmPurchaseRequest = () => {
    if (!creatingPR) return;
    const branchData = getBranchById(creatingPR.branch || branch);
    addAuditLog('Created PR', 'Procurement', `Created purchase request for ${creatingPR.materialName} - ${creatingPR.suggestedReorderQty} ${creatingPR.unit}`);
    alert(`✅ Purchase Request created!\n\n${branchData?.warehouseManager || 'Warehouse Manager'} and Procurement will be notified.`);
    setCreatingPR(null);
  };

  const getStockoutWarning = (days: number) => {
    if (days <= 3) return 'CRITICAL: Stockout imminent!';
    if (days <= 7) return 'WARNING: Stockout likely soon';
    return `Stockout risk in ${days} days`;
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-red-500" />
                Finished Goods Stock Alerts
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {finishedGoods.length} product{finishedGoods.length !== 1 ? 's' : ''} at risk
              </p>
            </div>
            {showViewAll && finishedGoods.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/products')}
                className="flex items-center gap-2"
              >
                View All Products
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {finishedGoods.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ✓ All products have healthy stock levels
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {finishedGoods.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{item.productName}</h4>
                          {item.branch && (
                            <Badge variant="outline" className="text-xs">{item.branch}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                          <div className="text-gray-500">
                            <TrendingDown className="w-3 h-3 inline mr-1" />
                            Avg weekly: <span className="font-medium text-gray-700">{item.avgWeeklySales} units</span>
                          </div>
                          <div className="text-gray-500">
                            Forecast (30d): <span className="font-medium text-gray-700">{item.forecastNext30Days} units</span>
                          </div>
                          {item.currentStock && (
                            <div className="text-gray-500">
                              Current stock: <span className="font-medium text-gray-700">{item.currentStock} units</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={item.riskLevel === 'High' ? 'danger' : item.riskLevel === 'Medium' ? 'warning' : 'success'}>
                        {item.riskLevel} Risk
                      </Badge>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                      <p className="text-sm font-medium text-red-800">
                        <AlertTriangle className="w-4 h-4 inline mr-1" />
                        {getStockoutWarning(item.stockoutInDays)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleScheduleBatch(item)}
                        className="flex items-center gap-1"
                      >
                        <Package className="w-4 h-4" />
                        Schedule Batch
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleTransferStock(item)}
                        className="flex items-center gap-1"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        Transfer Stock
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Raw Material Stock Alerts
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {rawMaterials.length} material{rawMaterials.length !== 1 ? 's' : ''} at risk
              </p>
            </div>
            {showViewAll && rawMaterials.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/products')}
                className="flex items-center gap-2"
              >
                View All Materials
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {rawMaterials.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ✓ All raw materials have healthy stock levels
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rawMaterials.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{item.materialName}</h4>
                          {item.branch && (
                            <Badge variant="outline" className="text-xs">{item.branch}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                          <div className="text-gray-500">
                            Current qty: <span className="font-medium text-gray-700">{item.currentQty.toLocaleString()} {item.unit}</span>
                          </div>
                          <div className="text-gray-500">
                            Days remaining: <span className="font-medium text-gray-700">{item.estimatedDaysRemaining}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            <strong>Affects products:</strong> {item.linkedProductsAffected.join(', ')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={item.riskLevel === 'High' ? 'danger' : item.riskLevel === 'Medium' ? 'warning' : 'success'}>
                        {item.riskLevel} Risk
                      </Badge>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                      <p className="text-sm text-yellow-800">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        <strong>Recommended:</strong> Order {item.suggestedReorderQty.toLocaleString()} {item.unit} by {item.suggestedReorderDate}
                      </p>
                    </div>

                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => handlePurchaseRequest(item)}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Create Purchase Request
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Batch Modal */}
      {schedulingBatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Schedule Production Batch</h3>
                  <p className="text-sm text-gray-500">{schedulingBatch.productName}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6 text-sm bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-medium">{schedulingBatch.currentStock || 'N/A'} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stockout in:</span>
                  <span className="font-medium text-red-600">{schedulingBatch.stockoutInDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Weekly Sales:</span>
                  <span className="font-medium">{schedulingBatch.avgWeeklySales} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Notify:</span>
                  <span className="font-medium">{getBranchById(schedulingBatch.branch || branch)?.warehouseManager}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSchedulingBatch(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1"
                  onClick={confirmScheduleBatch}
                >
                  Schedule & Notify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Stock Modal */}
      {transferringStock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <ArrowRightLeft className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Transfer Stock</h3>
                  <p className="text-sm text-gray-500">{transferringStock.productName}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Branch</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                    <option>Branch B</option>
                    <option>Branch C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    placeholder="Enter quantity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Arrival Date</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setTransferringStock(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={confirmTransferStock}
                >
                  Initiate Transfer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Request Modal */}
      {creatingPR && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Create Purchase Request</h3>
                  <p className="text-sm text-gray-500">{creatingPR.materialName}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6 text-sm bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Qty:</span>
                  <span className="font-medium">{creatingPR.currentQty} {creatingPR.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Remaining:</span>
                  <span className="font-medium text-red-600">{creatingPR.estimatedDaysRemaining} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suggested Qty:</span>
                  <span className="font-medium text-green-600">{creatingPR.suggestedReorderQty.toLocaleString()} {creatingPR.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suggested Date:</span>
                  <span className="font-medium">{creatingPR.suggestedReorderDate}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setCreatingPR(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={confirmPurchaseRequest}
                >
                  Create PR & Notify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
