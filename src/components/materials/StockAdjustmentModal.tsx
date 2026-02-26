import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  FileText,
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';

interface StockAdjustmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  materialId?: string;
}

export function StockAdjustmentModal({
  onClose,
  onSuccess,
  materialId,
}: StockAdjustmentModalProps) {
  const { branch, logAudit } = useAppContext();
  
  const [adjustmentNumber] = useState(`ADJ-${Date.now().toString().slice(-8)}`);
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Physical Count Variance');
  const [referenceDocument, setReferenceDocument] = useState('');
  
  const [items, setItems] = useState([
    {
      id: '1',
      materialId: materialId || '',
      materialName: '',
      sku: '',
      currentStock: 0,
      physicalCount: 0,
      variance: 0,
      adjustmentType: 'Increase' as 'Increase' | 'Decrease',
      unitOfMeasure: 'kg',
      remarks: '',
    },
  ]);
  
  const [remarks, setRemarks] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        materialId: '',
        materialName: '',
        sku: '',
        currentStock: 0,
        physicalCount: 0,
        variance: 0,
        adjustmentType: 'Increase',
        unitOfMeasure: 'kg',
        remarks: '',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-calculate variance and adjustment type
        if (field === 'physicalCount' || field === 'currentStock') {
          const physical = field === 'physicalCount' ? value : item.physicalCount;
          const current = field === 'currentStock' ? value : item.currentStock;
          const variance = physical - current;
          updated.variance = Math.abs(variance);
          updated.adjustmentType = variance >= 0 ? 'Increase' : 'Decrease';
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (items.length === 0) {
      alert('Please add at least one material to adjust');
      return;
    }
    
    for (const item of items) {
      if (!item.materialId || !item.materialName) {
        alert('Please select material for all items');
        return;
      }
      if (item.variance === 0) {
        alert('Adjustment variance cannot be zero');
        return;
      }
    }

    // Check if large adjustment requires approval
    const totalAbsVariance = items.reduce((sum, item) => sum + Math.abs(item.variance), 0);
    const needsApproval = totalAbsVariance > 1000 || requiresApproval;

    // Create adjustment
    const adjustment = {
      adjustmentNumber,
      adjustmentDate,
      reason,
      referenceDocument,
      branch,
      items,
      remarks,
      adjustedBy: 'Current User',
      status: needsApproval ? 'Pending Approval' : 'Completed',
      requiresApproval: needsApproval,
      createdAt: new Date().toISOString(),
    };

    console.log('Creating Stock Adjustment:', adjustment);

    // Log audit
    logAudit({
      action: 'CREATE',
      category: 'MATERIALS',
      description: `Stock adjustment ${adjustmentNumber} - ${items.length} material(s) adjusted. Status: ${adjustment.status}`,
      metadata: { adjustmentNumber, reason, itemCount: items.length, requiresApproval: needsApproval },
    });

    if (needsApproval) {
      alert(`⚠️ Stock Adjustment ${adjustmentNumber} created!\n\nStatus: Pending Approval\n\nLarge adjustments require management approval before stock is updated.`);
    } else {
      alert(`✅ Stock Adjustment ${adjustmentNumber} completed!\n\nStock levels updated successfully.`);
    }
    
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
              <h2 className="text-xl font-bold text-gray-900">Stock Adjustment</h2>
              <p className="text-sm text-gray-500 mt-1">
                Adjustment #: <span className="font-semibold">{adjustmentNumber}</span>
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
            {/* Adjustment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Adjustment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adjustment Date *
                    </label>
                    <input
                      type="date"
                      value={adjustmentDate}
                      onChange={(e) => setAdjustmentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason *
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="Physical Count Variance">Physical Count Variance</option>
                      <option value="Damaged Goods">Damaged Goods</option>
                      <option value="Expired Materials">Expired Materials</option>
                      <option value="Theft/Loss">Theft/Loss</option>
                      <option value="Quality Rejection">Quality Rejection</option>
                      <option value="System Error Correction">System Error Correction</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={`Branch ${branch}`}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Document
                  </label>
                  <input
                    type="text"
                    value={referenceDocument}
                    onChange={(e) => setReferenceDocument(e.target.value)}
                    placeholder="e.g., Physical count sheet, Disposal form, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requiresApproval"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="requiresApproval" className="text-sm text-gray-700">
                    Requires management approval (large adjustments auto-require approval)
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Warning Alert */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <span className="font-semibold">Important:</span> Stock adjustments directly affect inventory levels. 
                  Ensure physical counts are accurate. Large adjustments (&gt;1000 units) require management approval.
                </div>
              </div>
            </div>

            {/* Materials to Adjust */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Materials to Adjust
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
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Material *
                        </label>
                        <select
                          value={item.materialId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const materials = [
                              { id: 'MAT-001', name: 'PVC Resin SG-5', sku: 'PVC-SG5-001', stock: 15000, uom: 'kg' },
                              { id: 'MAT-002', name: 'PVC Resin SG-8', sku: 'PVC-SG8-001', stock: 6500, uom: 'kg' },
                              { id: 'MAT-003', name: 'HDPE Resin PE100', sku: 'HDPE-PE100-001', stock: 18000, uom: 'kg' },
                              { id: 'MAT-004', name: 'PPR Resin Type III', sku: 'PPR-T3-001', stock: 9000, uom: 'kg' },
                              { id: 'MAT-005', name: 'Calcium Zinc Stabilizer', sku: 'STAB-CZ-001', stock: 3500, uom: 'kg' },
                            ];
                            const selected = materials.find(m => m.id === selectedId);
                            if (selected) {
                              handleItemChange(item.id, 'materialId', selected.id);
                              handleItemChange(item.id, 'materialName', selected.name);
                              handleItemChange(item.id, 'sku', selected.sku);
                              handleItemChange(item.id, 'currentStock', selected.stock);
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Stock (System)
                        </label>
                        <input
                          type="number"
                          value={item.currentStock}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Physical Count *
                        </label>
                        <input
                          type="number"
                          value={item.physicalCount}
                          onChange={(e) => handleItemChange(item.id, 'physicalCount', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Variance
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={item.adjustmentType === 'Increase' ? '+' : '-'}
                            disabled
                            className="w-12 px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center font-semibold"
                          />
                          <input
                            type="number"
                            value={item.variance}
                            disabled
                            className={`flex-1 px-3 py-2 border rounded-lg font-semibold ${
                              item.adjustmentType === 'Increase' 
                                ? 'border-green-300 bg-green-50 text-green-700' 
                                : 'border-red-300 bg-red-50 text-red-700'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          UOM
                        </label>
                        <input
                          type="text"
                          value={item.unitOfMeasure}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center"
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
                        placeholder="Explain the reason for this variance..."
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
                  placeholder="Any additional notes about this adjustment..."
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
              Submit Adjustment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
