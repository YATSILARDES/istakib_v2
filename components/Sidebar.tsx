import React from 'react';
import { Home, Settings, BarChart2, FolderOpen, LogOut } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    activeTab: string;
    onTabChange: (tab: string) => void;
    isAdmin: boolean;
    onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeTab, onTabChange, isAdmin, onLogout }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Panel', icon: Home },
        // { id: 'reports', label: 'Raporlar', icon: BarChart2 },
        { id: 'archive', label: 'Arşiv', icon: FolderOpen },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'settings', label: 'Ayarlar', icon: Settings });
    }

    return (
        <div
            className={`
        fixed inset-y-0 left-0 z-50 w-48 bg-gradient-to-b from-[#2c3e50] to-[#1a252f] border-r border-[#34495e] shadow-2xl shadow-black/30
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        flex flex-col
      `}
        >
            {/* Logo Area with Gradient */}
            <div className="h-20 flex items-center px-5 border-b border-[#34495e]/50 bg-gradient-to-r from-blue-600/10 to-transparent">
                <div className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center border border-blue-400/20 transform group-hover:scale-105 transition-transform duration-300">
                        <span className="text-white font-bold text-lg">O</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-white tracking-tight">ONAY</span>
                        <span className="text-[10px] text-slate-400 tracking-widest">MÜHENDİSLİK</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1.5">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group
                ${isActive
                                    ? 'bg-gradient-to-r from-blue-600/20 to-blue-600/5 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
              `}
                        >
                            {/* Active Indicator */}
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-blue-400 to-blue-600 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />

                            <item.icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'text-blue-400' : 'text-current group-hover:text-blue-400'}`} />
                            <span className="transition-all duration-300">{item.label}</span>

                            {/* Hover Arrow */}
                            <div className={`ml-auto opacity-0 transform translate-x-2 transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'group-hover:opacity-100 group-hover:translate-x-0'}`}>
                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-[#34495e]/50">
                <div className="text-[10px] text-slate-600 text-center">
                    v0.0.35
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
