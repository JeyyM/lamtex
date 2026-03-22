import React, { useEffect, useState } from 'react';
import { X, Factory, ShoppingCart, Calendar, AlertCircle, TrendingUp, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type RequestType = 'production' | 'purchase';

interface FinishedGood {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  reorderPoint: number;
  maxCapacity: number;
  location: string;
  lastRestocked: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface RawMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  reorderPoint: number;
  dailyConsumption: number;
  daysRemaining: number;
  supplier: string;
  lastPurchased: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface StockHistoryPoint {
  date: string;
  actualStock: number;
  reservedStock: number;
}

// Mock stock history data - consistent placeholder with rising trend
const mockStockHistory: StockHistoryPoint[] = [
  { date: 'Jan 28', actualStock: 450, reservedStock: 180 },
  { date: 'Jan 30', actualStock: 480, reservedStock: 190 },
  { date: 'Feb 1', actualStock: 520, reservedStock: 210 },
  { date: 'Feb 3', actualStock: 540, reservedStock: 215 },
  { date: 'Feb 5', actualStock: 580, reservedStock: 230 },
  { date: 'Feb 7', actualStock: 610, reservedStock: 245 },
  { date: 'Feb 9', actualStock: 650, reservedStock: 260 },
  { date: 'Feb 11', actualStock: 680, reservedStock: 270 },
  { date: 'Feb 13', actualStock: 720, reservedStock: 290 },
  { date: 'Feb 15', actualStock: 750, reservedStock: 300 },
  { date: 'Feb 17', actualStock: 790, reservedStock: 315 },
  { date: 'Feb 19', actualStock: 820, reservedStock: 330 },
  { date: 'Feb 21', actualStock: 860, reservedStock: 345 },
  { date: 'Feb 23', actualStock: 890, reservedStock: 355 },
  { date: 'Feb 25', actualStock: 930, reservedStock: 370 },
  { date: 'Feb 27', actualStock: 960, reservedStock: 385 },
];

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: RequestType;
  finishedGoods: FinishedGood[];
  rawMaterials: RawMaterial[];
}

export default function CreateRequestModal({ 
  isOpen, 
  onClose, 
  initialType,
  finishedGoods,
  rawMaterials 
}: CreateRequestModalProps) {
  const [requestType, setRequestType] = useState<RequestType>(initialType);
  const [selectedProduct, setSelectedProduct] = useState<FinishedGood | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [estimatedCompletion, setEstimatedCompletion] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProducts = finishedGoods.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMaterials = rawMaterials.filter(material =>
    material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    // Validation
    if (requestType === 'production' && !selectedProduct) {
      alert('Please select a product');
      return;
    }
    if (requestType === 'purchase' && !selectedMaterial) {
      alert('Please select a material');
      return;
    }
    if (quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    if (!scheduledDate) {
      alert('Please select a date');
      return;
    }

    // Create request object
    const newRequest = {
      id: `${requestType === 'production' ? 'PR' : 'PU'}${String(Date.now()).slice(-6)}`,
      requestNumber: `${requestType === 'production' ? 'PROD' : 'PURCH'}-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      ...(requestType === 'production' ? {
        productSku: selectedProduct?.sku,
        productName: selectedProduct?.name,
        scheduledDate,
        estimatedCompletion,
      } : {
        materialCode: selectedMaterial?.code,
        materialName: selectedMaterial?.name,
        supplier: selectedSupplier,
        requestedDelivery: scheduledDate,
        estimatedArrival: estimatedCompletion,
      }),
      quantity,
      unit: requestType === 'production' ? selectedProduct?.unit : selectedMaterial?.unit,
      status: 'pending',
      requestedBy: 'Current User',
      requestDate: new Date().toISOString().split('T')[0],
      priority,
      notes,
    };

    console.log('New Request:', newRequest);
    alert(`${requestType === 'production' ? 'Production' : 'Purchase'} request created successfully!`);
    onClose();
  };

  const handleProductSelect = (product: FinishedGood) => {
    setSelectedProduct(product);
    setSearchQuery('');
    // Auto-fill some fields
    setQuantity(product.reorderPoint);
    setPriority(product.status === 'critical' ? 'high' : product.status === 'warning' ? 'medium' : 'low');
    
    // Set dates
    const scheduled = new Date();
    scheduled.setDate(scheduled.getDate() + 2);
    setScheduledDate(scheduled.toISOString().split('T')[0]);
    
    const completion = new Date(scheduled);
    completion.setDate(completion.getDate() + 4);
    setEstimatedCompletion(completion.toISOString().split('T')[0]);
  };

  const handleMaterialSelect = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setSearchQuery('');
    setSelectedSupplier(material.supplier);
    // Auto-fill some fields
    setQuantity(material.reorderPoint);
    setPriority(material.status === 'critical' ? 'high' : material.status === 'warning' ? 'medium' : 'low');
    
    // Set dates based on urgency
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + (material.daysRemaining < 5 ? 1 : 3));
    setScheduledDate(delivery.toISOString().split('T')[0]);
    
    const arrival = new Date(delivery);
    arrival.setDate(arrival.getDate() + 1);
    setEstimatedCompletion(arrival.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-0 lg:p-4">
      <div className="bg-white w-full max-w-full h-full max-h-screen overflow-hidden flex flex-col lg:rounded-lg lg:max-w-6xl lg:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {requestType === 'production' ? (
              <Factory className="w-6 h-6 text-blue-600" />
            ) : (
              <ShoppingCart className="w-6 h-6 text-green-600" />
            )}
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">
              Create New {requestType === 'production' ? 'Production' : 'Purchase'} Request
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Request Type Toggle */}
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex w-full sm:w-fit bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setRequestType('production');
                setSelectedProduct(null);
                setSelectedMaterial(null);
                setSearchQuery('');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                requestType === 'production'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Factory className="w-4 h-4" />
              Production Request
            </button>
            <button
              onClick={() => {
                setRequestType('purchase');
                setSelectedProduct(null);
                setSelectedMaterial(null);
                setSearchQuery('');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                requestType === 'purchase'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Purchase Request
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
            {/* Left Column - Product/Material Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {requestType === 'production' ? 'Select Product' : 'Select Raw Material'}
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Product/Material List */}
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto w-full max-w-full">
                {requestType === 'production' ? (
                  filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className={`w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                          selectedProduct?.id === product.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 break-words">{product.name}</div>
                            <div className="text-sm text-gray-500 break-words">{product.sku}</div>
                          </div>
                          <div className="text-left sm:text-right sm:ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {product.currentStock} {product.unit}
                            </div>
                            <div className={`text-xs ${
                              product.status === 'critical' ? 'text-red-600' :
                              product.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {product.status === 'critical' ? 'Critical' :
                               product.status === 'warning' ? 'Low Stock' : 'Healthy'}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">No products found</div>
                  )
                ) : (
                  filteredMaterials.length > 0 ? (
                    filteredMaterials.map(material => (
                      <button
                        key={material.id}
                        onClick={() => handleMaterialSelect(material)}
                        className={`w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                          selectedMaterial?.id === material.id ? 'bg-green-50 border-green-200' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 break-words">{material.name}</div>
                            <div className="text-sm text-gray-500 break-words">{material.code} • {material.supplier}</div>
                          </div>
                          <div className="text-left sm:text-right sm:ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {material.currentStock} {material.unit}
                            </div>
                            <div className={`text-xs ${
                              material.daysRemaining < 5 ? 'text-red-600' :
                              material.daysRemaining < 10 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {material.daysRemaining} days left
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">No materials found</div>
                  )
                )}
              </div>

              {/* Selected Item Info Card */}
              {(selectedProduct || selectedMaterial) && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-blue-600 mt-1" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-2 break-words leading-relaxed">
                        {requestType === 'production' ? selectedProduct?.name : selectedMaterial?.name}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-sm text-gray-500">Current Stock</p>
                          <p className="text-base font-medium text-gray-900 leading-relaxed">
                            {requestType === 'production' ? selectedProduct?.currentStock : selectedMaterial?.currentStock}{' '}
                            {requestType === 'production' ? selectedProduct?.unit : selectedMaterial?.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Reorder Point</p>
                          <p className="text-base font-medium text-gray-900 leading-relaxed">
                            {requestType === 'production' ? selectedProduct?.reorderPoint : selectedMaterial?.reorderPoint}{' '}
                            {requestType === 'production' ? selectedProduct?.unit : selectedMaterial?.unit}
                          </p>
                        </div>
                        {requestType === 'production' && selectedProduct && (
                          <div>
                            <p className="text-sm text-gray-500">Max Capacity</p>
                            <p className="text-base font-medium text-gray-900 leading-relaxed">
                              {selectedProduct.maxCapacity} {selectedProduct.unit}
                            </p>
                          </div>
                        )}
                        {requestType === 'purchase' && selectedMaterial && (
                          <div>
                            <p className="text-sm text-gray-500">Daily Usage</p>
                            <p className="text-base font-medium text-gray-900 leading-relaxed">
                              {selectedMaterial.dailyConsumption} {selectedMaterial.unit}/day
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stock History Graph */}
              {(selectedProduct || selectedMaterial) && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Stock Trend (Last 30 Days)
                    </h4>
                  </div>
                  
                  {/* Recharts Line Graph */}
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={mockStockHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actualStock" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Actual Stock"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="reservedStock" 
                        stroke="#a855f7" 
                        strokeWidth={2}
                        name="Reserved/Consumption"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Right Column - Request Details Form */}
            <div className="space-y-4">
              {/* Quantity */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(0, quantity - 10))}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-lg font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 10)}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-lg font-bold"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-600 ml-1 sm:ml-2">
                    {requestType === 'production' ? selectedProduct?.unit : selectedMaterial?.unit}
                  </span>
                </div>
                {requestType === 'production' && selectedProduct && quantity > selectedProduct.maxCapacity && (
                  <div className="flex items-center gap-1 mt-2 text-yellow-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span className="leading-relaxed break-words">Quantity exceeds max capacity ({selectedProduct.maxCapacity} {selectedProduct.unit})</span>
                  </div>
                )}
              </div>

              {/* Supplier (Purchase Only) */}
              {requestType === 'purchase' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <input
                    type="text"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter supplier name"
                  />
                </div>
              )}

              {/* Scheduled/Delivery Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {requestType === 'production' ? 'Scheduled Production Date' : 'Requested Delivery Date'} *
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Estimated Completion/Arrival */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {requestType === 'production' ? 'Estimated Completion Date' : 'Estimated Arrival Date'} *
                </label>
                <input
                  type="date"
                  value={estimatedCompletion}
                  onChange={(e) => setEstimatedCompletion(e.target.value)}
                  min={scheduledDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPriority('low')}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                      priority === 'low'
                        ? 'bg-gray-100 border-gray-400 text-gray-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Low
                  </button>
                  <button
                    onClick={() => setPriority('medium')}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                      priority === 'medium'
                        ? 'bg-yellow-100 border-yellow-400 text-yellow-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setPriority('high')}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                      priority === 'high'
                        ? 'bg-red-100 border-red-400 text-red-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    High
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder={requestType === 'production' 
                    ? 'Add production notes, special requirements, etc.'
                    : 'Add supplier notes, delivery instructions, etc.'
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 md:p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            * Required fields
          </div>
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create {requestType === 'production' ? 'Production' : 'Purchase'} Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
