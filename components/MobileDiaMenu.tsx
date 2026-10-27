import React, { useState, useMemo } from 'react';
import { 
    Star, Briefcase, Package, Zap, FileText, FilePlus, FolderOpen, 
    CheckSquare, CheckCircle2, Wallet, Flame, Truck, RefreshCw, 
    UserCheck, ListTodo, Layers, LayoutGrid, Cpu, 
    Droplets, Wind, Power, Gauge, Users, AlertCircle, 
    PlusCircle, MapPin, ShieldCheck, User, KeyRound, LogOut, 
    Calendar, Search, ChevronDown, ChevronUp, ChevronRight, MessageSquare,
    Compass, Sparkles, X, SlidersHorizontal
} from 'lucide-react';
import { Task, TaskStatus, StatusLabels, RoutineTask, UserPermission, StaffMember } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

export interface DiaMenuItem {
    id: string;
    sectionId: 'favorites' | 'tasks' | 'stock' | 'actions' | 'quotations' | 'profile';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    actionType: 'task_filter' | 'my_tasks' | 'priority_tasks' | 'all_tasks' | 'stock_category' | 'quotation_sub' | 'quick_action' | 'profile';
    filterStatus?: TaskStatus | 'ALL';
    stockCategory?: 'combis' | 'radiators' | 'heatpumps' | 'thermosiphons' | 'acs' | 'electric_combis' | 'instant_heaters' | 'others';
    quotationSubView?: 'prepare' | 'list';
    quickAction?: 'assignment' | 'routine_pool' | 'add_task' | 'field_staff' | 'admin' | 'change_password' | 'logout';
}

interface MobileDiaMenuProps {
    user: FirebaseUser | null;
    userPermissions: UserPermission | null;
    tasks: Task[];
    routineTasks: RoutineTask[];
    staffList: StaffMember[];
    onSelectTaskFilter: (status: TaskStatus | 'ALL', initialSearch?: string) => void;
    onSelectMyTasks: (initialSearch?: string) => void;
    onSelectPriorityTasks?: (initialSearch?: string) => void;
    onSelectStockCategory: (category: 'combis' | 'radiators' | 'heatpumps' | 'thermosiphons' | 'acs' | 'electric_combis' | 'instant_heaters' | 'others') => void;
    onSelectQuotationSubView: (view: 'prepare' | 'list') => void;
    onOpenAssignmentModal: () => void;
    onOpenRoutineModal: () => void;
    onOpenFieldStaff?: () => void;
    onOpenAdmin: () => void;
    onAddTask: () => void;
    onSignOut: () => void;
    onOpenProfile: () => void;
    onPasswordReset: () => void;
    onSwitchToClassic: () => void;
    onOpenGlobalSearch?: () => void;
    initialSearch?: string;
    onSearchChange?: (q: string) => void;
}

