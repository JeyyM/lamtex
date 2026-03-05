import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAppContext } from '../store/AppContext';
import BulkDiscountModal from '../components/products/BulkDiscountModal';
import ImageGalleryModal from '../components/ImageGalleryModal';
import {
  Package,
  ArrowLeft,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Factory,
  Ruler,
  Weight,
  Info,
  TrendingUp,
  Calendar,
  BarChart3,
  Table as TableIcon,
  Edit,
  Percent,
  CheckCircle2,
  Lightbulb,
  Save,
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Import product images
import hdpePipeImg from '../assets/product-images/HDPE Pipe.webp';
import pipesImg from '../assets/product-images/Pipes.webp';
import pressureLineImg from '../assets/product-images/Pressure Line Pipe.webp';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Helper function to generate consistent color from string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 50%)`;
};

// Mock available PVC raw materials
const availablePVCMaterials = [
  { id: 'MAT-001', name: 'HDPE Resin', unit: 'kg', avgCostPerUnit: 14.4 },
  { id: 'MAT-002', name: 'PVC Resin (K-67)', unit: 'kg', avgCostPerUnit: 16.8 },
  { id: 'MAT-003', name: 'PVC Resin (K-70)', unit: 'kg', avgCostPerUnit: 18.2 },
  { id: 'MAT-004', name: 'UV Stabilizer', unit: 'kg', avgCostPerUnit: 56.25 },
  { id: 'MAT-005', name: 'Carbon Black', unit: 'kg', avgCostPerUnit: 50.0 },
  { id: 'MAT-006', name: 'Titanium Dioxide', unit: 'kg', avgCostPerUnit: 85.0 },
  { id: 'MAT-007', name: 'Calcium Carbonate', unit: 'kg', avgCostPerUnit: 12.5 },
  { id: 'MAT-008', name: 'Heat Stabilizer', unit: 'kg', avgCostPerUnit: 125.0 },
  { id: 'MAT-009', name: 'Processing Aid', unit: 'kg', avgCostPerUnit: 95.0 },
  { id: 'MAT-010', name: 'Impact Modifier', unit: 'kg', avgCostPerUnit: 110.0 },
  { id: 'MAT-011', name: 'Lubricant (PE Wax)', unit: 'kg', avgCostPerUnit: 75.0 },
  { id: 'MAT-012', name: 'Plasticizer', unit: 'kg', avgCostPerUnit: 45.0 },
];

// Mock product variants (sizes for HDPE Pipes)
const mockVariants = [
  {
    id: 'VAR-001',
    variantName: '1/2 inch',
    sku: 'HDPE-HD-050',
    size: '1/2"',
    length: '6 meters',
    weight: '2.5 kg/m',
    thickness: '3.2 mm',
    pressure: '10 bar',
    stock: 850,
    reorderPoint: 500,
    price: 450,
    cost: 320,
    monthlyUsage: 180,
    unitsSold: 1240,
    status: 'In Stock',
    rawMaterials: [
      { name: 'HDPE Resin', quantity: 12.5, unit: 'kg', cost: 180 },
      { name: 'UV Stabilizer', quantity: 0.8, unit: 'kg', cost: 45 },
      { name: 'Carbon Black', quantity: 0.3, unit: 'kg', cost: 15 },
    ],
    bulkDiscounts: [
      { minQty: 1, discount: 0, pricePerUnit: 450 },
      { minQty: 5, discount: 5, pricePerUnit: 428 },
      { minQty: 10, discount: 10, pricePerUnit: 405 },
      { minQty: 25, discount: 15, pricePerUnit: 383 },
    ],
  },
  {
    id: 'VAR-002',
    variantName: '3/4 inch',
    sku: 'HDPE-HD-075',
    size: '3/4"',
    length: '6 meters',
    weight: '3.8 kg/m',
    thickness: '4.0 mm',
    pressure: '10 bar',
    stock: 1200,
    reorderPoint: 600,
    price: 580,
    cost: 410,
    monthlyUsage: 220,
    unitsSold: 1580,
    status: 'In Stock',
    rawMaterials: [
      { name: 'HDPE Resin', quantity: 19.5, unit: 'kg', cost: 280 },
      { name: 'UV Stabilizer', quantity: 1.2, unit: 'kg', cost: 68 },
      { name: 'Carbon Black', quantity: 0.5, unit: 'kg', cost: 25 },
    ],
    bulkDiscounts: [
      { minQty: 1, discount: 0, pricePerUnit: 580 },
      { minQty: 5, discount: 5, pricePerUnit: 551 },
      { minQty: 10, discount: 10, pricePerUnit: 522 },
      { minQty: 25, discount: 15, pricePerUnit: 493 },
    ],
  },
  {
    id: 'VAR-003',
    variantName: '1 inch',
    sku: 'HDPE-HD-100',
    size: '1"',
    length: '6 meters',
    weight: '5.2 kg/m',
    thickness: '5.0 mm',
    pressure: '10 bar',
    stock: 950,
    reorderPoint: 550,
    price: 720,
    cost: 520,
    monthlyUsage: 250,
    unitsSold: 1820,
    status: 'In Stock',
    rawMaterials: [
      { name: 'HDPE Resin', quantity: 26.8, unit: 'kg', cost: 385 },
      { name: 'UV Stabilizer', quantity: 1.6, unit: 'kg', cost: 90 },
      { name: 'Carbon Black', quantity: 0.7, unit: 'kg', cost: 35 },
    ],
    bulkDiscounts: [
      { minQty: 1, discount: 0, pricePerUnit: 720 },
      { minQty: 5, discount: 5, pricePerUnit: 684 },
      { minQty: 10, discount: 10, pricePerUnit: 648 },
      { minQty: 25, discount: 15, pricePerUnit: 612 },
    ],
  },
  {
    id: 'VAR-004',
    variantName: '1.5 inch',
    sku: 'HDPE-HD-150',
    size: '1.5"',
    length: '6 meters',
    weight: '8.5 kg/m',
    thickness: '6.5 mm',
    pressure: '10 bar',
    stock: 320,
    reorderPoint: 400,
    price: 980,
    cost: 710,
    monthlyUsage: 180,
    unitsSold: 1150,
    status: 'Low Stock',
    rawMaterials: [
      { name: 'HDPE Resin', quantity: 44.2, unit: 'kg', cost: 635 },
      { name: 'UV Stabilizer', quantity: 2.6, unit: 'kg', cost: 148 },
      { name: 'Carbon Black', quantity: 1.1, unit: 'kg', cost: 55 },
    ],
    bulkDiscounts: [
      { minQty: 1, discount: 0, pricePerUnit: 980 },
      { minQty: 5, discount: 5, pricePerUnit: 931 },
      { minQty: 10, discount: 10, pricePerUnit: 882 },
      { minQty: 25, discount: 15, pricePerUnit: 833 },
    ],
  },
  {
    id: 'VAR-005',
    variantName: '2 inch',
    sku: 'HDPE-HD-200',
    size: '2"',
    length: '6 meters',
    weight: '12.5 kg/m',
    thickness: '8.0 mm',
    pressure: '10 bar',
    stock: 680,
    reorderPoint: 450,
    price: 1250,
    cost: 920,
    monthlyUsage: 150,
    unitsSold: 980,
    status: 'In Stock',
    rawMaterials: [
      { name: 'HDPE Resin', quantity: 65.0, unit: 'kg', cost: 935 },
      { name: 'UV Stabilizer', quantity: 3.8, unit: 'kg', cost: 215 },
      { name: 'Carbon Black', quantity: 1.6, unit: 'kg', cost: 80 },
    ],
    bulkDiscounts: [
      { minQty: 1, discount: 0, pricePerUnit: 1250 },
      { minQty: 5, discount: 5, pricePerUnit: 1188 },
      { minQty: 10, discount: 10, pricePerUnit: 1125 },
      { minQty: 25, discount: 15, pricePerUnit: 1063 },
    ],
  },
  {
    id: 'VAR-006',
    variantName: '3 inch',
    sku: 'HDPE-HD-300',
    size: '3"',
    length: '6 meters',
    weight: '22.5 kg/m',
    thickness: '10.0 mm',
    pressure: '10 bar',
    stock: 180,
    reorderPoint: 300,
    price: 1850,
    cost: 1380,
    monthlyUsage: 95,
    unitsSold: 620,
    status: 'Critical',
    rawMaterials: [
      { name: 'HDPE Resin', quantity: 118.0, unit: 'kg', cost: 1695 },
      { name: 'UV Stabilizer', quantity: 6.8, unit: 'kg', cost: 385 },
      { name: 'Carbon Black', quantity: 2.9, unit: 'kg', cost: 145 },
    ],
    bulkDiscounts: [
      { minQty: 1, discount: 0, pricePerUnit: 1850 },
      { minQty: 5, discount: 5, pricePerUnit: 1758 },
      { minQty: 10, discount: 10, pricePerUnit: 1665 },
      { minQty: 25, discount: 15, pricePerUnit: 1573 },
    ],
  },
  {
    id: 'VAR-007',
    variantName: '4 inch',
    sku: 'HDPE-HD-400',
    size: '4"',
    length: '6 meters',
    weight: '32.5 kg/m',
    thickness: '12.0 mm',
    pressure: '10 bar',
    stock: 280,
    reorderPoint: 250,
    price: 2450,
    cost: 1850,
    monthlyUsage: 75,
    unitsSold: 480,
    status: 'In Stock',
    rawMaterials: [
      { name: 'HDPE Resin', quantity: 170.0, unit: 'kg', cost: 2445 },
      { name: 'UV Stabilizer', quantity: 9.8, unit: 'kg', cost: 555 },
      { name: 'Carbon Black', quantity: 4.2, unit: 'kg', cost: 210 },
    ],
    bulkDiscounts: [
      { minQty: 1, discount: 0, pricePerUnit: 2450 },
      { minQty: 5, discount: 5, pricePerUnit: 2328 },
      { minQty: 10, discount: 10, pricePerUnit: 2205 },
      { minQty: 25, discount: 15, pricePerUnit: 2083 },
    ],
  },
  {
    id: 'VAR-008',
    variantName: '6 inch',
    sku: 'HDPE-HD-600',
    size: '6"',
    length: '6 meters',
    weight: '58.5 kg/m',
    thickness: '16.0 mm',
    pressure: '10 bar',
    stock: 120,
    reorderPoint: 150,
    price: 3850,
    cost: 2920,
    monthlyUsage: 45,
    unitsSold: 280,
    status: 'Critical',
    rawMaterials: [
      { name: 'HDPE Resin', quantity: 308.0, unit: 'kg', cost: 4425 },
      { name: 'UV Stabilizer', quantity: 17.6, unit: 'kg', cost: 998 },
      { name: 'Carbon Black', quantity: 7.5, unit: 'kg', cost: 375 },
    ],
    bulkDiscounts: [
      { minQty: 1, discount: 0, pricePerUnit: 3850 },
      { minQty: 5, discount: 5, pricePerUnit: 3658 },
      { minQty: 10, discount: 10, pricePerUnit: 3465 },
      { minQty: 25, discount: 15, pricePerUnit: 3273 },
    ],
  },
];

const familyInfo = {
  name: 'Heavy Duty Industrial Pipes',
  familyCode: 'HDPE-HD',
  category: 'HDPE Pipes',
  description: 'Premium heavy-duty HDPE pipes designed for industrial applications requiring high pressure resistance and durability. Suitable for water distribution, chemical processing, mining operations, and industrial infrastructure.',
  manufacturer: 'Lamtex Industrial Corp.',
  warranty: '10 years',
  certification: 'ISO 9001, NSF-61',
};

export default function ProductFamilyPage() {
  const navigate = useNavigate();
  const { categoryName, familyId } = useParams<{ categoryName: string; familyId: string }>();
  const { selectedBranch } = useAppContext();
  const [selectedVariant, setSelectedVariant] = useState(mockVariants[2]); // Default to 1 inch
  const [comparisonView, setComparisonView] = useState<'table' | 'chart'>('table'); // Toggle between table and chart
  const [isEditingVariant, setIsEditingVariant] = useState(false);
  const [editedVariant, setEditedVariant] = useState<any>(null);
  const [showBulkDiscountModal, setShowBulkDiscountModal] = useState(false);
  const [showImageGalleryModal, setShowImageGalleryModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Product images for carousel
  const productImages = [hdpePipeImg, pipesImg, pressureLineImg];

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1));
  };

  const handleSelectImages = (imageUrls: string[]) => {
    // This is just for illustration - in a real app, would update the product images
    console.log('Selected images:', imageUrls);
    alert(`Selected ${imageUrls.length} image(s) for the product family!\n\n(Demo mode - images not actually saved)`);
  };

  const handleEditClick = () => {
    setIsEditingVariant(true);
    setEditedVariant({ ...selectedVariant });
  };

  const handleCancelEdit = () => {
    setIsEditingVariant(false);
    setEditedVariant(null);
  };

  const handleSaveEdit = () => {
    alert(`Variant saved successfully!\n\nVariant: ${editedVariant.variantName}\nSKU: ${editedVariant.sku}\nSize: ${editedVariant.size}\nPrice: ₱${editedVariant.price}\nStock: ${editedVariant.stock}`);
    // In real implementation, would update the data
    setSelectedVariant({ ...editedVariant });
    setIsEditingVariant(false);
    setEditedVariant(null);
  };

  const handleDeleteVariant = () => {
    const confirmDelete = window.confirm(
      `⚠️ DELETE VARIANT\n\n` +
      `Are you sure you want to permanently delete this variant?\n\n` +
      `Variant: ${selectedVariant.variantName} (${selectedVariant.size})\n` +
      `SKU: ${selectedVariant.sku}\n\n` +
      `WARNING: This action CANNOT be undone!\n` +
      `• All historical data will be lost\n` +
      `• Stock records will be removed\n` +
      `• Sales data will be deleted\n` +
      `• Associated orders may be affected\n\n` +
      `Type confirmation is required in production systems.`
    );

    if (confirmDelete) {
      alert(
        `Variant "${selectedVariant.variantName}" has been deleted.\n\n` +
        `In a real system, this would:\n` +
        `• Remove the variant from the database\n` +
        `• Archive all related records\n` +
        `• Update inventory counts\n` +
        `• Notify relevant departments`
      );
      // In real implementation, would delete from database and redirect
      // navigate(`/products/category/${categoryName}`);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditedVariant({ ...editedVariant, [field]: value });
  };

  const handleRawMaterialChange = (index: number, field: string, value: any) => {
    const updatedMaterials = [...editedVariant.rawMaterials];
    updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };
    setEditedVariant({ ...editedVariant, rawMaterials: updatedMaterials });
  };

  const handleAddMaterial = () => {
    const newMaterial = {
      name: availablePVCMaterials[0].name,
      quantity: 0,
      unit: availablePVCMaterials[0].unit,
      cost: 0,
    };
    setEditedVariant({
      ...editedVariant,
      rawMaterials: [...editedVariant.rawMaterials, newMaterial],
    });
  };

  const handleRemoveMaterial = (index: number) => {
    const updatedMaterials = editedVariant.rawMaterials.filter((_, i) => i !== index);
    setEditedVariant({ ...editedVariant, rawMaterials: updatedMaterials });
  };

  const handleMaterialNameChange = (index: number, materialName: string) => {
    const selectedMaterial = availablePVCMaterials.find(m => m.name === materialName);
    if (selectedMaterial) {
      const updatedMaterials = [...editedVariant.rawMaterials];
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        name: selectedMaterial.name,
        unit: selectedMaterial.unit,
      };
      setEditedVariant({ ...editedVariant, rawMaterials: updatedMaterials });
    }
  };

  const handleSaveBulkDiscounts = (discounts: any[]) => {
    if (isEditingVariant) {
      setEditedVariant({ ...editedVariant, bulkDiscounts: discounts });
    } else {
      setSelectedVariant({ ...selectedVariant, bulkDiscounts: discounts });
    }
  };

  const displayVariant = isEditingVariant ? editedVariant : selectedVariant;

  const categoryTitle = categoryName
    ? categoryName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'HDPE Pipes';

  // Calculate metrics for display variant
  const stockPercentage = (displayVariant.stock / displayVariant.reorderPoint) * 100;
  const avgDailyUsage = displayVariant.monthlyUsage / 30;
  const daysOfCover = Math.floor(displayVariant.stock / avgDailyUsage);
  const margin = ((displayVariant.price - displayVariant.cost) / displayVariant.price) * 100;

  const getStockColor = () => {
    if (displayVariant.status === 'Critical') return 'red';
    if (displayVariant.status === 'Low Stock') return 'orange';
    return 'green';
  };

  const getDaysOfCoverColor = () => {
    if (daysOfCover < 7) return 'text-red-600';
    if (daysOfCover < 14) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/products/category/${categoryName}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{familyInfo.name}</h1>
              <Badge variant="default">{familyInfo.category}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {familyInfo.familyCode} • {mockVariants.length} size variants available
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {isEditingVariant ? (
            <>
              <Button 
                variant="outline"
                onClick={handleCancelEdit}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                variant="primary"
                onClick={handleSaveEdit}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={handleEditClick}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit {displayVariant.variantName}
              </Button>
              <Button variant="primary">
                <Package className="w-4 h-4 mr-2" />
                Request Production
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Family Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Product Family Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Image Carousel */}
            <div className="md:col-span-1">
              <div className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                  <img
                    src={productImages[currentImageIndex]}
                    alt={`${familyInfo.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Edit Button - Top Right */}
                <button
                  onClick={() => setShowImageGalleryModal(true)}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2 rounded-lg shadow-lg transition-all hover:scale-105"
                  title="Edit product images"
                >
                  <Edit className="w-4 h-4 text-gray-700" />
                </button>

                {/* Navigation Arrows */}
                <button
                  onClick={handlePreviousImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>

                {/* Image Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {productImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-white w-6'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{familyInfo.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Manufacturer</p>
                    <p className="text-sm font-medium text-gray-900">{familyInfo.manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Warranty</p>
                    <p className="text-sm font-medium text-gray-900">{familyInfo.warranty}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Certifications</p>
                    <div className="flex gap-2">
                      {familyInfo.certification.split(', ').map((cert) => (
                        <Badge key={cert} variant="secondary" size="sm">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variant Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Variant</CardTitle>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditingVariant(true);
                setEditedVariant({
                  id: `VAR-NEW-${Date.now()}`,
                  variantName: '',
                  sku: '',
                  size: '',
                  length: '',
                  weight: '',
                  thickness: '',
                  pressure: '',
                  stock: 0,
                  reorderPoint: 0,
                  price: 0,
                  cost: 0,
                  monthlyUsage: 0,
                  unitsSold: 0,
                  status: 'In Stock',
                  rawMaterials: [],
                  bulkDiscounts: [],
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Variant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {mockVariants.map((variant) => {
              const isSelected = selectedVariant.id === variant.id;
              const variantColor = 
                variant.status === 'Critical' ? 'border-red-500 text-red-600' :
                variant.status === 'Low Stock' ? 'border-orange-500 text-orange-600' :
                'border-gray-300 text-gray-700';

              return (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`relative px-6 py-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'bg-red-600 border-red-600 text-white shadow-lg scale-105'
                      : `bg-white ${variantColor} hover:border-red-400 hover:shadow-md`
                  }`}
                >
                  <div className="font-semibold">{variant.size}</div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-red-100' : 'text-gray-500'}`}>
                    {variant.stock} units
                  </div>
                  {variant.status !== 'In Stock' && !isSelected && (
                    <div className="absolute -top-2 -right-2">
                      <div className={`w-3 h-3 rounded-full ${
                        variant.status === 'Critical' ? 'bg-red-500' : 'bg-orange-500'
                      }`}></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Variant Details - Dynamic based on selected variant */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">SKU</p>
              {isEditingVariant ? (
                <input
                  type="text"
                  value={editedVariant.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 font-mono text-sm"
                />
              ) : (
                <p className="font-mono text-sm text-gray-900">{displayVariant.sku}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Name</p>
              {isEditingVariant ? (
                <input
                  type="text"
                  value={editedVariant.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm font-semibold"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-900">{displayVariant.size}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
              {isEditingVariant ? (
                <select
                  value={editedVariant.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm"
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Critical">Critical</option>
                </select>
              ) : (
                <Badge
                  variant={
                    displayVariant.status === 'Critical' ? 'destructive' :
                    displayVariant.status === 'Low Stock' ? 'warning' : 'success'
                  }
                >
                  {displayVariant.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Levels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase">Current Stock</p>
                {isEditingVariant ? (
                  <input
                    type="number"
                    value={editedVariant.stock}
                    onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                    className="border rounded px-3 py-1 text-lg font-bold w-32 text-right"
                  />
                ) : (
                  <p className="text-lg font-bold text-gray-900">
                    {displayVariant.stock.toLocaleString()} units
                  </p>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div
                  className={`h-2 rounded-full bg-${getStockColor()}-500`}
                  style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Reorder Point:</p>
                {isEditingVariant ? (
                  <input
                    type="number"
                    value={editedVariant.reorderPoint}
                    onChange={(e) => handleInputChange('reorderPoint', parseInt(e.target.value) || 0)}
                    className="border rounded px-2 py-1 text-xs w-24 text-right"
                  />
                ) : (
                  <p className="text-xs text-gray-500">{displayVariant.reorderPoint} units</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Days of Cover</p>
              <p className={`text-lg font-bold ${getDaysOfCoverColor()}`}>
                {daysOfCover} days
              </p>
            </div>
            {(displayVariant.status === 'Critical' || displayVariant.status === 'Low Stock') && (
              <div className={`flex items-start gap-2 p-3 rounded-lg ${
                displayVariant.status === 'Critical' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
              }`}>
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  displayVariant.status === 'Critical' ? 'text-red-600' : 'text-orange-600'
                }`} />
                <div className={`text-xs ${
                  displayVariant.status === 'Critical' ? 'text-red-700' : 'text-orange-700'
                }`}>
                  <span className="font-semibold">{displayVariant.status}!</span> Consider immediate production scheduling.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Selling Price</p>
              {isEditingVariant ? (
                <input
                  type="number"
                  value={editedVariant.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className="border rounded px-3 py-1.5 text-2xl font-bold w-full"
                  placeholder="0.00"
                />
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    ₱{displayVariant.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">per unit</p>
                </>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Production Cost</p>
              {isEditingVariant ? (
                <input
                  type="number"
                  value={editedVariant.cost}
                  onChange={(e) => handleInputChange('cost', parseFloat(e.target.value) || 0)}
                  className="border rounded px-3 py-1.5 text-lg font-semibold w-full"
                  placeholder="0.00"
                />
              ) : (
                <p className="text-lg font-semibold text-gray-600">
                  ₱{displayVariant.cost.toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Margin</p>
              <p className="text-lg font-bold text-green-600">{margin.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Raw Material Consumption */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="w-4 h-4 text-blue-600" />
                Raw Material Consumption (per unit)
              </CardTitle>
              {isEditingVariant && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddMaterial}
                  className="h-8 px-3 py-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Material
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {displayVariant.rawMaterials && displayVariant.rawMaterials.length > 0 ? (
              <div className="space-y-3">
                {displayVariant.rawMaterials.map((material, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      {isEditingVariant ? (
                        <select
                          value={editedVariant.rawMaterials[index].name}
                          onChange={(e) => handleMaterialNameChange(index, e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm font-medium mb-2"
                        >
                          {availablePVCMaterials.map((mat) => (
                            <option key={mat.id} value={mat.name}>
                              {mat.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 mb-1">{material.name}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {isEditingVariant ? (
                          <>
                            <input
                              type="number"
                              value={editedVariant.rawMaterials[index].quantity}
                              onChange={(e) => handleRawMaterialChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="border rounded px-2 py-1 text-xs w-20"
                              placeholder="0"
                            />
                            <span className="text-xs text-gray-500">{material.unit}</span>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">
                            {material.quantity} {material.unit}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {isEditingVariant ? (
                        <input
                          type="number"
                          value={editedVariant.rawMaterials[index].cost}
                          onChange={(e) => handleRawMaterialChange(index, 'cost', parseFloat(e.target.value) || 0)}
                          className="border rounded px-2 py-1 text-sm font-bold w-24 text-right"
                          placeholder="0"
                        />
                      ) : (
                        <>
                          <p className="text-sm font-bold text-gray-900">₱{material.cost.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">cost</p>
                        </>
                      )}
                    </div>
                    {isEditingVariant && (
                      <button
                        onClick={() => handleRemoveMaterial(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                        title="Remove material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Material Cost:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ₱{displayVariant.rawMaterials.reduce((sum, m) => sum + m.cost, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No material data available</p>
            )}
          </CardContent>
        </Card>

        {/* Bulk Order Discounts */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="w-4 h-4 text-orange-600" />
                Bulk Order Discounts
              </CardTitle>
              <Button 
                variant="outline" 
                className="text-xs h-7 px-2"
                onClick={() => setShowBulkDiscountModal(true)}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit Rules
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {displayVariant.bulkDiscounts && displayVariant.bulkDiscounts.length > 0 ? (
              <div className="space-y-2">
                {displayVariant.bulkDiscounts.map((tier, index) => {
                  const savings = tier.discount > 0 
                    ? displayVariant.price - tier.pricePerUnit 
                    : 0;
                  
                  return (
                    <div
                      key={index}
                      className="p-3 rounded-lg border-2 bg-white border-gray-200 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-sm">
                            {tier.minQty}+
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Buy {tier.minQty}+ units
                            </p>
                            {tier.discount > 0 && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                Save ₱{savings.toLocaleString()} per unit
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            ₱{tier.pricePerUnit.toLocaleString()}
                            <span className="text-xs font-normal text-gray-500">/unit</span>
                          </p>
                          {tier.discount > 0 ? (
                            <p className="text-xs font-medium text-orange-600 mt-0.5">
                              -{tier.discount}%
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Base price
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Info Note */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-900">
                      These discount tiers are automatically applied when creating purchase orders based on quantity.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-3">No bulk discount rules configured</p>
                <Button 
                  variant="outline"
                  onClick={() => setShowBulkDiscountModal(true)}
                >
                  <Percent className="w-4 h-4 mr-2" />
                  Set Up Discounts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Specs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="w-4 h-4 text-purple-600" />
              Technical Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Length</p>
              {isEditingVariant ? (
                <input
                  type="text"
                  value={editedVariant.length}
                  onChange={(e) => handleInputChange('length', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm font-medium"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">{displayVariant.length}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Weight</p>
              {isEditingVariant ? (
                <input
                  type="text"
                  value={editedVariant.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm font-medium"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">{displayVariant.weight}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Wall Thickness</p>
              {isEditingVariant ? (
                <input
                  type="text"
                  value={editedVariant.thickness}
                  onChange={(e) => handleInputChange('thickness', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm font-medium"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">{displayVariant.thickness}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Pressure Rating</p>
              {isEditingVariant ? (
                <input
                  type="text"
                  value={editedVariant.pressure}
                  onChange={(e) => handleInputChange('pressure', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm font-medium"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">{displayVariant.pressure}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage & Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Usage & Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Monthly Usage</p>
              {isEditingVariant ? (
                <input
                  type="number"
                  value={editedVariant.monthlyUsage}
                  onChange={(e) => handleInputChange('monthlyUsage', parseInt(e.target.value) || 0)}
                  className="w-full border rounded px-3 py-1.5 text-lg font-semibold"
                />
              ) : (
                <p className="text-lg font-semibold text-gray-900">
                  {displayVariant.monthlyUsage.toLocaleString()} units
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Avg. Daily Usage</p>
              <p className="text-sm font-medium text-gray-600">
                {avgDailyUsage.toFixed(1)} units/day
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Units Sold YTD</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-green-600">
                  {displayVariant.unitsSold.toLocaleString()}
                </p>
                <Badge variant="success" size="sm">+12%</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Revenue YTD</p>
              <p className="text-lg font-bold text-green-600">
                ₱{((selectedVariant.unitsSold * selectedVariant.price) / 1000).toFixed(0)}K
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Production Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="w-4 h-4 text-blue-600" />
              Production Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Lead Time</p>
              <p className="text-sm font-medium text-gray-900">7-10 days</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Min. Order Qty</p>
              <p className="text-sm font-medium text-gray-900">100 units</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Last Production</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Jan 28, 2026</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Next Scheduled</p>
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <Calendar className="w-4 h-4" />
                <span>Feb 15, 2026</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variant Comparison Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Variants Comparison</CardTitle>
            <div className="flex gap-2">
              <button
                onClick={() => setComparisonView('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  comparisonView === 'table'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <TableIcon className="w-4 h-4" />
                Table
              </button>
              <button
                onClick={() => setComparisonView('chart')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  comparisonView === 'chart'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Chart
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {comparisonView === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Size</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">SKU</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Stock</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Price</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Monthly Usage</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Units Sold</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockVariants.map((variant) => {
                    const isSelected = selectedVariant.id === variant.id;
                    return (
                      <tr
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${
                          isSelected ? 'bg-red-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${isSelected ? 'text-red-600' : 'text-gray-900'}`}>
                            {variant.size}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-gray-600">{variant.sku}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${
                            variant.status === 'Critical' ? 'text-red-600' :
                            variant.status === 'Low Stock' ? 'text-orange-600' :
                            'text-gray-900'
                          }`}>
                            {variant.stock.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          ₱{variant.price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {variant.monthlyUsage}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {variant.unitsSold.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              variant.status === 'Critical' ? 'destructive' :
                              variant.status === 'Low Stock' ? 'warning' : 'success'
                            }
                            size="sm"
                          >
                            {variant.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(() => {
                    // Generate 12 months of mock data
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return months.map((month, index) => {
                      const dataPoint: any = { month };
                      mockVariants.forEach(variant => {
                        // Create variation around base monthly usage (±15%)
                        const variation = (Math.sin(index * 0.5) * 0.15 + 1);
                        dataPoint[variant.variantName] = Math.round(variant.monthlyUsage * variation);
                      });
                      return dataPoint;
                    });
                  })()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Monthly Usage (units)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="line"
                  />
                  {mockVariants.map(variant => (
                    <Line
                      key={variant.id}
                      type="monotone"
                      dataKey={variant.variantName}
                      name={`${variant.size} (${variant.sku})`}
                      stroke={stringToColor(variant.variantName)}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Variant Section - Only visible in edit mode */}
      {isEditingVariant && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-red-900 mb-1">Danger Zone</h3>
                  <p className="text-sm text-red-700 mb-2">
                    Permanently delete this variant from the system. This action cannot be undone.
                  </p>
                  <ul className="text-xs text-red-600 space-y-1 ml-4 list-disc">
                    <li>All historical data will be permanently removed</li>
                    <li>Stock records and inventory will be deleted</li>
                    <li>Sales history and analytics will be lost</li>
                    <li>Associated production orders may be affected</li>
                  </ul>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleDeleteVariant}
                className="bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 px-6"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Variant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Discount Modal */}
      <BulkDiscountModal
        isOpen={showBulkDiscountModal}
        onClose={() => setShowBulkDiscountModal(false)}
        onSave={handleSaveBulkDiscounts}
        currentDiscounts={displayVariant.bulkDiscounts || []}
        basePrice={displayVariant.price || 0}
        variantName={displayVariant.size || displayVariant.variantName || 'this variant'}
      />

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showImageGalleryModal}
        onClose={() => setShowImageGalleryModal(false)}
        onSelectImages={handleSelectImages}
        maxImages={999}
        currentImages={productImages}
      />
    </div>
  );
}
