import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/src/components/ui/Card';

export function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.split('/')[1] || 'Page';
  const capitalizedName = pageName.charAt(0).toUpperCase() + pageName.slice(1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{capitalizedName}</h1>
      <Card>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl text-gray-400">🚧</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Under Construction</h2>
          <p className="text-gray-500 max-w-md">
            The {capitalizedName} module is part of the prototype specification but has not been fully implemented in this demo view yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
