import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  Truck,
  Calendar,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  MapPin,
  Info,
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';

interface ReceiveProductModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiveProductModal({
  onClose,
  onSuccess,
}: ReceiveProductModalProps) {
  const { branch, logAudit } = useAppContext();
  
  const [receiptNumber] = useState(`RCP-${Date.now().toString().slice(-8)}`);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromBranch, setFromBranch] = useState('');
  const [toBranch] = useState(branch);
  const [transportMethod, setTransportMethod] = useState('Company Truck');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  
  const [items, setItems] = useState([
    {
      id: '1',
      productId: '',
      productName: '',
      sku: '',
      receivedQty: 0,
      unitOfMeasure: 'pcs',
      remarks: '',
    },
  ]);
  
  const [remarks, setRemarks] = useState('');

  const branches = ['Branch A', 'Branch B', 'Branch C'].filter(b => b !== branch);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        productId: '',
        productName: '',
        sku: '',
        receivedQty: 0,
        unitOfMeasure: 'pcs',
        remarks: '',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!fromBranch) {
      alert('Please select source branch');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one product to receive');
      return;
    }
    
    for (const item of items) {
      if (!item.productId || !item.productName) {
        alert('Please select product for all items');
        return;
      }
      if (item.receivedQty <= 0) {
        alert('Received quantity must be greater than 0');
        return;
      }
    }

    // Create receipt
    const receipt = {
      receiptNumber,
      receivedDate,
      fromBranch,
      toBranch,
      transportMethod,
      driverName,
      vehicleNumber,
      items,
      remarks,
      receivedBy: 'Current User',
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };

    console.log('Creating product receipt:', receipt);

    // Log audit
    logAudit({
      action: 'RECEIVE',
      category: 'PRODUCTS',
      description: `Received ${items.length} product(s) from ${fromBranch} to ${toBranch}`,
      metadata: { receiptNumber, fromBranch, toBranch, itemCount: items.length },
    });

    alert(`✅ Receipt ${receiptNumber} created successfully!\n\nProducts received from ${fromBranch} and stock updated.`);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Receive Products from Branch</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Receipt No: {receiptNumber}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info Alert */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Branch Transfer Only</p>
                <p className="text-sm text-blue-700 mt-1">
                  Products can only be received from other branches. For new production, use the production management system.
                </p>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Received Date *
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  From Branch *
                </label>
                <select
                  value={fromBranch}
                  onChange={(e) => setFromBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select source branch</option>
                  {branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  To Branch (Current)
                </label>
                <input
                  type="text"
                  value={toBranch}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Truck className="w-4 h-4 inline mr-1" />
                  Transport Method
                </label>
                <select
                  value={transportMethod}
                  onChange={(e) => setTransportMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Company Truck">Company Truck</option>
                  <option value="Third Party Courier">Third Party Courier</option>
                  <option value="Company Vehicle">Company Vehicle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Enter driver name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g., ABC-1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase">Products to Receive</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Product *
                          </label>
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                            placeholder="Enter or scan product"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            value={item.receivedQty || ''}
                            onChange={(e) => handleItemChange(item.id, 'receivedQty', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Unit
                          </label>
                          <select
                            value={item.unitOfMeasure}
                            onChange={(e) => handleItemChange(item.id, 'unitOfMeasure', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="pcs">Pieces</option>
                            <option value="boxes">Boxes</option>
                            <option value="pallets">Pallets</option>
                          </select>
                        </div>

                        <div className="md:col-span-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Remarks
                          </label>
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                            placeholder="Optional notes"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter any additional notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Receipt
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
