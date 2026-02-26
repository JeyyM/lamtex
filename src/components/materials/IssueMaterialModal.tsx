import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  Factory,
  Calendar,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Box,
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';

interface IssueMaterialModalProps {
  onClose: () => void;
  onSuccess: () => void;
  materialId?: string;
}

interface BatchOption {
  id: string;
  batchNumber: string;
  availableQty: number;
  expiryDate?: string;
  qualityStatus: string;
}

export function IssueMaterialModal({
  onClose,
  onSuccess,
  materialId,
}: IssueMaterialModalProps) {
  const { branch, logAudit } = useAppContext();
  
  const [mrsNumber] = useState(`MRS-${Date.now().toString().slice(-8)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issuedTo, setIssuedTo] = useState('Production Line 1');
  const [productionOrder, setProductionOrder] = useState('');
  const [purpose, setPurpose] = useState('Production');
  
  // Mock batch data
  const [availableBatches] = useState<{ [key: string]: BatchOption[] }>({
    'MAT-001': [
      { id: 'B1', batchNumber: 'BATCH-2026-001', availableQty: 5000, expiryDate: '2027-02-15', qualityStatus: 'Passed' },
      { id: 'B2', batchNumber: 'BATCH-2026-002', availableQty: 3500, expiryDate: '2027-02-20', qualityStatus: 'Passed' },
    ],
    'MAT-002': [
      { id: 'B3', batchNumber: 'BATCH-2026-003', availableQty: 2000, qualityStatus: 'Passed' },
    ],
    'MAT-003': [
      { id: 'B4', batchNumber: 'BATCH-2026-004', availableQty: 8000, expiryDate: '2028-01-10', qualityStatus: 'Passed' },
    ],
  });
  
  const [items, setItems] = useState([
    {
      id: '1',
      materialId: materialId || 'MAT-001',
      materialName: 'PVC Resin SG-5',
      sku: 'PVC-SG5-001',
      requestedQty: 0,
      issuedQty: 0,
      unitOfMeasure: 'kg',
      selectedBatch: '',
      batchNumber: '',
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
        requestedQty: 0,
        issuedQty: 0,
        unitOfMeasure: 'kg',
        selectedBatch: '',
        batchNumber: '',
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

  const handleBatchSelect = (itemId: string, batchId: string, materialId: string) => {
    const batches = availableBatches[materialId] || [];
    const selectedBatch = batches.find(b => b.id === batchId);
    
    if (selectedBatch) {
      setItems(items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              selectedBatch: batchId,
              batchNumber: selectedBatch.batchNumber,
            } 
          : item
      ));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!issuedTo) {
      alert('Please select who is receiving the materials');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one material to issue');
      return;
    }
    
    for (const item of items) {
      if (!item.materialId || !item.materialName) {
        alert('Please select material for all items');
        return;
      }
      if (item.issuedQty <= 0) {
        alert('Issued quantity must be greater than 0');
        return;
      }
      if (!item.selectedBatch) {
        alert('Please select a batch for all items');
        return;
      }
      
      // Check batch availability
      const batches = availableBatches[item.materialId] || [];
      const batch = batches.find(b => b.id === item.selectedBatch);
      if (batch && item.issuedQty > batch.availableQty) {
        alert(`Insufficient quantity in batch ${batch.batchNumber}. Available: ${batch.availableQty} ${item.unitOfMeasure}`);
        return;
      }
    }

    // Create MRS (Material Requisition Slip)
    const mrs = {
      mrsNumber,
      issueDate,
      issuedTo,
      productionOrder,
      purpose,
      branch,
      items,
      remarks,
      issuedBy: 'Current User',
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };

    console.log('Creating Material Issue:', mrs);

    // Log audit
    logAudit({
      action: 'CREATE',
      category: 'MATERIALS',
      description: `Issued ${items.length} material(s) to ${issuedTo} - MRS ${mrsNumber}`,
      metadata: { mrsNumber, issuedTo, itemCount: items.length },
    });

    alert(`✅ MRS ${mrsNumber} created successfully!\n\nMaterials issued and stock updated.`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Issue Materials (MRS)</h2>
              <p className="text-sm text-gray-500 mt-1">
                MRS Number: <span className="font-semibold">{mrsNumber}</span>
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
            {/* Issue Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Issue Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Date *
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issued To *
                    </label>
                    <select
                      value={issuedTo}
                      onChange={(e) => setIssuedTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="Production Line 1">Production Line 1</option>
                      <option value="Production Line 2">Production Line 2</option>
                      <option value="Production Line 3">Production Line 3</option>
                      <option value="Quality Control">Quality Control</option>
                      <option value="R&D Department">R&D Department</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issuing Branch
                    </label>
                    <input
                      type="text"
                      value={`Branch ${branch}`}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Production Order #
                    </label>
                    <input
                      type="text"
                      value={productionOrder}
                      onChange={(e) => setProductionOrder(e.target.value)}
                      placeholder="PO-PROD-2026-001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purpose *
                    </label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="Production">Production</option>
                      <option value="Quality Testing">Quality Testing</option>
                      <option value="R&D">Research & Development</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materials to Issue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Materials to Issue
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
                              handleItemChange(item.id, 'selectedBatch', '');
                              handleItemChange(item.id, 'batchNumber', '');
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
                          Select Batch (FIFO) *
                        </label>
                        <select
                          value={item.selectedBatch}
                          onChange={(e) => handleBatchSelect(item.id, e.target.value, item.materialId)}
                          disabled={!item.materialId}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
                          required
                        >
                          <option value="">Select batch...</option>
                          {item.materialId && availableBatches[item.materialId]?.map(batch => (
                            <option key={batch.id} value={batch.id}>
                              {batch.batchNumber} - Available: {batch.availableQty} {item.unitOfMeasure}
                              {batch.expiryDate ? ` (Exp: ${batch.expiryDate})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {item.selectedBatch && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Box className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-900">
                            <span className="font-semibold">Batch: {item.batchNumber}</span>
                            {(() => {
                              const batch = availableBatches[item.materialId]?.find(b => b.id === item.selectedBatch);
                              return batch && (
                                <>
                                  <br />
                                  Available: {batch.availableQty} {item.unitOfMeasure}
                                  {batch.expiryDate && ` • Expires: ${batch.expiryDate}`}
                                  <br />
                                  Quality: <Badge variant="success">{batch.qualityStatus}</Badge>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Requested Qty
                        </label>
                        <input
                          type="number"
                          value={item.requestedQty}
                          onChange={(e) => handleItemChange(item.id, 'requestedQty', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Issued Qty *
                        </label>
                        <input
                          type="number"
                          value={item.issuedQty}
                          onChange={(e) => handleItemChange(item.id, 'issuedQty', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          UOM
                        </label>
                        <input
                          type="text"
                          value={item.unitOfMeasure}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
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
                  placeholder="Any additional notes about this issue..."
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
              Issue Materials
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
