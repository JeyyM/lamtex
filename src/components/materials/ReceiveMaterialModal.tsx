import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  Truck,
  Calendar,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';

interface ReceiveMaterialModalProps {
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrderId?: string;
  materialId?: string;
}

export function ReceiveMaterialModal({
  onClose,
  onSuccess,
  purchaseOrderId,
  materialId,
}: ReceiveMaterialModalProps) {
  const { branch, logAudit } = useAppContext();
  
  const [grnNumber] = useState(`GRN-${Date.now().toString().slice(-8)}`);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('ChemCorp Philippines');
  const [poNumber, setPoNumber] = useState(purchaseOrderId || 'PO-2026-0215');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  
  const [items, setItems] = useState([
    {
      id: '1',
      materialId: materialId || 'MAT-001',
      materialName: 'PVC Resin SG-5',
      sku: 'PVC-SG5-001',
      orderedQty: 5000,
      receivedQty: 5000,
      unitOfMeasure: 'kg',
      batchNumber: '',
      lotNumber: '',
      manufacturingDate: '',
      expiryDate: '',
      qualityStatus: 'Passed' as 'Passed' | 'Failed' | 'Pending',
      remarks: '',
    },
  ]);
  
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [driverName, setDriverName] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        materialId: '',
        materialName: '',
        sku: '',
        orderedQty: 0,
        receivedQty: 0,
        unitOfMeasure: 'kg',
        batchNumber: '',
        lotNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        qualityStatus: 'Pending',
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
    if (!supplier) {
      alert('Please enter supplier name');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one material to receive');
      return;
    }
    
    for (const item of items) {
      if (!item.materialId || !item.materialName) {
        alert('Please select material for all items');
        return;
      }
      if (item.receivedQty <= 0) {
        alert('Received quantity must be greater than 0');
        return;
      }
      if (!item.batchNumber) {
        alert('Please enter batch number for all items');
        return;
      }
    }

    // Create GRN
    const grn = {
      grnNumber,
      receivedDate,
      supplier,
      poNumber,
      invoiceNumber,
      deliveryNoteNumber,
      branch,
      items,
      vehicleDetails,
      driverName,
      remarks,
      receivedBy: 'Current User',
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };

    console.log('Creating GRN:', grn);

    // Log audit
    logAudit({
      action: 'CREATE',
      category: 'MATERIALS',
      description: `Created GRN ${grnNumber} - Received ${items.length} material(s) from ${supplier}`,
      metadata: { grnNumber, supplier, itemCount: items.length },
    });

    alert(`✅ GRN ${grnNumber} created successfully!\n\nMaterials received and stock updated.`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Receive Materials (GRN)</h2>
              <p className="text-sm text-gray-500 mt-1">
                GRN Number: <span className="font-semibold">{grnNumber}</span>
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
            {/* GRN Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Receipt Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received Date *
                    </label>
                    <input
                      type="date"
                      value={receivedDate}
                      onChange={(e) => setReceivedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier *
                    </label>
                    <select
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="ChemCorp Philippines">ChemCorp Philippines</option>
                      <option value="Polytech Solutions Inc.">Polytech Solutions Inc.</option>
                      <option value="Stabilizer Corp">Stabilizer Corp</option>
                      <option value="ColorMaster Industries">ColorMaster Industries</option>
                      <option value="PackSupply Co.">PackSupply Co.</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receiving Branch
                    </label>
                    <input
                      type="text"
                      value={`Branch ${branch}`}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PO Number
                    </label>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="PO-2026-0215"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Invoice #
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="INV-12345"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Note #
                    </label>
                    <input
                      type="text"
                      value={deliveryNoteNumber}
                      onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                      placeholder="DN-12345"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Details
                    </label>
                    <input
                      type="text"
                      value={vehicleDetails}
                      onChange={(e) => setVehicleDetails(e.target.value)}
                      placeholder="Truck plate number / Vehicle info"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

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
                </div>
              </CardContent>
            </Card>

            {/* Materials Received */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Materials Received
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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
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
                          Ordered Qty
                        </label>
                        <input
                          type="number"
                          value={item.orderedQty}
                          onChange={(e) => handleItemChange(item.id, 'orderedQty', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Received Qty *
                        </label>
                        <input
                          type="number"
                          value={item.receivedQty}
                          onChange={(e) => handleItemChange(item.id, 'receivedQty', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Batch Number *
                        </label>
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={(e) => handleItemChange(item.id, 'batchNumber', e.target.value)}
                          placeholder="BATCH-2026-001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lot Number
                        </label>
                        <input
                          type="text"
                          value={item.lotNumber}
                          onChange={(e) => handleItemChange(item.id, 'lotNumber', e.target.value)}
                          placeholder="LOT-001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Manufacturing Date
                        </label>
                        <input
                          type="date"
                          value={item.manufacturingDate}
                          onChange={(e) => handleItemChange(item.id, 'manufacturingDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => handleItemChange(item.id, 'expiryDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quality Status *
                        </label>
                        <select
                          value={item.qualityStatus}
                          onChange={(e) => handleItemChange(item.id, 'qualityStatus', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="Pending">Pending Inspection</option>
                          <option value="Passed">Passed</option>
                          <option value="Failed">Failed</option>
                        </select>
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
                  placeholder="Any additional notes about this receipt..."
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
              Complete Receipt
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
