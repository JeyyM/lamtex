import React, { useState } from 'react';
import { X, Plus, Trash2, Package, AlertCircle, Save, Minus, Check } from 'lucide-react';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Trip } from '@/src/types/logistics';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onSave: (updatedTrip: Trip) => void;
}

interface TripItem {
  id: string;
  orderId: string;
  productName: string;
  variantSize: string;
  variantDescription: string;
  quantity: number;
  weight: number; // kg per unit
  volume: number; // m³ per unit
}

// Available products catalog with variants - matches orders page structure
const AVAILABLE_PRODUCTS = [
  {
    id: 'P1',
    name: 'UPVC Sanitary Pipe',
    category: 'Sanitary',
    variants: [
      { id: 'V1-1', size: '2" x 10ft', description: 'Standard white, for waste drainage', weight: 4.5, volume: 0.03, stock: 120 },
      { id: 'V1-2', size: '3" x 10ft', description: 'Standard white, for main drains', weight: 6.8, volume: 0.04, stock: 95 },
      { id: 'V1-3', size: '4" x 10ft', description: 'Standard white, sewage pipes', weight: 8, volume: 0.05, stock: 78 },
    ],
  },
  {
    id: 'P2',
    name: 'PVC Conduit Pipe',
    category: 'Electrical',
    variants: [
      { id: 'V2-1', size: '1/2" x 10ft', description: 'Orange, light duty', weight: 2.0, volume: 0.02, stock: 150 },
      { id: 'V2-2', size: '3/4" x 10ft', description: 'Orange, standard', weight: 3.5, volume: 0.03, stock: 130 },
      { id: 'V2-3', size: '1" x 10ft', description: 'Orange, heavy duty', weight: 4.8, volume: 0.035, stock: 100 },
    ],
  },
  {
    id: 'P3',
    name: 'PVC Fittings',
    category: 'Fittings',
    variants: [
      { id: 'V3-1', size: '4" Elbow', description: '90 degree standard', weight: 0.3, volume: 0.002, stock: 500 },
      { id: 'V3-2', size: '4" Tee Joint', description: 'Standard connector', weight: 0.5, volume: 0.004, stock: 400 },
      { id: 'V3-3', size: '4" Coupling', description: 'Standard connector', weight: 0.15, volume: 0.001, stock: 600 },
    ],
  },
  {
    id: 'P4',
    name: 'Junction Box',
    category: 'Electrical',
    variants: [
      { id: 'V4-1', size: '4" x 4"', description: 'Heavy duty plastic', weight: 0.4, volume: 0.003, stock: 300 },
      { id: 'V4-2', size: '6" x 6"', description: 'Heavy duty plastic', weight: 0.7, volume: 0.005, stock: 200 },
    ],
  },
  {
    id: 'P5',
    name: 'Solvent Cement',
    category: 'Adhesives',
    variants: [
      { id: 'V5-1', size: '100ml', description: 'Standard bottle', weight: 0.12, volume: 0.0001, stock: 400 },
      { id: 'V5-2', size: '500ml', description: 'Industrial grade', weight: 0.5, volume: 0.0005, stock: 250 },
      { id: 'V5-3', size: '1L', description: 'Bulk container', weight: 1.0, volume: 0.001, stock: 150 },
    ],
  },
];

