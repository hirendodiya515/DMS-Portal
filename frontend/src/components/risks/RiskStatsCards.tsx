import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon: any;
  color: string;
  borderColor?: string;
}

interface RiskStatsCardsProps {
  stats: Stat[];
}

const RiskStatsCards: React.FC<RiskStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-2">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className={`bg-white p-4 rounded-xl border-l-[4px] ${stat.borderColor || 'border-slate-100'} shadow-sm flex flex-col justify-between h-32 transition-transform hover:scale-[1.01]`}
          style={{ borderLeftColor: stat.color }}
        >
          <div className="flex justify-between items-start">
            <div className={`p-1.5 rounded-lg bg-slate-50`} style={{ color: stat.color }}>
              <stat.icon className="w-5 h-5" />
            </div>
            {stat.change && (
              <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend === 'up' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {stat.trend === 'up' ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                {stat.change}
              </div>
            )}
          </div>
          
          <div>
            <p className="text-slate-500 text-xs font-medium mb-0.5">{stat.label}</p>
            <h4 className="text-2xl font-bold text-slate-800">{stat.value}</h4>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RiskStatsCards;