export const MobileDiaMenu: React.FC<MobileDiaMenuProps> = ({
    user,
    userPermissions,
    tasks,
    routineTasks,
    staffList,
    onSelectTaskFilter,
    onSelectMyTasks,
    onSelectPriorityTasks,
    onSelectStockCategory,
    onSelectQuotationSubView,
    onOpenAssignmentModal,
    onOpenRoutineModal,
    onOpenFieldStaff,
    onOpenAdmin,
    onAddTask,
    onSignOut,
    onOpenProfile,
    onPasswordReset,
    onSwitchToClassic,
    onOpenGlobalSearch,
    initialSearch,
    onSearchChange
}) => {
    // Accordion expand states: Default Favoriler section open on initial launch
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        favorites: true
    });

    // Search filter inside Menu
    const [menuSearch, setMenuSearch] = useState(initialSearch || '');
    const isSearching = menuSearch.trim().length > 0;

    React.useEffect(() => {
        if (initialSearch !== undefined) {
            setMenuSearch(initialSearch);
        }
    }, [initialSearch]);

    const handleSearchChange = (val: string) => {
        setMenuSearch(val);
        if (onSearchChange) onSearchChange(val);
    };

    const toggleSection = (sectionId: string) => {
        if (isSearching) {
            setOpenSections(prev => {
                const current = prev[`search_${sectionId}`] !== undefined ? prev[`search_${sectionId}`] : true;
                return { ...prev, [`search_${sectionId}`]: !current };
            });
        } else {
            setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
        }
    };

    // User display info
    const displayName = userPermissions?.name || user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';
    const roleLabel = userPermissions?.role === 'admin'
        ? 'Yönetici'
        : userPermissions?.role === 'manager'
        ? 'Müdür'
        : userPermissions?.isEngineer
        ? 'Mühendis'
        : 'Saha Ekibi';
    const userEmail = user?.email || 'kullanici@onaymuhendislik.com';

    // Favorites persistence in localStorage
    const defaultFavorites = ['my_tasks', 'task_PROJECT_TO_BE_DRAWN', 'task_TO_CHECK', 'stock_combis', 'action_assignment'];
    const [favorites, setFavorites] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('onay_menu_favorites');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return defaultFavorites;
    });

    const toggleFavorite = (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorites(prev => {
            const next = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
            try {
                localStorage.setItem('onay_menu_favorites', JSON.stringify(next));
            } catch (e) {}
            return next;
        });
    };

    // Permission checks
    const canSeeStock = userPermissions?.role === 'admin' || userPermissions?.role === 'manager' || userPermissions?.canAccessStock;
    const canSeeQuotations = userPermissions?.role === 'admin' || userPermissions?.role === 'manager' || userPermissions?.canAccessQuotations || userPermissions?.isEngineer;
    const isAdmin = userPermissions?.role === 'admin' || userPermissions?.role === 'manager';
    const canAddTasks = isAdmin || !!userPermissions?.canAddCustomers;
    const canAccessAssignment = isAdmin || !!userPermissions?.canAccessAssignment;
    const canAccessRoutinePool = isAdmin || !!userPermissions?.canAccessRoutineTasks;
    const canAccessFieldStaff = isAdmin && !!onOpenFieldStaff;

    // Helper: Robust Date Parser
    const parseEffectiveDate = (dateVal: any): Date | null => {
        if (!dateVal) return null;
        try {
            if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
            if (typeof dateVal.toDate === 'function') return dateVal.toDate();
            if (typeof dateVal.toMillis === 'function') return new Date(dateVal.toMillis());
            if (typeof dateVal.seconds === 'number') return new Date(dateVal.seconds * 1000);
            if (typeof dateVal._seconds === 'number') return new Date(dateVal._seconds * 1000);
            if (typeof dateVal === 'number') return new Date(dateVal > 1e11 ? dateVal : dateVal * 1000);
            if (typeof dateVal === 'string') {
                const trimmed = dateVal.trim();
                if (!trimmed) return null;
                if (trimmed.includes('.')) {
                    const parts = trimmed.split(' ')[0].split('.');
                    if (parts.length === 3) {
                        const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                        if (!isNaN(d.getTime())) return d;
                    }
                }
                if (trimmed.includes('/')) {
                    const parts = trimmed.split(' ')[0].split('/');
                    if (parts.length === 3) {
                        const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                        if (!isNaN(d.getTime())) return d;
                    }
                }
                if (trimmed.includes('-')) {
                    const parts = trimmed.split(' ')[0].split('-');
                    if (parts.length === 3) {
                        if (parts[0].length === 4) {
                            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                            if (!isNaN(d.getTime())) return d;
                        }
                        if (parts[2].length === 4) {
                            const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                            if (!isNaN(d.getTime())) return d;
                        }
                    }
                }
                const fallback = new Date(trimmed);
                if (!isNaN(fallback.getTime())) return fallback;
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    // Counts for tasks
    const taskCounts = useMemo(() => {
        const uEmail = (user?.email || '').toLowerCase();
        const uName = (userPermissions?.name || '').trim().toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const myActiveMainTasksCount = tasks.filter(t => {
            const emailMatch = t.assigneeEmail && uEmail && t.assigneeEmail.toLowerCase() === uEmail;
            const nameMatch = uName && t.assignee && t.assignee.trim().toLowerCase() === uName;
            if (!emailMatch && !nameMatch) return false;
            if (t.status === TaskStatus.CHECK_COMPLETED && t.isProjectDrawn !== false && !t.isReassignedForCheck) return false;
            if (t.checkStatus && !t.isReassignedForCheck) return false;
            const taskDate = parseEffectiveDate(t.scheduledDate || t.date || t.createdAt);
            if (taskDate) {
                taskDate.setHours(0, 0, 0, 0);
                if (taskDate.getTime() > today.getTime()) return false;
            }
            return true;
        }).length;

        const myActiveRoutineCount = routineTasks.filter(r => {
            if (r.isCompleted) return false;
            const emailMatch = r.assigneeEmail && uEmail && r.assigneeEmail.toLowerCase() === uEmail;
            const nameMatch = uName && r.assignee && r.assignee.trim().toLowerCase() === uName;
            if (!emailMatch && !nameMatch) return false;
            const filterDate = parseEffectiveDate(r.scheduledDate || r.createdAt);
            if (filterDate) {
                filterDate.setHours(0, 0, 0, 0);
                if (filterDate.getTime() > today.getTime()) return false;
            }
            return true;
        }).length;

        const isStaff = userPermissions && userPermissions.role !== 'admin' && userPermissions.role !== 'manager';
        const allowedCols = userPermissions?.allowedColumns || [];
        const permittedTasks = isStaff ? tasks.filter(t => allowedCols.includes(t.status)) : tasks;

        const priorityCount = permittedTasks.filter(t => t.isPriority).length + routineTasks.filter(r => r.isPriority && !r.isCompleted).length;

        const counts: Record<string, number> = {
            total: permittedTasks.length,
            my: myActiveMainTasksCount + myActiveRoutineCount,
            priority: priorityCount,
            routine_incomplete: routineTasks.filter(r => !r.isCompleted).length
        };
        tasks.forEach(t => {
            counts[t.status] = (counts[t.status] || 0) + 1;
        });
        return counts;
    }, [tasks, routineTasks, user, userPermissions]);

    // Definition of all menu items
    const allMenuItems = useMemo<DiaMenuItem[]>(() => {
        const isStatusAllowed = (status: TaskStatus) => {
            if (!userPermissions || userPermissions.role === 'admin' || userPermissions.role === 'manager') {
                return true;
            }
            if (!userPermissions.allowedColumns) return false;
            return userPermissions.allowedColumns.includes(status);
        };

        const canSeeAllTasks = userPermissions?.role === 'admin' || userPermissions?.role === 'manager' ||
            (userPermissions?.allowedColumns && Object.values(TaskStatus).every(s => userPermissions.allowedColumns.includes(s)));

        const items: DiaMenuItem[] = [
            // --- İŞLER (TASKS) ---
            {
                id: 'my_tasks',
                sectionId: 'tasks',
                label: 'Bana Atananlar',
                icon: UserCheck,
                badge: taskCounts.my > 0 ? taskCounts.my : undefined,
                actionType: 'my_tasks'
            },
            {
                id: 'priority_tasks',
                sectionId: 'tasks',
                label: 'Öncelikli İşler',
                icon: Star,
                badge: taskCounts.priority > 0 ? taskCounts.priority : undefined,
                actionType: 'priority_tasks'
            },
            ...(isStatusAllowed(TaskStatus.PROJECT_TO_BE_DRAWN) ? [{
                id: `task_${TaskStatus.PROJECT_TO_BE_DRAWN}`,
                sectionId: 'tasks' as const,
                label: 'Projesi Çizilecek',
                icon: Compass,
                badge: taskCounts[TaskStatus.PROJECT_TO_BE_DRAWN] || undefined,
                actionType: 'task_filter' as const,
                filterStatus: TaskStatus.PROJECT_TO_BE_DRAWN
            }] : []),
            ...(isStatusAllowed(TaskStatus.TO_CHECK) ? [{
                id: `task_${TaskStatus.TO_CHECK}`,
                sectionId: 'tasks' as const,
                label: 'Kontrol Yapılacak',
                icon: CheckSquare,
                badge: taskCounts[TaskStatus.TO_CHECK] || undefined,
                actionType: 'task_filter' as const,
                filterStatus: TaskStatus.TO_CHECK
            }] : []),
            ...(isStatusAllowed(TaskStatus.CHECK_COMPLETED) ? [{
                id: `task_${TaskStatus.CHECK_COMPLETED}`,
                sectionId: 'tasks' as const,
                label: 'Kontrol Edildi',
                icon: CheckCircle2,
                badge: taskCounts[TaskStatus.CHECK_COMPLETED] || undefined,
                actionType: 'task_filter' as const,
                filterStatus: TaskStatus.CHECK_COMPLETED
            }] : []),
            ...(isStatusAllowed(TaskStatus.DEPOSIT_PAID) ? [{
                id: `task_${TaskStatus.DEPOSIT_PAID}`,
                sectionId: 'tasks' as const,
                label: 'Depozito Yatırıldı',
                icon: Wallet,
                badge: taskCounts[TaskStatus.DEPOSIT_PAID] || undefined,
                actionType: 'task_filter' as const,
                filterStatus: TaskStatus.DEPOSIT_PAID
            }] : []),
            ...(isStatusAllowed(TaskStatus.GAS_OPENED) ? [{
                id: `task_${TaskStatus.GAS_OPENED}`,
                sectionId: 'tasks' as const,
                label: 'Gaz Açıldı',
                icon: Flame,
                badge: taskCounts[TaskStatus.GAS_OPENED] || undefined,
                actionType: 'task_filter' as const,
                filterStatus: TaskStatus.GAS_OPENED
            }] : []),
            ...(isStatusAllowed(TaskStatus.SERVICE_DIRECTED) ? [{
                id: `task_${TaskStatus.SERVICE_DIRECTED}`,
                sectionId: 'tasks' as const,
                label: 'Servis Yönlendirildi',
                icon: Truck,
                badge: taskCounts[TaskStatus.SERVICE_DIRECTED] || undefined,
                actionType: 'task_filter' as const,
                filterStatus: TaskStatus.SERVICE_DIRECTED
            }] : []),
            ...(isStatusAllowed(TaskStatus.COMBI_REPLACEMENT_RENOVATION) ? [{
                id: `task_${TaskStatus.COMBI_REPLACEMENT_RENOVATION}`,
                sectionId: 'tasks' as const,
                label: 'Kombi Değişimi & Tadilat',
                icon: RefreshCw,
                badge: taskCounts[TaskStatus.COMBI_REPLACEMENT_RENOVATION] || undefined,
                actionType: 'task_filter' as const,
                filterStatus: TaskStatus.COMBI_REPLACEMENT_RENOVATION
            }] : []),
            ...(canSeeAllTasks ? [{
                id: 'all_tasks',
                sectionId: 'tasks' as const,
                label: 'Tüm İşler Listesi',
                icon: Layers,
                badge: taskCounts.total || undefined,
                actionType: 'all_tasks' as const,
                filterStatus: 'ALL' as const
            }] : []),

            // --- STOK (STOCK) ---
            ...(canSeeStock ? [
                {
                    id: 'stock_combis',
                    sectionId: 'stock' as const,
                    label: 'Kombiler',
                    icon: Cpu,
                    actionType: 'stock_category' as const,
                    stockCategory: 'combis' as const
                },
                {
                    id: 'stock_radiators',
                    sectionId: 'stock' as const,
                    label: 'Radyatörler',
                    icon: LayoutGrid,
                    actionType: 'stock_category' as const,
                    stockCategory: 'radiators' as const
                },
                {
                    id: 'stock_heatpumps',
                    sectionId: 'stock' as const,
                    label: 'Isı Pompaları',
                    icon: Sparkles,
                    actionType: 'stock_category' as const,
                    stockCategory: 'heatpumps' as const
                },
                {
                    id: 'stock_thermosiphons',
                    sectionId: 'stock' as const,
                    label: 'Termosifonlar',
                    icon: Droplets,
                    actionType: 'stock_category' as const,
                    stockCategory: 'thermosiphons' as const
                },
                {
                    id: 'stock_acs',
                    sectionId: 'stock' as const,
                    label: 'Klimalar',
                    icon: Wind,
                    actionType: 'stock_category' as const,
                    stockCategory: 'acs' as const
                },
                {
                    id: 'stock_electric_combis',
                    sectionId: 'stock' as const,
                    label: 'Elektrikli Kombi',
                    icon: Power,
                    actionType: 'stock_category' as const,
                    stockCategory: 'electric_combis' as const
                },
                {
                    id: 'stock_instant_heaters',
                    sectionId: 'stock' as const,
                    label: 'Ani Isıtıcı (DDEİ)',
                    icon: Gauge,
                    actionType: 'stock_category' as const,
                    stockCategory: 'instant_heaters' as const
                },
                {
                    id: 'stock_others',
                    sectionId: 'stock' as const,
                    label: 'Diğer Stoklar',
                    icon: Package,
                    actionType: 'stock_category' as const,
                    stockCategory: 'others' as const
                }
            ] : []),

            // --- HIZLI İŞLEMLER ---
            ...(canAccessAssignment ? [{
                id: 'action_assignment',
                sectionId: 'actions' as const,
                label: 'Görev Dağıtımı',
                icon: Users,
                actionType: 'quick_action' as const,
                quickAction: 'assignment' as const
            }] : []),
            ...(canAccessRoutinePool ? [{
                id: 'action_routine_pool',
                sectionId: 'actions' as const,
                label: 'Eksikler Havuzu',
                icon: AlertCircle,
                badge: taskCounts.routine_incomplete > 0 ? taskCounts.routine_incomplete : undefined,
                actionType: 'quick_action' as const,
                quickAction: 'routine_pool' as const
            }] : []),
            ...(canAddTasks ? [{
                id: 'action_add_task',
                sectionId: 'actions' as const,
                label: 'Yeni Müşteri / İş',
                icon: PlusCircle,
                actionType: 'quick_action' as const,
                quickAction: 'add_task' as const
            }] : []),
            ...(canAccessFieldStaff ? [{
                id: 'action_field_staff',
                sectionId: 'actions' as const,
                label: 'Sahadaki Personel',
                icon: MapPin,
                actionType: 'quick_action' as const,
                quickAction: 'field_staff' as const
            }] : []),
            ...(isAdmin ? [{
                id: 'action_admin',
                sectionId: 'actions' as const,
                label: 'Yönetici Paneli',
                icon: ShieldCheck,
                actionType: 'quick_action' as const,
                quickAction: 'admin' as const
            }] : []),

            // --- TEKLİFLER ---
            ...(canSeeQuotations ? [
                {
                    id: 'quote_prepare',
                    sectionId: 'quotations' as const,
                    label: 'Yeni Teklif Hazırla',
                    icon: FilePlus,
                    actionType: 'quotation_sub' as const,
                    quotationSubView: 'prepare' as const
                },
                {
                    id: 'quote_list',
                    sectionId: 'quotations' as const,
                    label: 'Hazırlanan Teklifler',
                    icon: FolderOpen,
                    actionType: 'quotation_sub' as const,
                    quotationSubView: 'list' as const
                }
            ] : []),

            // --- PROFİL & AYARLAR ---
            {
                id: 'profile_view',
                sectionId: 'profile',
                label: 'Profil Bilgileri',
                icon: User,
                actionType: 'profile'
            },
            {
                id: 'profile_password',
                sectionId: 'profile',
                label: 'Şifre Sıfırla',
                icon: KeyRound,
                actionType: 'quick_action',
                quickAction: 'change_password'
            },
            {
                id: 'profile_logout',
                sectionId: 'profile',
                label: 'Güvenli Çıkış',
                icon: LogOut,
                actionType: 'quick_action',
                quickAction: 'logout'
            }
        ];

        return items;
    }, [taskCounts, canSeeStock, canSeeQuotations, canAddTasks, isAdmin, canAccessAssignment, canAccessRoutinePool, canAccessFieldStaff, userPermissions]);

    // Handle item click
    const handleItemClick = (item: DiaMenuItem) => {
        const queryToPass = menuSearch.trim() || undefined;

        switch (item.actionType) {
            case 'task_filter':
                if (item.filterStatus) onSelectTaskFilter(item.filterStatus, queryToPass);
                break;
            case 'my_tasks':
                onSelectMyTasks(queryToPass);
                break;
            case 'priority_tasks':
                if (onSelectPriorityTasks) onSelectPriorityTasks(queryToPass);
                else onSelectTaskFilter('ALL', queryToPass);
                break;
            case 'all_tasks':
                onSelectTaskFilter('ALL', queryToPass);
                break;
            case 'stock_category':
                if (item.stockCategory) onSelectStockCategory(item.stockCategory);
                break;
            case 'quotation_sub':
                if (item.quotationSubView) onSelectQuotationSubView(item.quotationSubView);
                break;
            case 'quick_action':
                if (item.quickAction === 'assignment') onOpenAssignmentModal();
                else if (item.quickAction === 'routine_pool') onOpenRoutineModal();
                else if (item.quickAction === 'add_task') onAddTask();
                else if (item.quickAction === 'field_staff' && onOpenFieldStaff) onOpenFieldStaff();
                else if (item.quickAction === 'admin') onOpenAdmin();
                else if (item.quickAction === 'change_password') onPasswordReset();
                else if (item.quickAction === 'logout') onSignOut();
                break;
            case 'profile':
                onOpenProfile();
                break;
        }
    };

    const searchTrimmed = menuSearch.trim();
    const q = searchTrimmed.toLocaleLowerCase('tr');
    const cleanQDigits = searchTrimmed.replace(/\D/g, '');

    // Helper: Matches task against search query (customer name, title, phone, address, notes, orderNumber)
    const searchMatchesTask = (t: Task): boolean => {
        if (!q) return false;
        const title = (t.title || '').toLocaleLowerCase('tr');
        const custName = ((t as any).customerName || '').toLocaleLowerCase('tr');
        const phone = (t.phone || '').replace(/\D/g, '');
        const address = (t.address || '').toLocaleLowerCase('tr');
        const district = (t.district || '').toLocaleLowerCase('tr');
        const generalNote = (t.generalNote || '').toLocaleLowerCase('tr');
        const teamNote = (t.teamNote || '').toLocaleLowerCase('tr');
        const gasNote = (t.gasNote || '').toLocaleLowerCase('tr');
        const serviceNote = (t.serviceNote || '').toLocaleLowerCase('tr');
        const jobDesc = (t.jobDescription || '').toLocaleLowerCase('tr');
        const desc = (t.description || '').toLocaleLowerCase('tr');
        const serialNo = (t.serviceSerialNumber || '').toLocaleLowerCase('tr');
        const orderStr = String(t.orderNumber || '');

        const phoneMatch = cleanQDigits.length >= 3 && phone.includes(cleanQDigits);

        return title.includes(q) ||
            custName.includes(q) ||
            phoneMatch ||
            address.includes(q) ||
            district.includes(q) ||
            generalNote.includes(q) ||
            teamNote.includes(q) ||
            gasNote.includes(q) ||
            serviceNote.includes(q) ||
            jobDesc.includes(q) ||
            desc.includes(q) ||
            serialNo.includes(q) ||
            orderStr === q;
    };

    // Helper: Matches routine task against search query
    const searchMatchesRoutine = (r: RoutineTask): boolean => {
        if (!q) return false;
        const cName = (r.customerName || '').toLocaleLowerCase('tr');
        const content = (r.content || '').toLocaleLowerCase('tr');
        const phone = (r.phoneNumber || '').replace(/\D/g, '');
        const address = (r.address || '').toLocaleLowerCase('tr');

        const phoneMatch = cleanQDigits.length >= 3 && phone.includes(cleanQDigits);

        return cName.includes(q) ||
            content.includes(q) ||
            phoneMatch ||
            address.includes(q);
    };

    const matchingTasks = useMemo(() => {
        if (!isSearching) return [];
        const isStaff = userPermissions && userPermissions.role !== 'admin' && userPermissions.role !== 'manager';
        const allowedCols = userPermissions?.allowedColumns || [];
        const pool = !isStaff
            ? tasks
            : tasks.filter(t => allowedCols.includes(t.status) ||
                (t.assigneeEmail && user?.email && t.assigneeEmail.toLowerCase() === user.email.toLowerCase()) ||
                (userPermissions?.name && t.assignee && t.assignee.trim().toLowerCase() === userPermissions.name.trim().toLowerCase())
            );
        return pool.filter(searchMatchesTask);
    }, [tasks, isSearching, q, cleanQDigits, userPermissions, user]);

    const matchingRoutines = useMemo(() => {
        if (!isSearching) return [];
        return routineTasks.filter(searchMatchesRoutine);
    }, [routineTasks, isSearching, q, cleanQDigits]);

    // Item Match Counts per menu item ID
    const itemMatchCounts = useMemo<Record<string, number>>(() => {
        if (!isSearching) return {};
        const counts: Record<string, number> = {};

        const uEmail = (user?.email || '').toLowerCase();
        const uName = (userPermissions?.name || '').trim().toLowerCase();

        // 1. Task filter statuses
        Object.values(TaskStatus).forEach(status => {
            const count = matchingTasks.filter(t => {
                if (status === TaskStatus.PROJECT_TO_BE_DRAWN) {
                    return t.status === TaskStatus.PROJECT_TO_BE_DRAWN || (t.status === TaskStatus.CHECK_COMPLETED && t.isProjectDrawn === false);
                }
                return t.status === status;
            }).length;
            counts[`task_${status}`] = count;
        });

        // 2. all_tasks
        counts['all_tasks'] = matchingTasks.length;

        // 3. my_tasks
        const myTasksCount = matchingTasks.filter(t => {
            const emailMatch = t.assigneeEmail && uEmail && t.assigneeEmail.toLowerCase() === uEmail;
            const nameMatch = uName && t.assignee && t.assignee.trim().toLowerCase() === uName;
            return emailMatch || nameMatch;
        }).length;
        const myRoutinesCount = matchingRoutines.filter(r => {
            if (r.isCompleted) return false;
            const emailMatch = r.assigneeEmail && uEmail && r.assigneeEmail.toLowerCase() === uEmail;
            const nameMatch = uName && r.assignee && r.assignee.trim().toLowerCase() === uName;
            return emailMatch || nameMatch;
        }).length;
        counts['my_tasks'] = myTasksCount + myRoutinesCount;

        // 4. priority_tasks
        const priorityCount = matchingTasks.filter(t => t.isPriority).length +
            matchingRoutines.filter(r => r.isPriority && !r.isCompleted).length;
        counts['priority_tasks'] = priorityCount;

        // 5. routine_pool
        counts['action_routine_pool'] = matchingRoutines.filter(r => !r.isCompleted).length;

        return counts;
    }, [matchingTasks, matchingRoutines, isSearching, user, userPermissions]);

    // Filter items by search: only include if label matches OR taskMatchCount > 0
    const filteredItems = useMemo(() => {
        if (!isSearching) return allMenuItems;
        return allMenuItems
            .filter(it => (itemMatchCounts[it.id] || 0) > 0 || it.label.toLocaleLowerCase('tr').includes(q))
            .map(it => {
                const count = itemMatchCounts[it.id] || 0;
                return {
                    ...it,
                    badge: count > 0 ? count : undefined
                };
            });
    }, [allMenuItems, isSearching, q, itemMatchCounts]);

    // Favorite items list
    const favoriteItems = useMemo(() => {
        const favs = allMenuItems.filter(item => favorites.includes(item.id));
        if (!isSearching) return favs;
        return favs
            .filter(it => (itemMatchCounts[it.id] || 0) > 0 || it.label.toLocaleLowerCase('tr').includes(q))
            .map(it => {
                const count = itemMatchCounts[it.id] || 0;
                return {
                    ...it,
                    badge: count > 0 ? count : undefined
                };
            });
    }, [allMenuItems, favorites, isSearching, q, itemMatchCounts]);

    // Sections with dynamic match count badges for Ana Başlıklar
    const sections = useMemo(() => {
        const favItems = favoriteItems;
        let favBadge = 0;
        if (isSearching) {
            favBadge = favItems.reduce((acc, it) => acc + (itemMatchCounts[it.id] || 0), 0);
            if (favBadge === 0 && favItems.length > 0) favBadge = favItems.length;
        } else {
            favBadge = favItems.length;
        }

        const taskItems = filteredItems.filter(i => i.sectionId === 'tasks');
        let tasksBadge = 0;
        if (isSearching) {
            tasksBadge = matchingTasks.length > 0 ? matchingTasks.length : taskItems.length;
        } else {
            tasksBadge = taskItems.length;
        }

        const stockItems = filteredItems.filter(i => i.sectionId === 'stock');
        const stockBadge = stockItems.length;

        const actionItems = filteredItems.filter(i => i.sectionId === 'actions');
        let actionsBadge = 0;
        if (isSearching) {
            const routineMatches = itemMatchCounts['action_routine_pool'] || 0;
            actionsBadge = routineMatches > 0 ? routineMatches : actionItems.length;
        } else {
            actionsBadge = actionItems.length;
        }

        const quoteItems = filteredItems.filter(i => i.sectionId === 'quotations');
        const quoteBadge = quoteItems.length;

        const profileItems = filteredItems.filter(i => i.sectionId === 'profile');
        const profileBadge = profileItems.length;

        return [
            {
                id: 'favorites',
                title: 'Favoriler',
                icon: Star,
                iconClass: 'text-amber-500 fill-amber-500',
                items: favItems,
                badge: favBadge
            },
            {
                id: 'tasks',
                title: 'İşler',
                icon: Briefcase,
                iconClass: 'text-[#e65100]',
                items: taskItems,
                badge: tasksBadge
            },
            ...(canSeeStock ? [{
                id: 'stock',
                title: 'Stok',
                icon: Package,
                iconClass: 'text-[#e65100]',
                items: stockItems,
                badge: stockBadge
            }] : []),
            ...(actionItems.length > 0 || !isSearching ? [{
                id: 'actions' as const,
                title: 'Hızlı İşlemler',
                icon: Zap,
                iconClass: 'text-[#e65100]',
                items: actionItems,
                badge: actionsBadge
            }] : []),
            ...(canSeeQuotations ? [{
                id: 'quotations',
                title: 'Teklif',
                icon: FileText,
                iconClass: 'text-[#e65100]',
                items: quoteItems,
                badge: quoteBadge
            }] : []),
            {
                id: 'profile',
                title: 'Profil & Sistem',
                icon: User,
                iconClass: 'text-[#e65100]',
                items: profileItems,
                badge: profileBadge
            }
        ];
    }, [favoriteItems, filteredItems, isSearching, matchingTasks.length, itemMatchCounts, canSeeStock, canSeeQuotations]);

    return (
        <div className="flex flex-col h-full bg-[#121316] font-sans select-none overflow-hidden text-white">
            
            {/* --- TOP HEADER (ANTHRACITE + ORANGE ACCENT - ONAY MÜHENDİSLİK) --- */}
            <div className="relative bg-[#121316] pt-3 pb-3 px-4 border-b border-white/[0.08] shrink-0">
                <div className="relative z-10 flex items-center justify-between gap-3">
                    
                    {/* Left: User Avatar & Info */}
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Circular Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/25 ring-2 ring-white/10 shrink-0">
                            {displayName.slice(0, 1).toLocaleUpperCase('tr-TR')}
                        </div>

                        {/* Title, Name and Role */}
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase leading-none">
                                ONAY MÜHENDİSLİK
                            </span>
                            <span className="text-[15px] font-black text-white leading-tight mt-1 truncate">
                                {displayName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium leading-tight">
                                {roleLabel}
                            </span>
                        </div>
                    </div>

                    {/* Right: Actions (Calendar, Switch to Classic) */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Calendar Icon (Bugünkü İşlerim) */}
                        <button
                            onClick={() => onSelectMyTasks()}
                            className="w-9 h-9 rounded-full bg-[#1c1d22] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:border-orange-500/40 transition-all active:scale-95"
                            title="Bugünkü İşlerim"
                        >
                            <Calendar className="w-4 h-4 stroke-[2.2]" />
                        </button>

                        {/* Switch View Button */}
                        <button
                            onClick={onSwitchToClassic}
                            className="h-9 px-2.5 rounded-full bg-[#1c1d22] border border-white/10 flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:border-orange-500/40 transition-all active:scale-95"
                            title="Klasik Menüye Geç"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
                            <span>Klasik</span>
                        </button>
                    </div>
                </div>

                {/* Permanent Search Bar - "Bul..." */}
                <div className="mt-2.5 relative">
                    <input
                        type="text"
                        placeholder="Bul (Müşteri adı, telefon, iş veya menü)..."
                        value={menuSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full bg-[#1c1d22] border border-white/10 hover:border-orange-500/40 focus:border-orange-500 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 shadow-inner transition-all"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                    {menuSearch && (
                        <button
                            onClick={() => handleSearchChange('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                            title="Aramayı Temizle"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* --- MAIN SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3 custom-scrollbar">

                {/* --- TOP BANNER: SAHADAKİ PERSONEL (FOR ADMIN) vs ATANAN İŞLERİM (FOR STAFF) --- */}
                {!isSearching && (
                    isAdmin ? (
                        <div 
                            onClick={onOpenFieldStaff || onOpenAssignmentModal}
                            className="bg-[#1c1d22] border border-white/[0.08] hover:border-orange-500/40 rounded-2xl p-4 shadow-md shadow-black/25 transition-all cursor-pointer group active:scale-[0.99]"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-[#282a35] flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-black text-white">Sahadaki Personel</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-orange-400 font-bold text-xs bg-orange-500/15 border border-orange-500/25 px-2.5 py-1 rounded-full">
                                    <span>Personel Takibi</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            <div className="mt-3 flex items-baseline justify-between">
                                <span className="text-3xl font-black text-white tracking-tight">
                                    {staffList?.length || 0}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">
                                    Kayıtlı saha personeli ve iş durumu
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div 
                            onClick={() => onSelectMyTasks()}
                            className="bg-[#1c1d22] border border-white/[0.08] hover:border-orange-500/40 rounded-2xl p-4 shadow-md shadow-black/25 transition-all cursor-pointer group active:scale-[0.99]"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-[#282a35] flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        <UserCheck className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-black text-white">Atanan İşlerim</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-orange-400 font-bold text-xs bg-orange-500/15 border border-orange-500/25 px-2.5 py-1 rounded-full">
                                    <span>Görüntüle</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            <div className="mt-3 flex items-baseline justify-between">
                                <span className="text-3xl font-black text-white tracking-tight">
                                    {taskCounts.my || 0}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">
                                    Bana atanan aktif iş ve eksik
                                </span>
                            </div>
                        </div>
                    )
                )}

                {/* --- ACCORDION CATEGORIES LIST --- */}
                <div className="space-y-2.5">
                    {sections.map(section => {
                        const hasItems = section.items && section.items.length > 0;

                        // If searching and this section has no matching items, skip
                        if (isSearching && !hasItems) return null;

                        const isOpen = isSearching
                            ? (section.badge > 0 && openSections[`search_${section.id}`] !== false)
                            : !!openSections[section.id];

                        return (
                            <div 
                                key={section.id} 
                                className="bg-[#1c1d22] rounded-2xl border border-white/[0.08] shadow-md shadow-black/20 overflow-hidden transition-all duration-200"
                            >
                                {/* Accordion Row Header (Ana Başlık) */}
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
                                        isOpen 
                                            ? 'bg-[#22242c] border-b border-white/[0.08]' 
                                            : 'hover:bg-[#22242c]/70'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-[#282a35] border border-white/5 flex items-center justify-center shrink-0">
                                            <section.icon className={`w-5 h-5 ${section.id === 'favorites' ? 'text-amber-400 fill-amber-400' : 'text-orange-400'}`} />
                                        </div>
                                        <span className="font-black text-[15px] text-white tracking-tight">
                                            {section.title}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {section.badge > 0 && (
                                            <span className={`text-[11.5px] font-black px-2.5 py-0.5 rounded-full transition-all ${
                                                isSearching 
                                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/35 ring-1 ring-white/20 scale-105' 
                                                    : 'text-orange-400 bg-orange-500/15 border border-orange-500/25'
                                            }`}>
                                                {section.badge}
                                            </span>
                                        )}
                                        {isOpen ? (
                                            <ChevronUp className="w-5 h-5 text-orange-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                </button>

                                {/* Accordion Content Grid (Dallar / Alt Kutular) */}
                                {isOpen && (
                                    <div className="p-2.5 bg-[#14151a]">
                                        {section.items.length === 0 ? (
                                            <div className="py-4 text-center text-xs text-slate-400">
                                                {section.id === 'favorites' 
                                                    ? 'Henüz favori öğe eklemediniz. Kartların sağ üstündeki yıldıza tıklayarak ekleyebilirsiniz.' 
                                                    : 'Bu kategoride görüntülenecek öğe bulunamadı.'}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-4 gap-2">
                                                {section.items.map(item => {
                                                    const ItemIcon = item.icon;
                                                    const isFav = favorites.includes(item.id);

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => handleItemClick(item)}
                                                            className="relative flex flex-col items-center justify-between p-2 min-h-[84px] bg-[#1f2129] rounded-xl border border-white/[0.06] shadow-sm hover:border-orange-500/40 active:scale-95 transition-all cursor-pointer group"
                                                        >
                                                            {/* Favorite Star Button (Top Right) */}
                                                            <button
                                                                onClick={(e) => toggleFavorite(item.id, e)}
                                                                className="absolute top-1.5 right-1.5 p-0.5 text-slate-500 hover:text-amber-400 transition-colors z-10"
                                                                title={isFav ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                                                            >
                                                                <Star 
                                                                    className={`w-3.5 h-3.5 ${
                                                                        isFav 
                                                                            ? 'text-amber-400 fill-amber-400' 
                                                                            : 'text-slate-500 hover:text-amber-400'
                                                                    }`} 
                                                                />
                                                            </button>

                                                            {/* Badge (Top Left) if count > 0 */}
                                                            {item.badge !== undefined && (
                                                                <span className={`absolute top-1.5 left-1.5 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs leading-tight ${
                                                                    isSearching 
                                                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 ring-1 ring-white/30 scale-105' 
                                                                        : 'bg-gradient-to-r from-orange-500 to-amber-500'
                                                                }`}>
                                                                    {item.badge}
                                                                </span>
                                                            )}

                                                            {/* Icon in Center */}
                                                            <div className="flex-1 flex items-center justify-center pt-2 pb-1">
                                                                <div className="w-8 h-8 rounded-lg bg-[#282a35] group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-colors">
                                                                    <ItemIcon className="w-4.5 h-4.5 text-orange-400 group-hover:text-white transition-colors" />
                                                                </div>
                                                            </div>

                                                            {/* Label Underneath */}
                                                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-200 text-center leading-[1.18] line-clamp-2 w-full mt-0.5">
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Empty State when Search produces 0 results */}
                {isSearching && sections.every(s => s.items.length === 0) && (
                    <div className="py-12 px-4 text-center flex flex-col items-center justify-center bg-[#1c1d22] rounded-2xl border border-white/[0.08] shadow-md">
                        <div className="w-12 h-12 rounded-2xl bg-[#282a35] border border-white/5 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
                            <Search className="w-6 h-6 text-orange-400/70" />
                        </div>
                        <div className="text-sm font-bold text-slate-200">
                            "{menuSearch}" ile eşleşen sonuç bulunamadı
                        </div>
                        <div className="text-xs text-slate-400 mt-1 max-w-xs">
                            Müşteri adı, telefon numarası veya menü başlığı aramayı deneyebilirsiniz.
                        </div>
                        <button
                            onClick={() => setMenuSearch('')}
                            className="mt-4 px-4 py-1.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25 text-xs font-bold hover:bg-orange-500/25 active:scale-95 transition-all"
                        >
                            Aramayı Temizle
                        </button>
                    </div>
                )}

            </div>

        </div>
    );
};
