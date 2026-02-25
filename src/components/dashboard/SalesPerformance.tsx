import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { TopProduct, TopHardwareStore, AgentPerformance, BranchPerformance } from '@/src/types/executive';
import { TrendingUp, Users, MapPin, Package } from 'lucide-react';

interface SalesPerformanceProps {
  topProducts: TopProduct[];
  topStores: TopHardwareStore[];
  agentPerformance: AgentPerformance[];
  branchPerformance: BranchPerformance[];
}

export function SalesPerformance({ topProducts, topStores, agentPerformance, branchPerformance }: SalesPerformanceProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Top Products (MTD)</CardTitle>
          <Package className="w-4 h-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.unitsSold.toLocaleString()} units</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₱{(product.revenue / 1000).toFixed(1)}k</p>
                  <p className={`text-xs ${product.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                    {product.trendUp ? '↑' : '↓'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Top Hardware Stores</CardTitle>
          <Users className="w-4 h-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topStores.map((store) => (
              <div key={store.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{store.name}</p>
                  <p className="text-xs text-gray-500">₱{(store.revenue / 1000).toFixed(1)}k</p>
                </div>
                <Badge variant={store.paymentBehavior === 'Good' ? 'success' : store.paymentBehavior === 'Watchlist' ? 'warning' : 'danger'}>
                  {store.paymentBehavior}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Agent Leaderboard</CardTitle>
          <TrendingUp className="w-4 h-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agentPerformance.map((agent) => (
              <div key={agent.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                  <p className="text-sm font-medium text-gray-900">₱{(agent.sales / 1000000).toFixed(1)}M</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${agent.sales >= agent.quota ? 'bg-green-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min((agent.sales / agent.quota) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Quota: ₱{(agent.quota / 1000000).toFixed(1)}M</span>
                  <span>Coll: ₱{(agent.collections / 1000000).toFixed(1)}M</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Branch Performance</CardTitle>
          <MapPin className="w-4 h-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {branchPerformance.map((branch) => (
              <div key={branch.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{branch.branch}</p>
                  <p className="text-sm font-medium text-gray-900">₱{(branch.sales / 1000000).toFixed(1)}M</p>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span className={branch.stockouts > 3 ? 'text-red-600 font-medium' : ''}>Stockouts: {branch.stockouts}</span>
                  <span className={branch.onTimeDelivery < 95 ? 'text-yellow-600 font-medium' : 'text-green-600'}>On-time: {branch.onTimeDelivery}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
