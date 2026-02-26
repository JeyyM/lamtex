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
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';

interface StockTransferModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function StockTransferModal({
  onClose,
  onSuccess,
}: StockTransferModalProps) {
  const { branch, logAudit } = useAppContext();
  
  const [transferNumber] = useState(`STR-${Date.now().toString().slice(-8)}`);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromBranch, setFromBranch] = useState(branch);
  const [toBranch, setToBranch] = useState('');
  const [transportMethod, setTransportMethod] = useState('Company Truck');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  
  const [items, setItems] = useState([
    {
      id: '1',
      materialId: '',
      materialName: '',
      sku: '',
      transferQty: 0,
      unitOfMeasure: 'kg',
      remarks: '',
    },
  ]);
  
  const [remarks, setRemarks] = useState('');

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        materialId: '',
        materialName: '',
        sku: '',
        transferQty: 0,
        unitOfMeasure: 'kg',
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
    if (!fromBranch || !toBranch) {
      alert('Please select both source and destination branches');
      return;
    }
    
    if (fromBranch === toBranch) {
      alert('Source and destination branches must be different');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one material to transfer');
      return;
    }
    
    for (const item of items) {
      if (!item.materialId || !item.materialName) {
        alert('Please select material for all items');
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

    console.log('Creating Stock Transfer:', transfer);

    // Log audit
    logAudit({
      action: 'CREATE',
      category: 'MATERIALS',
      description: `Stock transfer ${transferNumber} - ${items.length} material(s) from Branch ${fromBranch} to Branch ${toBranch}`,
      metadata: { transferNumber, fromBranch, toBranch, itemCount: items.length },
    });

    alert(`✅ Stock Transfer ${transferNumber} created successfully!\n\nStatus: In Transit\nFrom Branch ${fromBranch} to Branch ${toBranch}`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Stock Transfer</h2>
              <p className="text-sm text-gray-500 mt-1">
                Transfer #: <span className="font-semibold">{transferNumber}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Transfer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  Transfer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transfer Date *
                    </label>
                    <input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Branch *
                    </label>
                    <select
                      value={fromBranch}
                      onChange={(e) => setFromBranch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select branch...</option>
                      <option value="A">Branch A - Main Warehouse</option>
                      <option value="B">Branch B - North Distribution</option>
                      <option value="C">Branch C - South Distribution</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Branch *
                    </label>
                    <select
                      value={toBranch}
                      onChange={(e) => setToBranch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select branch...</option>
                      <option value="A" disabled={fromBranch === 'A'}>Branch A - Main Warehouse</option>
                      <option value="B" disabled={fromBranch === 'B'}>Branch B - North Distribution</option>
                      <option value="C" disabled={fromBranch === 'C'}>Branch C - South Distribution</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div className="text-sm text-blue-900">
                      <span className="font-semibold">Transfer Route:</span>{' '}
                      {fromBranch ? `Branch ${fromBranch}` : '(Select)'} 
                      {' → '}
                      {toBranch ? `Branch ${toBranch}` : '(Select)'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transport Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Transport Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transport Method *
                    </label>
                    <select
                      value={transportMethod}
                      onChange={(e) => setTransportMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="Company Truck">Company Truck</option>
                      <option value="Third-Party Logistics">Third-Party Logistics</option>
                      <option value="Courier">Courier Service</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Arrival
                    </label>
                    <input
                      type="date"
                      value={estimatedArrival}
                      onChange={(e) => setEstimatedArrival(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Driver Name
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Driver name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle / Plate Number
                    </label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="ABC 1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materials to Transfer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Materials to Transfer
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-700">Item #{index + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Material *
                        </label>
                        <select
                          value={item.materialId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const materials = [
                              { id: 'MAT-001', name: 'PVC Resin SG-5', sku: 'PVC-SG5-001', uom: 'kg' },
                              { id: 'MAT-002', name: 'PVC Resin SG-8', sku: 'PVC-SG8-001', uom: 'kg' },
                              { id: 'MAT-003', name: 'HDPE Resin PE100', sku: 'HDPE-PE100-001', uom: 'kg' },
                              { id: 'MAT-004', name: 'PPR Resin Type III', sku: 'PPR-T3-001', uom: 'kg' },
                              { id: 'MAT-005', name: 'Calcium Zinc Stabilizer', sku: 'STAB-CZ-001', uom: 'kg' },
                            ];
                            const selected = materials.find(m => m.id === selectedId);
                            if (selected) {
                              handleItemChange(item.id, 'materialId', selected.id);
                              handleItemChange(item.id, 'materialName', selected.name);
                              handleItemChange(item.id, 'sku', selected.sku);
                              handleItemChange(item.id, 'unitOfMeasure', selected.uom);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select material...</option>
                          <option value="MAT-001">PVC Resin SG-5</option>
                          <option value="MAT-002">PVC Resin SG-8</option>
                          <option value="MAT-003">HDPE Resin PE100</option>
                          <option value="MAT-004">PPR Resin Type III</option>
                          <option value="MAT-005">Calcium Zinc Stabilizer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Transfer Quantity *
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={item.transferQty}
                            onChange={(e) => handleItemChange(item.id, 'transferQty', parseFloat(e.target.value))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                          />
                          <input
                            type="text"
                            value={item.unitOfMeasure}
                            disabled
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Remarks
                      </label>
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                        placeholder="Any notes about this item..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* General Remarks */}
            <Card>
              <CardContent className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  General Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any additional notes about this transfer..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <CheckCircle className="w-4 h-4 mr-2" />
              Create Transfer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
