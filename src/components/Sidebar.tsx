import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  ShoppingBag,
  Building2,
  Users,
  Receipt,
  Calculator,
  BarChart3,
  Sliders,
  Share2,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { BusinessProfile } from '../types/index.ts';

export type NavTab =
  | 'dashboard'
  | 'ai-documents'
  | 'invoices'
  | 'purchase-bills'
  | 'suppliers'
  | 'customers'
  | 'expenses'
  | 'gst'
  | 'reports'
  | 'automations'
  | 'integrations'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingReviewsCount: number;
  unpaidInvoicesCount: number;
  profile: BusinessProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingReviewsCount,
  unpaidInvoicesCount,
  profile,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'ai-documents' as NavTab,
      label: 'AI Document Center',
      icon: Sparkles,
      badge: pendingReviewsCount > 0 ? `${pendingReviewsCount} Review` : 'AI',
      badgeColor: pendingReviewsCount > 0 ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white animate-pulse',
    },
    {
      id: 'invoices' as NavTab,
      label: 'Sales Invoices',
      icon: FileText,
      badge: unpaidInvoicesCount > 0 ? `${unpaidInvoicesCount}` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'purchase-bills' as NavTab, label: 'Purchase Bills', icon: ShoppingBag },
    { id: 'suppliers' as NavTab, label: 'Vendors (Suppliers)', icon: Building2 },
    { id: 'customers' as NavTab, label: 'Customers', icon: Users },
    { id: 'expenses' as NavTab, label: 'Expenses', icon: Receipt },
    { id: 'gst' as NavTab, label: 'GST Intelligence', icon: Calculator, tag: 'GSTR-1/3B' },
    { id: 'reports' as NavTab, label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'automations' as NavTab, label: 'Automations', icon: Sliders },
    { id: 'integrations' as NavTab, label: 'Integrations', icon: Share2, tag: 'Tally' },
    { id: 'settings' as NavTab, label: 'Business Profile', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col h-screen border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-xl">
            O
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold tracking-tight text-white">Ozio</h1>
              <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">Financial Operations</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Core Operations
        </div>
        {navItems.slice(0, 7).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Compliance & Intelligence
        </div>
        {navItems.slice(7).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.tag && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium border border-slate-700">
                  {item.tag}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60">
        <div
          onClick={() => onSelectTab('settings')}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
            {profile?.business_name ? profile.business_name.substring(0, 2).toUpperCase() : 'AP'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {profile?.business_name || 'ApexTech Solutions'}
            </p>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              GSTIN: {profile?.gstin ? `${profile.gstin.substring(0, 7)}...` : '27AABCA...'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
