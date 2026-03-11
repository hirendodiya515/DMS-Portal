import { useNavigate } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  Leaf,
  ShieldCheck,
  ArrowRight,
  Activity
} from 'lucide-react';

const MODULES = [
  { 
    title: 'HIRA (ISO 45001)', 
    desc: 'Hazard Identification and Risk Assessment', 
    path: '/risks/hira', 
    icon: AlertTriangle, 
    color: 'orange' 
  },
  { 
    title: 'EAA (ISO 14001)', 
    desc: 'Environmental Aspect and Impact Assessment', 
    path: '/risks/eaa', 
    icon: Leaf, 
    color: 'emerald' 
  },
  { 
    title: 'QRA (ISO 9001)', 
    desc: 'Quality Risk Assessment and Management', 
    path: '/risks/qra', 
    icon: ShieldCheck, 
    color: 'indigo' 
  },
  {
    title: 'PFMEA',
    desc: 'Process Failure Mode and Effects Analysis',
    path: '/risks/pfmea',
    icon: Activity,
    color: 'blue'
  }
];

export default function RisksPage() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-[calc(100vh-100px)] flex flex-col justify-center">
      {/* Header */}
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <div className="inline-flex p-4 rounded-3xl bg-blue-50 text-blue-600 mb-6">
          <Shield className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Organizational Risk Management</h1>
        <p className="text-lg text-slate-500 font-medium leading-relaxed">
          Select a specialized module to manage Health & Safety, Environmental, or Quality assessments according to ISO standards.
        </p>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {MODULES.map((card) => (
          <div 
            key={card.path}
            onClick={() => navigate(card.path)}
            className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-2 h-full ${
              card.color === 'orange' ? 'bg-orange-500' : 
              card.color === 'emerald' ? 'bg-emerald-500' : 
              card.color === 'blue' ? 'bg-blue-500' : 
              'bg-indigo-500'
            }`}></div>
            
            <div className={`p-5 rounded-2xl bg-slate-50 text-slate-600 mb-8 w-fit group-hover:bg-white group-hover:shadow-lg transition-all`}>
              <card.icon className={`w-10 h-10 ${
                card.color === 'orange' ? 'text-orange-500' : 
                card.color === 'emerald' ? 'text-emerald-500' : 
                card.color === 'blue' ? 'text-blue-500' : 
                'text-indigo-500'
              }`} />
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 mb-3">{card.title}</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              {card.desc}
            </p>
            
            <div className="flex items-center gap-3 text-slate-900 font-black text-sm uppercase tracking-wider">
              Enter Module
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>

            {/* Subtle background decoration */}
            <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
              <card.icon className="w-48 h-48 rotate-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Decorative footer */}
      <div className="mt-20 pt-8 border-t border-slate-100 flex items-center justify-between text-slate-400 text-sm font-medium">
        <div>Integrated Management System • ISO Compliance Ready</div>
        <div className="flex gap-6">
          <span>ISO 9001</span>
          <span>ISO 14001</span>
          <span>ISO 45001</span>
        </div>
      </div>
    </div>
  );
}
