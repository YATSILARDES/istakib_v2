import React, { useState } from 'react';
import { Home, Settings, BarChart2, FolderOpen, LogOut, Package, ChevronDown, ChevronRight, Circle, FileText } from 'lucide-react';
import { UserPermission } from '../types';

interface SidebarProps {
    isOpen: boolean;
    activeTab: string;
    onTabChange: (tab: string) => void;
    isAdmin: boolean;
    onLogout?: () => void;
    userPermissions?: UserPermission | null;
    isDarkMode?: boolean;
}

type MenuItem = {
    id: string;
    label: string;
    icon: any;
    children?: { id: string; label: string; }[];
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeTab, onTabChange, isAdmin, onLogout, userPermissions, isDarkMode = true }) => {
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const toggleExpand = (id: string) => {
        setExpandedItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // İzin kontrolleri
    const canSeeStock = isAdmin || userPermissions?.role === 'manager' || userPermissions?.canAccessStock === true;
    const canSeeQuotations = isAdmin || userPermissions?.role === 'manager' || userPermissions?.canAccessQuotations === true || userPermissions?.isEngineer === true;

    const menuItems: MenuItem[] = [
        { id: 'dashboard', label: 'Panel', icon: Home },
        // { id: 'reports', label: 'Raporlar', icon: BarChart2 },
        { id: 'archive', label: 'Arşiv', icon: FolderOpen },
        ...(canSeeStock ? [{
            id: 'stock',
            label: 'Stok Listesi',
            icon: Package,
            children: [
                { id: 'stock_radiators', label: 'Radyatörler' },
                { id: 'stock_combis', label: 'Kombiler' },
                { id: 'stock_heatpumps', label: 'Isı Pompaları' },
                { id: 'stock_thermosiphons', label: 'Termosifonlar' },
                { id: 'stock_acs', label: 'Klimalar' },
                { id: 'stock_electric_combis', label: 'Elektrikli Kombiler' },
                { id: 'stock_instant_heaters', label: 'DDEİ (Ani Isıtıcılar)' },
                { id: 'stock_others', label: 'Diğerleri' }
            ]
        }] : []),
        ...(canSeeQuotations ? [{
            id: 'quotations',
            label: 'Teklif Yönetimi',
            icon: FileText,
        }] : []),
    ];

    const isChildActive = (item: MenuItem) => {
        return item.children?.some(child => child.id === activeTab);
    };

    return (
        <div
            className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r shadow-none
        transform transition-all duration-500 ease-in-out
        bg-transparent border-transparent
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        flex flex-col
      `}
        >
            {/* Logo Area */}
            <div className={`h-20 flex items-center px-5 border-b border-transparent`}>
                <div className="flex items-center gap-3 group">
                    <div className="w-10 h-10 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                        <img src="/logo-transparent.png" alt="Onay Logo" className="w-full h-full object-contain drop-shadow-md" />
                    </div>
                    <div className="flex flex-col">
                        <span className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>ONAY</span>
                        <span className={`text-[10px] tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>MÜHENDİSLİK</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const hasChildren = item.children && item.children.length > 0;
                    const isExpanded = expandedItems.includes(item.id);
                    const isParentEffectiveActive = isActive || isChildActive(item);

                    return (
                        <div key={item.id} className="space-y-1">
                            <button
                                onClick={() => {
                                    if (hasChildren) {
                                        toggleExpand(item.id);
                                    } else {
                                        onTabChange(item.id);
                                    }
                                }}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group
                                    ${isParentEffectiveActive
                                        ? `bg-gradient-to-r from-blue-600/20 to-blue-600/5 shadow-sm ${isDarkMode ? 'text-white' : 'text-blue-700'}`
                                        : `${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`
                                    }
                                `}
                            >
                                {/* Active Indicator (Only for direct active parents or simple items) */}
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-blue-400 to-blue-600 transition-all duration-300 ${isParentEffectiveActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />

                                <item.icon className={`w-5 h-5 transition-all duration-300 ${isParentEffectiveActive ? 'text-blue-400' : 'text-current group-hover:text-blue-400'}`} />
                                <span className="transition-all duration-300 flex-1 text-left">{item.label}</span>

                                {hasChildren && (
                                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="w-4 h-4 opacity-50" />
                                    </div>
                                )}

                                {/* Hover Arrow for simple items */}
                                {!hasChildren && (
                                    <div className={`ml-auto opacity-0 transform translate-x-2 transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'group-hover:opacity-100 group-hover:translate-x-0'}`}>
                                        <ChevronRight className="w-4 h-4 text-blue-400" />
                                    </div>
                                )}
                            </button>

                            {/* Sub Menu */}
                            {hasChildren && isExpanded && (
                                <div className="pl-4 space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
                                    {item.children?.map((child) => {
                                        const isChildActive = activeTab === child.id;
                                        return (
                                            <button
                                                key={child.id}
                                                onClick={() => onTabChange(child.id)}
                                                className={`
                                                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 relative
                                                    ${isChildActive
                                                        ? 'text-blue-500 font-bold'
                                                        : isDarkMode ? 'text-slate-300 hover:text-white font-medium' : 'text-slate-600 hover:text-slate-900 font-medium'
                                                    }
                                                `}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isChildActive ? 'bg-blue-400' : 'bg-slate-600'}`} />
                                                <span>{child.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-[#34495e]/50">
                <div className="text-[10px] text-slate-600 text-center">
                    v0.0.47
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
