import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Flame } from 'lucide-react';
import { RISK_LEVELS } from '../data/mockData';

export default function RiskBadge({ level = 'LOW', size = 'md', showIcon = true, pulse = false }) {
  const normLevel = (level || 'LOW').toUpperCase();
  const config = RISK_LEVELS[normLevel] || RISK_LEVELS.LOW;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-xs sm:text-sm gap-1.5 font-medium',
    lg: 'px-4 py-1.5 text-sm sm:text-base gap-2 font-semibold tracking-wide',
  };

  const getIcon = () => {
    switch (normLevel) {
      case 'CRITICAL':
        return <Flame className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
      case 'HIGH':
        return <AlertOctagon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
      case 'MODERATE':
        return <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
      case 'LOW':
      default:
        return <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
    }
  };

  const pulseClass = pulse ? (
    normLevel === 'CRITICAL' ? 'animate-pulse' :
    normLevel === 'HIGH' ? 'animate-pulse' : ''
  ) : '';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.badgeBg} ${config.badgeBorder} ${config.badgeText} ${sizeClasses[size] || sizeClasses.md} ${pulseClass} transition-all duration-200`}
    >
      {showIcon && getIcon()}
      <span>{config.label.toUpperCase()}</span>
    </span>
  );
}
