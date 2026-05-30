import React from 'react';
import { Shield } from 'lucide-react';

export function ModuleAccessDenied({ moduleName }: { moduleName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <Shield className="w-12 h-12 text-gray-300 mb-4" aria-hidden />
      <h2 className="text-lg font-semibold text-gray-900">Access restricted</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-md">
        You do not have permission to view {moduleName}. Contact your administrator to update your
        access settings.
      </p>
    </div>
  );
}
