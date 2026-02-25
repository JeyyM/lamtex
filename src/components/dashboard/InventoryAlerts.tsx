import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { FinishedGoodsAlert, RawMaterialAlert } from '@/src/types/executive';
import { useAppContext } from '@/src/store/AppContext';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface InventoryAlertsProps {
  finishedGoods: FinishedGoodsAlert[];
  rawMaterials: RawMaterialAlert[];
}

export function InventoryAlerts({ finishedGoods, rawMaterials }: InventoryAlertsProps) {
  const { addAuditLog } = useAppContext();

  const handleScheduleBatch = (productName: string) => {
    addAuditLog('Scheduled Batch', 'Production', `Scheduled new batch for ${productName}`);
    alert(`Scheduled new batch for ${productName}`);
  };

  const handleTransferStock = (productName: string) => {
    addAuditLog('Transferred Stock', 'Inventory', `Initiated stock transfer for ${productName}`);
    alert(`Initiated stock transfer for ${productName}`);
  };

  const handlePurchaseRequest = (materialName: string) => {
    addAuditLog('Created PR', 'Procurement', `Created purchase request for ${materialName}`);
    alert(`Created purchase request for ${materialName}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Finished Goods Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {finishedGoods.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.productName}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Avg Weekly Sales: {item.avgWeeklySales} | Forecast (30d): {item.forecastNext30Days}
                    </p>
                  </div>
                  <Badge variant={item.riskLevel === 'High' ? 'danger' : item.riskLevel === 'Medium' ? 'warning' : 'success'}>
                    Stockout in {item.stockoutInDays} days
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => handleScheduleBatch(item.productName)}>
                    Schedule Batch
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTransferStock(item.productName)}>
                    Transfer Stock
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Raw Material Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {rawMaterials.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.materialName}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Current: {item.currentQty} {item.unit} | Est. Remaining: {item.estimatedDaysRemaining} days
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Affects: {item.linkedProductsAffected.join(', ')}
                    </p>
                  </div>
                  <Badge variant={item.riskLevel === 'High' ? 'danger' : item.riskLevel === 'Medium' ? 'warning' : 'success'}>
                    {item.riskLevel} Risk
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Suggest:</span> {item.suggestedReorderQty.toLocaleString()} {item.unit} by {item.suggestedReorderDate}
                  </div>
                  <Button variant="primary" size="sm" onClick={() => handlePurchaseRequest(item.materialName)}>
                    Schedule PR
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
