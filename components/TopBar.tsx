import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserPermission } from '@/types';
import { Settings, User as UserIcon, LogOut, ChevronDown, Lock, Shield } from 'lucide-react'; // Ensure imports are correct based on file location. Relative paths might be needed like '../types' if in components/

// Adjust import based on your project structure. If @/types fails, check tsconfig.
// Assuming relative path for types since previous file view showed import from '../types' in other components usually.
// But TopBar.tsx is in components/, so types.ts is likely in ../types.ts
// Wait, in Sidebar.tsx it didn't import types. In App.tsx it imported from './types'.
// TopBar is in components/TopBar.tsx. App.tsx is in root. types.ts is in root.
// So import should be from '../types'.
// However, the original TopBar.tsx I read had "import { ... } from '@/types';" and it seemed to work or at least existed.
// I will trust the user's path alias or relative path.
// Actually, earlier view of TopBar.tsx showed "import { UserPermission } from '@/types';" at line 3.
// I will keep that.

interface TopBarProps {
    user: User | null;
    userPermissions: UserPermission | null;
    onOpenAdmin: () => void;
    onLogout: () => void;
    onOpenProfile: () => void;
    onOpenPassword: () => void;
    variant?: 'light' | 'dark';
}

const TopBar: React.FC<TopBarProps> = ({
    user,
    userPermissions,
    onOpenAdmin,
    onLogout,
    onOpenProfile,
    onOpenPassword,
    variant = 'light'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayName = userPermissions?.name || user?.email?.split('@')[0] || 'Kullanıcı';
    const roleLabel = userPermissions?.role === 'admin' ? 'Yönetici' : 'Personel';
    const showAdminSettings = userPermissions?.role === 'admin' || userPermissions?.role === 'manager';

    const isDark = variant === 'dark';

    return (
        <div className={`${isDark ? '' : 'bg-white border-b border-slate-200 px-6 py-3 shadow-sm'} flex items-center justify-end relative z-40`}>
            {/* Account Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-3 p-2 rounded-xl transition-colors border border-transparent group ${isDark
                            ? 'hover:bg-white/10'
                            : 'hover:bg-slate-50 hover:border-slate-100'
                        }`}
                >
                    <div className="text-right hidden md:block">
                        <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{displayName}</div>
                        <div className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{roleLabel}</div>
                    </div>

                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md group-hover:shadow-lg transition-all">
                        {displayName.charAt(0).toUpperCase()}
                    </div>

                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-400'}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right">

                        {/* Mobile Header */}
                        <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 md:hidden">
                            <h3 className="font-bold text-slate-800">{displayName}</h3>
                            <span className="text-xs text-slate-500">{user?.email}</span>
                        </div>

                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => { setIsOpen(false); onOpenProfile(); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-left"
                            >
                                <UserIcon className="w-4 h-4" />
                                Profilim
                            </button>

                            <button
                                onClick={() => { setIsOpen(false); onOpenPassword(); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-left"
                            >
                                <Lock className="w-4 h-4" />
                                Şifre Değiştir
                            </button>

                            {showAdminSettings && (
                                <button
                                    onClick={() => { setIsOpen(false); onOpenAdmin(); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors text-left"
                                >
                                    <Shield className="w-4 h-4" />
                                    Yönetim Paneli
                                </button>
                            )}
                        </div>

                        <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                            <button
                                onClick={() => { setIsOpen(false); onLogout(); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                            >
                                <LogOut className="w-4 h-4" />
                                Çıkış Yap
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopBar;
