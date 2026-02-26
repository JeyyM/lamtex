import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Filter, ChevronDown, 
  UserCheck, Truck, Package, Settings, Briefcase,
  Phone, Mail, MapPin, Calendar, Award, TrendingUp
} from 'lucide-react';
import { allEmployees } from '../mock/employees';
import { EmployeeRole, EmployeeDetails } from '../types/employee';

const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | 'all'>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Filter employees
  const filteredEmployees = allEmployees.filter(employee => {
    const matchesSearch = employee.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || employee.role === selectedRole;
    const matchesBranch = selectedBranch === 'all' || employee.branchId === selectedBranch;
    return matchesSearch && matchesRole && matchesBranch;
  });

  // Get role stats
  const roleStats = {
    'Sales Agent': allEmployees.filter(e => e.role === 'Sales Agent').length,
    'Logistics Manager': allEmployees.filter(e => e.role === 'Logistics Manager').length,
    'Warehouse Manager': allEmployees.filter(e => e.role === 'Warehouse Manager').length,
    'Machine Worker': allEmployees.filter(e => e.role === 'Machine Worker').length,
    'Truck Driver': allEmployees.filter(e => e.role === 'Truck Driver').length,
  };

  const getRoleIcon = (role: EmployeeRole) => {
    switch (role) {
      case 'Sales Agent': return UserCheck;
      case 'Logistics Manager': return Truck;
      case 'Warehouse Manager': return Package;
      case 'Machine Worker': return Settings;
      case 'Truck Driver': return Truck;
      default: return Users;
    }
  };

  const getRoleColor = (role: EmployeeRole) => {
    switch (role) {
      case 'Sales Agent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Logistics Manager': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Warehouse Manager': return 'bg-green-100 text-green-700 border-green-200';
      case 'Machine Worker': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Truck Driver': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Group employees by role
  const groupedEmployees = {
    'Sales Agent': filteredEmployees.filter(e => e.role === 'Sales Agent'),
    'Logistics Manager': filteredEmployees.filter(e => e.role === 'Logistics Manager'),
    'Warehouse Manager': filteredEmployees.filter(e => e.role === 'Warehouse Manager'),
    'Machine Worker': filteredEmployees.filter(e => e.role === 'Machine Worker'),
    'Truck Driver': filteredEmployees.filter(e => e.role === 'Truck Driver'),
  };

  const renderEmployeeDetails = (employee: EmployeeDetails) => {
    switch (employee.role) {
      case 'Sales Agent':
        return (
          <>
            <div>
              <span className="text-gray-600">Customers</span>
              <p className="font-semibold text-gray-900">{employee.activeCustomers}</p>
            </div>
            <div>
              <span className="text-gray-600">Revenue</span>
              <p className="font-semibold text-gray-900">₱{(employee.totalRevenue / 1000000).toFixed(2)}M</p>
            </div>
            <div>
              <span className="text-gray-600">Commission</span>
              <p className="font-semibold text-gray-900">₱{(employee.commission / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <span className="text-gray-600">Tier</span>
              <p className="font-semibold text-gray-900">{employee.commissionTier}</p>
            </div>
          </>
        );
      case 'Logistics Manager':
        return (
          <>
            <div>
              <span className="text-gray-600">Deliveries</span>
              <p className="font-semibold text-gray-900">{employee.deliveriesManaged}</p>
            </div>
            <div>
              <span className="text-gray-600">On-Time Rate</span>
              <p className="font-semibold text-gray-900">{employee.onTimeDeliveryRate}%</p>
            </div>
            <div>
              <span className="text-gray-600">Trucks</span>
              <p className="font-semibold text-gray-900">{employee.trucksManaged}</p>
            </div>
            <div>
              <span className="text-gray-600">Routes</span>
              <p className="font-semibold text-gray-900">{employee.routesOptimized}</p>
            </div>
          </>
        );
      case 'Warehouse Manager':
        return (
          <>
            <div>
              <span className="text-gray-600">Accuracy</span>
              <p className="font-semibold text-gray-900">{employee.inventoryAccuracy}%</p>
            </div>
            <div>
              <span className="text-gray-600">Size</span>
              <p className="font-semibold text-gray-900">{employee.warehouseSize}</p>
            </div>
            <div>
              <span className="text-gray-600">Staff</span>
              <p className="font-semibold text-gray-900">{employee.staffManaged}</p>
            </div>
            <div>
              <span className="text-gray-600">Orders</span>
              <p className="font-semibold text-gray-900">{employee.ordersProcessed}</p>
            </div>
          </>
        );
      case 'Machine Worker':
        return (
          <>
            <div>
              <span className="text-gray-600">Machine</span>
              <p className="font-semibold text-gray-900 text-xs">{employee.machineType}</p>
            </div>
            <div>
              <span className="text-gray-600">Shifts</span>
              <p className="font-semibold text-gray-900">{employee.shiftsCompleted}</p>
            </div>
            <div>
              <span className="text-gray-600">Output</span>
              <p className="font-semibold text-gray-900">{(employee.productionOutput / 1000).toFixed(1)}K units</p>
            </div>
            <div>
              <span className="text-gray-600">Efficiency</span>
              <p className="font-semibold text-gray-900">{employee.efficiencyRate}%</p>
            </div>
          </>
        );
      case 'Truck Driver':
        return (
          <>
            <div>
              <span className="text-gray-600">Truck</span>
              <p className="font-semibold text-gray-900 text-xs">{employee.truckNumber}</p>
            </div>
            <div>
              <span className="text-gray-600">Plate</span>
              <p className="font-semibold text-gray-900">{employee.licensePlate}</p>
            </div>
            <div>
              <span className="text-gray-600">Deliveries</span>
              <p className="font-semibold text-gray-900">{employee.deliveriesCompleted}</p>
            </div>
            <div>
              <span className="text-gray-600">Distance</span>
              <p className="font-semibold text-gray-900">{(employee.distanceCovered / 1000).toFixed(0)}K km</p>
            </div>
          </>
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
        <p className="text-gray-600 mt-1">Manage all company employees across departments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Sales Agents</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{roleStats['Sales Agent']}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Logistics Mgrs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{roleStats['Logistics Manager']}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Warehouse Mgrs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{roleStats['Warehouse Manager']}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">Machine Workers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{roleStats['Machine Worker']}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-gray-600">Truck Drivers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{roleStats['Truck Driver']}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as EmployeeRole | 'all')}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white min-w-[200px]"
            >
              <option value="all">All Roles</option>
              <option value="Sales Agent">Sales Agents</option>
              <option value="Logistics Manager">Logistics Managers</option>
              <option value="Warehouse Manager">Warehouse Managers</option>
              <option value="Machine Worker">Machine Workers</option>
              <option value="Truck Driver">Truck Drivers</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white min-w-[180px]"
            >
              <option value="all">All Branches</option>
              <option value="BR-001">Quezon City</option>
              <option value="BR-002">Makati</option>
              <option value="BR-003">Cebu</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredEmployees.length}</span> of <span className="font-semibold text-gray-900">{allEmployees.length}</span> employees
        </div>
      </div>

      {/* Grouped Employee Sections */}
      <div className="space-y-8">
        {Object.entries(groupedEmployees).map(([role, employees]) => {
          if (employees.length === 0) return null;
          
          const RoleIcon = getRoleIcon(role as EmployeeRole);
          const roleColor = getRoleColor(role as EmployeeRole);
          
          return (
            <div key={role}>
              {/* Role Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${roleColor}`}>
                  <RoleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{role}s</h2>
                  <p className="text-sm text-gray-600">{employees.length} employee{employees.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Employee Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {employees.map((employee) => (
                  <div
                    key={employee.employeeId}
                    onClick={() => navigate('/employees/AGT-001')}
                    className="bg-white rounded-lg border-2 border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${roleColor}`}>
                          <RoleIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {employee.employeeName}
                          </h3>
                          <p className="text-xs text-gray-600">{employee.employeeId}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        employee.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : employee.status === 'on-leave'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {employee.status.charAt(0).toUpperCase() + employee.status.slice(1).replace('-', ' ')}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{employee.branchName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{employee.tenure} months</span>
                      </div>
                    </div>

                    {/* Role-specific details */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {renderEmployeeDetails(employee)}
                      </div>
                    </div>

                    {/* Action hint */}
                    <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                      <span className="text-xs text-blue-600 font-medium group-hover:text-blue-700">
                        Click to view profile →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredEmployees.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
