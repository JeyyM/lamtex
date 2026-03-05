import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

// Material Symbol icons for general retail categories
const MATERIAL_ICONS = [
  // Default & General Commerce
  'category', 'shopping_cart', 'store', 'storefront', 'shopping_bag',
  'inventory_2', 'new_releases', 'trending_up', 'local_offer', 'sell',
  
  // Fashion & Apparel
  'checkroom', 'styler', 'face_retouching_natural', 'watch', 'diamond',
  'credit_card', 'wallet', 'redeem', 'local_mall', 'spa',
  
  // Food & Beverage
  'restaurant', 'local_cafe', 'bakery_dining', 'wine_bar', 'local_bar',
  'cake', 'restaurant_menu', 'lunch_dining', 'coffee', 'icecream',
  
  // Electronics & Technology
  'devices', 'computer', 'smartphone', 'headphones', 'tv',
  'camera_alt', 'videogame_asset', 'cable', 'outlet', 'electrical_services',
  
  // Home & Garden
  'home', 'chair', 'bed', 'table_restaurant', 'yard',
  'local_florist', 'grass', 'kitchen', 'bathroom', 'light',
  
  // Health & Beauty
  'medical_services', 'healing', 'medication', 'fitness_center', 'face',
  'self_care', 'brush', 'palette', 'colorize', 'directions_car',
  
  // Automotive & Transportation
  'two_wheeler', 'pedal_bike', 'local_gas_station', 'car_repair', 'tire_repair',
  'garage', 'oil_barrel', 'battery_charging_full', 'speed', 'menu_book',
  
  // Books & Sports
  'library_books', 'school', 'music_note', 'movie', 'sports_esports',
  'art_track', 'piano', 'photo', 'sports_soccer', 'sports_basketball',
  
  // Tools & Business
  'build', 'handyman', 'construction', 'home_repair_service', 'plumbing',
  'business', 'work', 'corporate_fare', 'apartment', 'domain'
];

const ICONS_PER_PAGE = 25;

interface CategoryIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string) => void;
  currentIcon?: string;
}

const CategoryIconModal: React.FC<CategoryIconModalProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
  currentIcon = 'category'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);

  // Filter icons based on search query
  const filteredIcons = MATERIAL_ICONS.filter(icon => 
    icon.toLowerCase().includes(searchQuery.toLowerCase()) ||
    icon.replace(/_/g, ' ').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredIcons.length / ICONS_PER_PAGE);
  const currentIcons = filteredIcons.slice(
    currentPage * ICONS_PER_PAGE,
    (currentPage + 1) * ICONS_PER_PAGE
  );

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon);
    onSelectIcon(icon);
    onClose();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0); // Reset to first page when searching
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Choose Category Icon</h3>
              <p className="text-sm text-gray-500 mt-1">
                Select a Material Symbol icon for your category
              </p>
            </div>
            <button 
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search icons... (e.g., store, tools, food)"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>
        
        {/* Icon Grid */}
        <div className="flex-1 overflow-hidden p-6">
          {filteredIcons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">search_off</span>
              <p className="text-gray-500 font-medium">No icons found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3 h-full overflow-y-auto">
              {currentIcons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => handleIconSelect(icon)}
                  className={`aspect-square rounded-xl border-2 p-3 transition-all hover:scale-105 flex flex-col items-center justify-center gap-1 group ${
                    selectedIcon === icon 
                      ? 'border-red-600 bg-red-50 text-red-600' 
                      : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 text-gray-600'
                  }`}
                  title={icon.replace(/_/g, ' ')}
                >
                  <span className={`material-symbols-outlined text-2xl ${
                    selectedIcon === icon ? 'text-red-600' : 'text-gray-600 group-hover:text-red-600'
                  }`}>
                    {icon}
                  </span>
                  <span className={`text-[10px] leading-tight text-center line-clamp-2 ${
                    selectedIcon === icon ? 'text-red-600 font-medium' : 'text-gray-500 group-hover:text-red-600'
                  }`}>
                    {icon.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between rounded-b-xl">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
              Previous
            </button>
            <span className="text-sm text-gray-600 font-medium">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              Next
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryIconModal;
