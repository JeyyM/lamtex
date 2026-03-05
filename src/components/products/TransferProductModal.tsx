import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  ArrowRightLeft,
  Truck,
  CheckCircle,
  X,
  Plus,
  MapPin,
  Calendar,
  Info,
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';

interface TransferProductModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferProductModal({
  onClose,
  onSuccess,
}: TransferProductModalProps) {
  const { branch, logAudit } = useAppContext();
  
  const [transferNumber] = useState(`PTR-${Date.now().toString().slice(-8)}`);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromBranch] = useState(branch);
  const [toBranch, setToBranch] = useState('');
  const [transportMethod, setTransportMethod] = useState('Company Truck');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  
  const [items, setItems] = useState([
    {
      id: '1',
      productId: '',
      productName: '',
      sku: '',
      transferQty: 0,
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
        transferQty: 0,
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
    if (!toBranch) {
      alert('Please select destination branch');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one product to transfer');
      return;
    }
    
    for (const item of items) {
      if (!item.productId || !item.productName) {
        alert('Please select product for all items');
        return;
      }
      if (item.transferQty <= 0) {
        alert('Transfer quantity must be greater than 0');
        return;
      }
    }

    // Create transfer
    const transfer = {
      transferNumber,
      transferDate,
      fromBranch,
      toBranch,
      transportMethod,
      driverName,
      vehicleNumber,
      estimatedArrival,
      items,
      remarks,
      initiatedBy: 'Current User',
      status: 'In Transit',
      createdAt: new Date().toISOString(),
    };

    console.log('Creating product transfer:', transfer);

    // Log audit
    logAudit({
      action: 'TRANSFER',
      category: 'PRODUCTS',
      description: `Initiated transfer ${transferNumber} - ${items.length} product(s) from ${fromBranch} to ${toBranch}`,
      metadata: { transferNumber, fromBranch, toBranch, itemCount: items.length },
    });

    alert(`✅ Transfer ${transferNumber} initiated successfully!\n\nProducts are now in transit from ${fromBranch} to ${toBranch}.`);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
      <Card className="w-full h-full md:w-auto md:h-auto md:max-w-4xl md:max-h-[85vh] flex flex-col md:rounded-xl">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-white flex-shrink-0 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className="p-1.5 md:p-2 bg-orange-600 rounded-lg flex-shrink-0">
                <ArrowRightLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base md:text-xl truncate">Transfer Products to Branch</CardTitle>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 truncate">Transfer No: {transferNumber}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Info Alert */}
            <div className="p-3 md:p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2 md:gap-3">
              <Info className="w-4 h-4 md:w-5 md:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs md:text-sm font-medium text-orange-900">Inter-Branch Transfer Only</p>
                <p className="text-xs md:text-sm text-orange-700 mt-0.5 md:mt-1">
                  This transfers products from your current branch to another branch location.
                </p>
              </div>
            </div>

            {/* Transfer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Transfer Date *
                </label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  From Branch (Current)
                </label>
                <input
                  type="text"
                  value={fromBranch}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  To Branch *
                </label>
                <select
                  value={toBranch}
                  onChange={(e) => setToBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Select destination branch</option>
                  {branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Truck className="w-4 h-4 inline mr-1" />
                  Transport Method
                </label>
                <select
                  value={transportMethod}
                  onChange={(e) => setTransportMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Estimated Arrival
                </label>
                <input
                  type="datetime-local"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3 mb-3">
                <h3 className="text-xs md:text-sm font-semibold text-gray-900 uppercase">Products to Transfer</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="p-3 md:p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="sm:col-span-2 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Product *
                          </label>
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                            placeholder="Enter or scan product"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            value={item.transferQty || ''}
                            onChange={(e) => handleItemChange(item.id, 'transferQty', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                          >
                            <option value="pcs">Pieces</option>
                            <option value="boxes">Boxes</option>
                            <option value="pallets">Pallets</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2 md:col-span-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Remarks
                          </label>
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                            placeholder="Optional notes"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                          />
                        </div>
                      </div>

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 md:mt-6 w-full md:w-auto"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 md:gap-3 pt-3 md:pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="w-full sm:w-auto">
                <CheckCircle className="w-4 h-4 mr-2" />
                Initiate Transfer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
