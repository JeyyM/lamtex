import React from 'react';
import { cn } from '@/src/lib/utils';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
};

export function Button({ className, variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg";
  
  const variants = {
    primary: "bg-red-600 text-white hover:bg-red-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
