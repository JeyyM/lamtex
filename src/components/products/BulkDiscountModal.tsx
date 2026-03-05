import { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '../ui/Button';

interface BulkDiscountTier {
  minQty: number;
  discount: number;
  pricePerUnit: number;
}

interface BulkDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (discounts: BulkDiscountTier[]) => void;
  currentDiscounts: BulkDiscountTier[];
  basePrice: number;
  variantName: string;
}

export default function BulkDiscountModal({
  isOpen,
  onClose,
  onSave,
  currentDiscounts,
  basePrice,
  variantName,
}: BulkDiscountModalProps) {
  const [discountTiers, setDiscountTiers] = useState<BulkDiscountTier[]>(
    currentDiscounts.length > 0 ? [...currentDiscounts] : [
      { minQty: 1, discount: 0, pricePerUnit: basePrice }
    ]
  );

  if (!isOpen) return null;

  const handleAddTier = () => {
    const lastTier = discountTiers[discountTiers.length - 1];
    const newMinQty = lastTier ? lastTier.minQty + 5 : 1;
    setDiscountTiers([
      ...discountTiers,
      { minQty: newMinQty, discount: 0, pricePerUnit: basePrice }
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (discountTiers.length > 1) {
      setDiscountTiers(discountTiers.filter((_, i) => i !== index));
    }
  };

  const handleTierChange = (index: number, field: keyof BulkDiscountTier, value: number) => {
    const updatedTiers = [...discountTiers];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    
    // Auto-calculate pricePerUnit if discount changes
    if (field === 'discount') {
      updatedTiers[index].pricePerUnit = basePrice * (1 - value / 100);
    }
    // Auto-calculate discount if pricePerUnit changes
    if (field === 'pricePerUnit') {
      updatedTiers[index].discount = ((basePrice - value) / basePrice) * 100;
    }
    
    setDiscountTiers(updatedTiers);
  };

  const handleSave = () => {
    // Sort by minQty
    const sortedTiers = [...discountTiers].sort((a, b) => a.minQty - b.minQty);
    onSave(sortedTiers);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Order Discount Rules</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure discount tiers for {variantName} (Base Price: ₱{basePrice.toLocaleString()})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {discountTiers.map((tier, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1 grid grid-cols-3 gap-4">
                  {/* Min Quantity */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Min. Quantity
                    </label>
                    <input
                      type="number"
                      value={tier.minQty}
                      onChange={(e) => handleTierChange(index, 'minQty', parseInt(e.target.value) || 0)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      min="1"
                      disabled={index === 0} // First tier is always base (qty 1)
                    />
                  </div>

                  {/* Discount Percentage */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      value={tier.discount.toFixed(1)}
                      onChange={(e) => handleTierChange(index, 'discount', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      min="0"
                      max="100"
                      step="0.1"
                      disabled={index === 0} // First tier has 0% discount
                    />
                  </div>

                  {/* Price Per Unit */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Price per Unit
                    </label>
                    <input
                      type="number"
                      value={tier.pricePerUnit.toFixed(2)}
                      onChange={(e) => handleTierChange(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      min="0"
                      step="0.01"
                      disabled={index === 0} // First tier is always base price
                    />
                  </div>
                </div>

                {/* Remove Button */}
                {index > 0 && (
                  <button
                    onClick={() => handleRemoveTier(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors flex-shrink-0"
                    title="Remove tier"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Tier Button */}
          <button
            onClick={handleAddTier}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Discount Tier</span>
          </button>

          {/* Preview */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Preview</h3>
            <div className="space-y-2">
              {discountTiers
                .sort((a, b) => a.minQty - b.minQty)
                .map((tier, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">
                      Buy {tier.minQty}+ units
                    </span>
                    <div className="flex items-center gap-3">
                      {tier.discount > 0 && (
                        <span className="text-orange-600 font-medium">-{tier.discount.toFixed(1)}%</span>
                      )}
                      <span className="font-bold text-blue-900">
                        ₱{tier.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/unit
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Discount Rules
          </Button>
        </div>
      </div>
    </div>
  );
}
