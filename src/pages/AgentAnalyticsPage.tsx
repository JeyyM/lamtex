import React, { useState } from 'react';
import { 
  Users, TrendingUp, Award, Target, DollarSign, ShoppingCart,
  UserCheck, Clock, Package, MapPin, Star, Trophy, Zap,
  Calendar, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp,
  Filter, Search, BarChart3, PieChart, Activity, Percent
} from 'lucide-react';
import { mockAgentAnalytics, mockBranchAnalytics } from '../mock/agentAnalytics';
import { AgentAnalytics, TimePeriod, SortField } from '../types/agentAnalytics';

const AgentAnalyticsPage: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentAnalytics | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [sortBy, setSortBy] = useState<SortField>('revenue');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('quarter');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Filter and sort agents
  const filteredAgents = mockAgentAnalytics
    .filter(agent => {
      const matchesSearch = agent.agentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = selectedBranch === 'all' || agent.branchId === selectedBranch;
      return matchesSearch && matchesBranch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.salesPerformance.totalRevenue - a.salesPerformance.totalRevenue;
        case 'orders':
          return b.salesPerformance.numberOfOrders - a.salesPerformance.numberOfOrders;
        case 'aov':
          return b.salesPerformance.averageOrderValue - a.salesPerformance.averageOrderValue;
        case 'conversion':
          return b.salesPerformance.sellRate - a.salesPerformance.sellRate;
        case 'retention':
          return b.customerMetrics.customerRetentionRate - a.customerMetrics.customerRetentionRate;
        case 'customers':
          return b.customerMetrics.activeCustomers - a.customerMetrics.activeCustomers;
        case 'commission':
          return b.financialMetrics.commissionEarned - a.financialMetrics.commissionEarned;
        default:
          return 0;
      }
    });

  // Calculate company-wide stats
  const companyStats = {
    totalRevenue: mockAgentAnalytics.reduce((sum, a) => sum + a.salesPerformance.totalRevenue, 0),
    totalOrders: mockAgentAnalytics.reduce((sum, a) => sum + a.salesPerformance.numberOfOrders, 0),
    totalAgents: mockAgentAnalytics.length,
    avgSellRate: mockAgentAnalytics.reduce((sum, a) => sum + a.salesPerformance.sellRate, 0) / mockAgentAnalytics.length,
    totalCommission: mockAgentAnalytics.reduce((sum, a) => sum + a.financialMetrics.commissionEarned, 0),
  };

  const formatCurrency = (value: number) => {
    return `₱${(value / 1000000).toFixed(2)}M`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Analytics</h1>
          <p className="text-gray-600 mt-1">Performance tracking and insights</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'detailed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Detailed View
          </button>
        </div>
      </div>

      {/* Company-Wide KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(companyStats.totalRevenue)}</div>
          <div className="text-xs opacity-75 mt-1">This quarter</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Total Orders</span>
          </div>
          <div className="text-2xl font-bold">{formatNumber(companyStats.totalOrders)}</div>
          <div className="text-xs opacity-75 mt-1">All agents</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Active Agents</span>
          </div>
          <div className="text-2xl font-bold">{companyStats.totalAgents}</div>
          <div className="text-xs opacity-75 mt-1">Across all branches</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Avg Sell Rate</span>
          </div>
          <div className="text-2xl font-bold">{companyStats.avgSellRate.toFixed(1)}%</div>
          <div className="text-xs opacity-75 mt-1">Conversion rate</div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Total Commission</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(companyStats.totalCommission)}</div>
          <div className="text-xs opacity-75 mt-1">Paid out</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Branches</option>
              {mockBranchAnalytics.map(branch => (
                <option key={branch.branchId} value={branch.branchId}>
                  {branch.branchName}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="revenue">Sort by Revenue</option>
              <option value="orders">Sort by Orders</option>
              <option value="aov">Sort by AOV</option>
              <option value="conversion">Sort by Conversion</option>
              <option value="retention">Sort by Retention</option>
              <option value="customers">Sort by Customers</option>
              <option value="commission">Sort by Commission</option>
            </select>
          </div>

          {/* Time Period */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agent Cards - Overview Mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div
              key={agent.agentId}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedAgent(agent)}
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {agent.agentName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{agent.agentName}</h3>
                    <p className="text-sm text-gray-600">{agent.branchName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-semibold">#{agent.ranking.rankByRevenue}</span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(agent.salesPerformance.totalRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Orders</span>
                  <span className="font-semibold text-gray-900">
                    {formatNumber(agent.salesPerformance.numberOfOrders)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">AOV</span>
                  <span className="font-semibold text-gray-900">
                    ₱{formatNumber(agent.salesPerformance.averageOrderValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="font-semibold text-gray-900">
                    {agent.salesPerformance.sellRate}%
                  </span>
                </div>
              </div>

              {/* Target Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Target Achievement</span>
                  <span className={`text-xs font-semibold ${
                    agent.targets.targetAchievementRate >= 100 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {agent.targets.targetAchievementRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      agent.targets.targetAchievementRate >= 100 ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(agent.targets.targetAchievementRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                {agent.incentives.badges.slice(0, 3).map((badge, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              {/* Growth Indicator */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {getTrendIcon(agent.salesPerformance.salesGrowthRate)}
                  <span className={`text-sm font-semibold ${getTrendColor(agent.salesPerformance.salesGrowthRate)}`}>
                    {Math.abs(agent.salesPerformance.salesGrowthRate).toFixed(1)}% MoM
                  </span>
                </div>
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Table View */}
      {viewMode === 'detailed' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    AOV
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Conversion
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customers
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Growth
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rank
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.agentId}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <td className="px-4 py-2.5">
                      <div>
                        <div className="font-semibold text-gray-900">{agent.agentName}</div>
                        <div className="text-xs text-gray-600">{agent.branchName}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                      {formatCurrency(agent.salesPerformance.totalRevenue)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-900">
                      {formatNumber(agent.salesPerformance.numberOfOrders)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-900">
                      ₱{formatNumber(agent.salesPerformance.averageOrderValue)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                        {agent.salesPerformance.sellRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-900">
                      {agent.customerMetrics.activeCustomers}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-green-600">
                      ₱{formatNumber(agent.financialMetrics.commissionEarned)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                        agent.targets.targetAchievementRate >= 110
                          ? 'bg-green-100 text-green-700'
                          : agent.targets.targetAchievementRate >= 100
                          ? 'bg-blue-100 text-blue-700'
                          : agent.targets.targetAchievementRate >= 90
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {agent.targets.targetAchievementRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getTrendIcon(agent.salesPerformance.salesGrowthRate)}
                        <span className={`font-semibold text-sm ${getTrendColor(agent.salesPerformance.salesGrowthRate)}`}>
                          {Math.abs(agent.salesPerformance.salesGrowthRate).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold text-xs">
                        <Trophy className="w-3 h-3" />
                        #{agent.ranking.rankByRevenue}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Branch Performance Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-600" />
          Branch Performance Comparison
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockBranchAnalytics.map((branch) => (
            <div key={branch.branchId} className="border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{branch.branchName}</h3>
                  <p className="text-sm text-gray-600">{branch.location}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Rank</div>
                  <div className="font-bold text-lg text-blue-600">#{branch.rankByRevenue}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Revenue</span>
                  <span className="font-bold text-gray-900">{formatCurrency(branch.salesPerformance.totalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Orders</span>
                  <span className="font-semibold text-gray-900">{formatNumber(branch.salesPerformance.totalOrders)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Avg AOV</span>
                  <span className="font-semibold text-gray-900">₱{formatNumber(branch.salesPerformance.averageOrderValue)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Agents</span>
                  <span className="font-semibold text-gray-900">{branch.teamDynamics.agentCount}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <span className="font-semibold text-green-600">{branch.financials.branchProfitMargin}%</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Collection Rate</span>
                  <span className="font-semibold text-blue-600">{branch.financials.collectionEfficiency}%</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Target Achievement</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      branch.targets.targetAchievementRate >= 100 ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(branch.targets.targetAchievementRate, 100)}%` }}
                  />
                </div>
                <div className="text-xs font-semibold text-right mt-1 text-gray-900">
                  {branch.targets.targetAchievementRate.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {selectedAgent.agentName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedAgent.agentName}</h2>
                  <p className="text-gray-600">{selectedAgent.branchName} Branch • {selectedAgent.operationalMetrics.territoryCoverage}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Top Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-700 font-medium mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold text-blue-900">{formatCurrency(selectedAgent.salesPerformance.totalRevenue)}</div>
                  <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    {getTrendIcon(selectedAgent.salesPerformance.salesGrowthRate)}
                    {Math.abs(selectedAgent.salesPerformance.salesGrowthRate).toFixed(1)}% growth
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-green-700 font-medium mb-1">Total Orders</div>
                  <div className="text-2xl font-bold text-green-900">{formatNumber(selectedAgent.salesPerformance.numberOfOrders)}</div>
                  <div className="text-xs text-green-600 mt-1">Rank #{selectedAgent.ranking.rankByOrders}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-700 font-medium mb-1">Conversion Rate</div>
                  <div className="text-2xl font-bold text-purple-900">{selectedAgent.salesPerformance.sellRate}%</div>
                  <div className="text-xs text-purple-600 mt-1">Rank #{selectedAgent.ranking.rankByConversionRate}</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="text-sm text-orange-700 font-medium mb-1">Commission Earned</div>
                  <div className="text-2xl font-bold text-orange-900">₱{formatNumber(selectedAgent.financialMetrics.commissionEarned)}</div>
                  <div className="text-xs text-orange-600 mt-1">{selectedAgent.incentives.bonusTier}</div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Sales Performance */}
                  <div className="border border-gray-200 rounded-lg p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Sales Performance
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Order Value</span>
                        <span className="font-semibold">₱{formatNumber(selectedAgent.salesPerformance.averageOrderValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Revenue per Customer</span>
                        <span className="font-semibold">₱{formatNumber(selectedAgent.salesPerformance.revenuePerCustomer)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Upsell Rate</span>
                        <span className="font-semibold">{selectedAgent.salesPerformance.upsellRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Quote to Order Ratio</span>
                        <span className="font-semibold">{selectedAgent.salesPerformance.quoteToOrderRatio}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Lifetime Revenue</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(selectedAgent.salesPerformance.totalRevenueLifetime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Metrics */}
                  <div className="border border-gray-200 rounded-lg p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-green-600" />
                      Customer Metrics
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Customers</span>
                        <span className="font-semibold">{selectedAgent.customerMetrics.activeCustomers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">New Customers</span>
                        <span className="font-semibold text-green-600">+{selectedAgent.customerMetrics.newCustomersAcquired}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Retention Rate</span>
                        <span className="font-semibold">{selectedAgent.customerMetrics.customerRetentionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Customer Lifetime Value</span>
                        <span className="font-semibold">₱{formatNumber(selectedAgent.customerMetrics.averageCustomerLifetimeValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Satisfaction Score</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="font-semibold">{selectedAgent.customerMetrics.customerSatisfactionScore}/5.0</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="border border-gray-200 rounded-lg p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-purple-600" />
                      Financial Metrics
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Profit Margin</span>
                        <span className="font-semibold text-green-600">{selectedAgent.financialMetrics.averageProfitMargin}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Discount Rate Given</span>
                        <span className="font-semibold">{selectedAgent.financialMetrics.discountRateGiven}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Payment Collection Rate</span>
                        <span className="font-semibold text-blue-600">{selectedAgent.financialMetrics.paymentCollectionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Outstanding Receivables</span>
                        <span className="font-semibold text-orange-600">₱{formatNumber(selectedAgent.financialMetrics.outstandingReceivables)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Bad Debt Rate</span>
                        <span className="font-semibold">{selectedAgent.financialMetrics.badDebtRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Operational Metrics */}
                  <div className="border border-gray-200 rounded-lg p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-orange-600" />
                      Operational Efficiency
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Fulfillment Time</span>
                        <span className="font-semibold">{selectedAgent.operationalMetrics.orderFulfillmentTime} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Accuracy Rate</span>
                        <span className="font-semibold text-green-600">{selectedAgent.operationalMetrics.orderAccuracyRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Response Time</span>
                        <span className="font-semibold">{selectedAgent.operationalMetrics.responseTime} hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Visit Frequency</span>
                        <span className="font-semibold">{selectedAgent.operationalMetrics.visitFrequency}x/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Quotation Volume</span>
                        <span className="font-semibold">{selectedAgent.operationalMetrics.quotationVolume}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Cycle Time</span>
                        <span className="font-semibold">{selectedAgent.operationalMetrics.orderCycleTime} days</span>
                      </div>
                    </div>
                  </div>

                  {/* Product Insights */}
                  <div className="border border-gray-200 rounded-lg p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-pink-600" />
                      Product Insights
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Best Selling Product</span>
                        <div className="font-semibold text-blue-600 mt-1">{selectedAgent.productInsights.bestSellingProduct}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Highest Margin Product</span>
                        <div className="font-semibold text-green-600 mt-1">{selectedAgent.productInsights.highestMarginProduct}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-2">Product Category Mix</span>
                        {selectedAgent.productInsights.productCategoryMix.map((cat) => (
                          <div key={cat.category} className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>{cat.category}</span>
                              <span className="font-semibold">{cat.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">New Product Adoption</span>
                        <span className="font-semibold">{selectedAgent.productInsights.newProductAdoptionRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Targets & Goals */}
                  <div className="border border-gray-200 rounded-lg p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-red-600" />
                      Targets & Goals
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Monthly Target</span>
                          <span className="font-semibold">{formatCurrency(selectedAgent.targets.monthlySalesTarget)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              selectedAgent.targets.targetAchievementRate >= 100 ? 'bg-green-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${Math.min(selectedAgent.targets.targetAchievementRate, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-right mt-1 font-semibold">
                          {selectedAgent.targets.targetAchievementRate.toFixed(1)}% Achievement
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Days Ahead/Behind</span>
                        <span className={`font-semibold ${
                          selectedAgent.targets.daysAheadBehindTarget >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedAgent.targets.daysAheadBehindTarget > 0 ? '+' : ''}{selectedAgent.targets.daysAheadBehindTarget} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Revenue Gap</span>
                        <span className={`font-semibold ${
                          selectedAgent.targets.revenueGap < 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ₱{formatNumber(Math.abs(selectedAgent.targets.revenueGap))}
                        </span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                        <div className="text-xs text-blue-700 font-medium mb-1">Status</div>
                        <div className="text-sm font-bold text-blue-900">{selectedAgent.targets.stretchGoalStatus}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements & Recognition */}
              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Achievements & Recognition
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Badges</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.incentives.badges.map((badge, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Awards</h4>
                    <div className="space-y-2">
                      {selectedAgent.incentives.awardsWon.map((award, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span>{award}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Milestones</h4>
                    <div className="space-y-2">
                      {selectedAgent.incentives.milestonesAchieved.map((milestone, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span>{milestone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Streak</h4>
                    <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-4 rounded-lg border border-orange-300">
                      <div className="text-3xl font-bold text-orange-900">{selectedAgent.incentives.streakDays}</div>
                      <div className="text-sm text-orange-700">Consecutive days with sales 🔥</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentAnalyticsPage;