export function EditTripModal({ isOpen, onClose, trip, onSave }: EditTripModalProps) {
  const [status, setStatus] = useState(trip.status);
  const [items, setItems] = useState<TripItem[]>([
    { id: '1', orderId: 'ORD-2026-1234', productName: 'UPVC Sanitary Pipe', variantSize: '4" x 10ft', variantDescription: 'Standard white, sewage pipes', quantity: 50, weight: 8, volume: 0.05 },
    { id: '2', orderId: 'ORD-2026-1234', productName: 'PVC Fittings', variantSize: '4" Elbow', variantDescription: '90 degree standard', quantity: 100, weight: 0.3, volume: 0.002 },
    { id: '3', orderId: 'ORD-2026-1250', productName: 'PVC Conduit Pipe', variantSize: '3/4" x 10ft', variantDescription: 'Orange, standard', quantity: 75, weight: 3.5, volume: 0.03 },
  ]);
  
  // Product selector state - matches orders page
  const [selectedProduct, setSelectedProduct] = useState<typeof AVAILABLE_PRODUCTS[0] | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<typeof AVAILABLE_PRODUCTS[0]['variants'][0] | null>(null);
  const [variantQuantity, setVariantQuantity] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState('ORD-2026-1234');

  if (!isOpen) return null;

  // Calculate totals
  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  const totalVolume = items.reduce((sum, item) => sum + (item.volume * item.quantity), 0);
  const weightPercent = Math.round((totalWeight / trip.maxWeight) * 100);
  const volumePercent = Math.round((totalVolume / trip.maxVolume) * 100);
  const capacityUsed = Math.max(weightPercent, volumePercent);

  const handleAddItemFromVariant = () => {
    if (!selectedProduct || !selectedVariant) return;
    
    const newItem: TripItem = {
      id: Date.now().toString(),
      orderId: selectedOrderId,
      productName: selectedProduct.name,
      variantSize: selectedVariant.size,
      variantDescription: selectedVariant.description,
      quantity: variantQuantity,
      weight: selectedVariant.weight,
      volume: selectedVariant.volume,
    };
    
    setItems([...items, newItem]);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariantQuantity(1);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const updateQuantity = (idx: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const newItems = [...items];
    newItems[idx].quantity = newQuantity;
    setItems(newItems);
  };

  const handleSave = () => {
    const updatedTrip: Trip = {
      ...trip,
      status,
      weightUsed: Math.round(totalWeight),
      volumeUsed: Math.round(totalVolume * 10) / 10,
      capacityUsed,
    };
    onSave(updatedTrip);
    onClose();
  };

  const isOverCapacity = weightPercent > 100 || volumePercent > 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-lg px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Trip: {trip.tripNumber}</h2>
            <p className="text-sm text-gray-500 mt-1">{trip.vehicleName} • {trip.driverName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip Status
            </label>
            <div className="flex flex-wrap gap-2">
              {['Planned', 'Loading', 'In Transit', 'Delayed', 'Completed'].map((statusOption) => (
                <button
                  key={statusOption}
                  type="button"
                  onClick={() => setStatus(statusOption)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    status === statusOption
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {statusOption}
                </button>
              ))}
            </div>
          </div>

          {/* Capacity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`border-2 rounded-lg p-4 ${isOverCapacity ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
              <div className="text-sm font-medium text-gray-700 mb-1">Total Capacity</div>
              <div className={`text-2xl font-bold ${isOverCapacity ? 'text-red-600' : 'text-green-600'}`}>
                {capacityUsed}%
              </div>
              {isOverCapacity && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>Over capacity!</span>
                </div>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Weight</div>
              <div className="text-lg font-bold text-gray-900">
                {totalWeight.toFixed(0)} / {trip.maxWeight} kg
              </div>
              <div className="text-sm text-gray-600 mt-1">{weightPercent}% used</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Volume</div>
              <div className="text-lg font-bold text-gray-900">
                {totalVolume.toFixed(1)} / {trip.maxVolume} m³
              </div>
              <div className="text-sm text-gray-600 mt-1">{volumePercent}% used</div>
            </div>
          </div>

          {/* Product Selector Grid - Matches Orders Page */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add Products to Trip</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {AVAILABLE_PRODUCTS.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    setSelectedProduct(product);
                    setSelectedVariant(product.variants[0]);
                    setVariantQuantity(1);
                  }}
                  className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group relative"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                    <Package className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{product.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{product.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Items List */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-600" />
              Trip Items ({items.length})
            </h3>

            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-lg">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No items added yet</p>
                <p className="text-sm mt-1">Select products above to start building the trip</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{item.productName}</span>
                        <Badge variant="default" className="text-xs">{item.variantSize}</Badge>
                        <Badge variant="outline" className="text-xs">{item.orderId}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{item.variantDescription}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="text-xs text-gray-500">
                          {item.weight} kg/unit • {item.volume} m³/unit
                        </div>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                        className="w-20 text-center px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Weight/Volume Total */}
                    <div className="w-32 text-right">
                      <div className="font-semibold text-gray-900">{(item.weight * item.quantity).toFixed(1)} kg</div>
                      <div className="text-sm text-gray-600">{(item.volume * item.quantity).toFixed(2)} m³</div>
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 rounded-b-lg px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {items.length} item{items.length !== 1 ? 's' : ''} • {capacityUsed}% capacity used
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        {/* Product Detail Modal - E-commerce Style (Matches Orders Page) */}
        {selectedProduct && selectedVariant && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              
              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setSelectedVariant(null);
                  setVariantQuantity(1);
                }}
                className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Product Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-8 p-8">
                  
                  {/* Left: Product Image */}
                  <div className="space-y-4">
                    <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                      <Package className="w-32 h-32 text-gray-300" />
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">In Stock - {trip.branch}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Product Details */}
                  <div className="space-y-6">
                    {/* Product Title */}
                    <div>
                      <Badge variant="default" className="mb-2">{selectedProduct.category}</Badge>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                      <p className="text-gray-600">{selectedVariant.description}</p>
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Available Stock:</span>{' '}
                        <span className={`font-bold ${selectedVariant.stock > 50 ? 'text-green-600' : selectedVariant.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {selectedVariant.stock} Units
                        </span>
                      </div>
                    </div>

                    {/* Variant Selector */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Select Size</label>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedProduct.variants.map((variant) => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => {
                              setSelectedVariant(variant);
                              setVariantQuantity(1);
                            }}
                            className={`px-4 py-3 border-2 rounded-lg font-medium transition-all text-left relative ${
                              selectedVariant.id === variant.id
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            <div className="font-semibold">{variant.size}</div>
                            <div className="text-xs text-gray-500 mt-1">Stock: {variant.stock}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Specifications */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600">Specifications</div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-semibold text-gray-900">{selectedVariant.weight} kg/unit</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Volume:</span>
                          <span className="font-semibold text-gray-900">{selectedVariant.volume} m³/unit</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Assignment */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Assign to Order</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="ORD-2026-1234">ORD-2026-1234 - ABC Hardware</option>
                        <option value="ORD-2026-1250">ORD-2026-1250 - BuildPro Manila</option>
                      </select>
                    </div>

                    {/* Quantity Selector */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Quantity Request</label>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setVariantQuantity(Math.max(1, variantQuantity - 1))}
                          className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={selectedVariant.stock}
                          value={variantQuantity}
                          onChange={(e) => setVariantQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 text-center text-2xl font-bold px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setVariantQuantity(Math.min(selectedVariant.stock, variantQuantity + 1))}
                          className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      {variantQuantity > selectedVariant.stock && (
                        <p className="text-sm text-red-600 mt-2">⚠️ Quantity exceeds available stock</p>
                      )}
                    </div>

                    {/* Totals */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-900">Total Weight:</span>
                          <span className="font-bold text-blue-900">{(selectedVariant.weight * variantQuantity).toFixed(1)} kg</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-900">Total Volume:</span>
                          <span className="font-bold text-blue-900">{(selectedVariant.volume * variantQuantity).toFixed(2)} m³</span>
                        </div>
                      </div>
                    </div>

                    {/* Add to Trip Button */}
                    <button
                      type="button"
                      onClick={handleAddItemFromVariant}
                      className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add to Trip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
