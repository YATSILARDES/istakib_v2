import React, { useState, useMemo, useRef } from 'react';
import { Home, Search, Plus, User, Bell, MapPin, Phone, Calendar, ChevronRight, ChevronDown, ChevronLeft, Filter, LogOut, KeyRound, LayoutGrid, List, CheckSquare, Clock, AlertTriangle, Check, CheckCircle2, Shield, Users, Share2, Package, FileText, FolderOpen, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import StockCombisView from './StockCombisView';
import StockRadiatorsView from './StockRadiatorsView';
import StockGenericView from './StockGenericView';
import { Task, TaskStatus, StatusLabels, RoutineTask, UserPermission, StaffMember, Quotation } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../src/firebase';
import { QuotationApp } from '../teklif_app/QuotationApp';
import QuotationsListView from './QuotationsListView';
import { MobileDiaMenu } from './MobileDiaMenu';
import { MobileErpTaskList } from './MobileErpTaskList';
import { MobileErpStockView } from './MobileErpStockView';

const formatSafeDate = (dateVal: any) => {
  if (!dateVal) return '';
  try {
      if (typeof dateVal === 'string') {
          // Eğer tarih string olarak geldiyse (Örn: "07.09.2026 17:25:32")
          // Sadece tarih kısmını alıp saat/dakika/saniyeyi atıyoruz
          const datePart = dateVal.split(' ')[0];
          
          // Eğer datePart zaten gg.aa.yyyy veya yyyy-aa-gg formatındaysa direkt onu döndür
          if (datePart.includes('.') || datePart.includes('-') || datePart.includes('/')) {
              return datePart;
          }
      }

      let d: Date | null = null;
      if (typeof dateVal === 'string' || typeof dateVal === 'number') {
          d = new Date(dateVal);
      } else if (dateVal instanceof Date) {
          d = dateVal;
      } else if (dateVal.toMillis && typeof dateVal.toMillis === 'function') {
          d = new Date(dateVal.toMillis());
      } else if (dateVal.seconds) {
          d = new Date(dateVal.seconds * 1000);
      } else if (dateVal._seconds) {
          d = new Date(dateVal._seconds * 1000);
      }
      
      if (!d || isNaN(d.getTime())) {
          return typeof dateVal === 'string' ? dateVal.split(' ')[0] : String(dateVal);
      }
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
      return typeof dateVal === 'string' ? dateVal.split(' ')[0] : String(dateVal);
  }
};

const parseEffectiveDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    try {
        if (dateVal instanceof Date) {
            return isNaN(dateVal.getTime()) ? null : dateVal;
        }
        if (typeof dateVal.toDate === 'function') {
            return dateVal.toDate();
        }
        if (typeof dateVal.toMillis === 'function') {
            return new Date(dateVal.toMillis());
        }
        if (typeof dateVal.seconds === 'number') {
            return new Date(dateVal.seconds * 1000);
        }
        if (typeof dateVal._seconds === 'number') {
            return new Date(dateVal._seconds * 1000);
        }
        if (typeof dateVal === 'number') {
            return new Date(dateVal > 1e11 ? dateVal : dateVal * 1000);
        }
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

interface MobileLayoutProps {
    user: FirebaseUser | null;
    userPermissions: UserPermission | null;
    tasks: Task[];
    routineTasks: RoutineTask[];
    staffList: StaffMember[];
    onSignOut: () => void;
    onTaskClick: (task: Task) => void;
    onAddTask: () => void;
    onToggleRoutineTask: (taskId: string) => void;
    onUpdateRoutineTask?: (taskId: string, updates: Partial<RoutineTask>) => void;
    onOpenAdmin: () => void;
    onOpenRoutineModal: () => void;
    onOpenAssignmentModal: () => void;
    onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
    onOpenFieldStaff?: () => void;
}

export default function MobileLayout({
    user,
    userPermissions,
    tasks,
    routineTasks,
    staffList,
    onSignOut,
    onTaskClick,
    onAddTask,
    onToggleRoutineTask,
    onUpdateRoutineTask,
    onOpenAdmin,
    onOpenRoutineModal,
    onOpenAssignmentModal,
    onTaskUpdate,
    onOpenFieldStaff
}: MobileLayoutProps) {
    // Menu Style: 'dia' vs 'classic'
    const [menuStyle, setMenuStyle] = useState<'dia' | 'classic'>(() => {
        try {
            return (localStorage.getItem('mobile_menu_style') as 'dia' | 'classic') || 'dia';
        } catch (e) {
            return 'dia';
        }
    });

    const setAndPersistMenuStyle = (style: 'dia' | 'classic') => {
        setMenuStyle(style);
        try {
            localStorage.setItem('mobile_menu_style', style);
        } catch (e) {}
    };

    // Sub-view inside DIA mode: 'menu' (main DIA accordion grid) vs active sub-view
    const [diaSubView, setDiaSubView] = useState<'menu' | 'task_list' | 'my_tasks' | 'priority_tasks' | 'stock' | 'quotations' | 'profile'>('menu');
    const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');

    const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'profile' | 'stock' | 'quotations'>('home');
    const [editingQuotation, setEditingQuotation] = useState<{ data: any; id: string } | null>(null);
    const [quotationSubView, setQuotationSubView] = useState<'hub' | 'prepare' | 'list'>('hub');
    const [stockCategory, setStockCategory] = useState<'combis' | 'radiators' | 'heatpumps' | 'thermosiphons' | 'acs' | 'electric_combis' | 'instant_heaters' | 'others'>('combis');
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Helper: Get Display Name
    const displayName = userPermissions?.name || user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';
    const roleName = userPermissions?.role === 'admin' ? 'Yönetici' : 'Personel';

    // --- DATA FILTERING LOGIC ---

    // 1. My Items (Tasks & Routine Tasks)
    const userEmail = (user?.email || '').toLowerCase();
    const userName = (userPermissions?.name || '').trim().toLowerCase();

    const myTasks = tasks.filter(t => {
        const emailMatch = t.assigneeEmail && userEmail && t.assigneeEmail.toLowerCase() === userEmail;
        const nameMatch = userName && t.assignee && t.assignee.trim().toLowerCase() === userName;
        return emailMatch || nameMatch;
    });

    // Filtered Tasks (Main Tasks)
    const filterTask = (task: Task) => {
        if (!searchQuery.trim()) return true;
        const lowerQ = searchQuery.toLocaleLowerCase('tr');
        const title = (task.title || '').toLocaleLowerCase('tr');
        const address = (task.address || '').toLocaleLowerCase('tr');
        const phone = (task.phone || '').toLocaleLowerCase('tr');
        const desc = (task.description || '').toLocaleLowerCase('tr');
        return title.includes(lowerQ) || address.includes(lowerQ) || phone.includes(lowerQ) || desc.includes(lowerQ);
    };

    const filteredMainTasks = myTasks.filter(t => {
        // Filter by Status: Hide CHECK_COMPLETED (Kontrolü Yapılan İşler) unless project is missing OR explicitly reassigned
        if (t.status === TaskStatus.CHECK_COMPLETED && t.isProjectDrawn !== false && !t.isReassignedForCheck) return false;

        // Filter by Check Status: Hide logic if check is done (missing or clean), unless explicitly reassigned
        if (t.checkStatus && !t.isReassignedForCheck) return false;

        // Filter by Search
        if (!filterTask(t)) return false;

        // Filter by Date: Show only Today or Past (uncompleted backlog), HIDE Future!
        const taskDate = parseEffectiveDate(t.scheduledDate || t.date || t.createdAt);
        if (taskDate) {
            const today = new Date();
            taskDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            // Future -> HIDE! (Günü geldiğinde görünsün)
            if (taskDate.getTime() > today.getTime()) {
                return false;
            }
        }

        return true;
    }).sort((a, b) => {
        // Sort by Date (Scheduled > Created)
        const getDate = (t: Task) => {
            const d = parseEffectiveDate(t.scheduledDate || t.date || t.createdAt);
            return d ? d.getTime() : 0;
        };
        return getDate(a) - getDate(b);
    });

    const myRoutineTasks = routineTasks.filter(t => {
        // 1. Assignment Check
        const emailMatch = t.assigneeEmail && userEmail && t.assigneeEmail.toLowerCase() === userEmail;
        const nameMatch = userName && t.assignee && t.assignee.trim().toLowerCase() === userName;
        if (!emailMatch && !nameMatch) return false;

        // 2. Hide completed routine tasks from active list
        if (t.isCompleted) return false;

        // 3. Filter by Date: Show only Today or Past (uncompleted rollover), HIDE Future!
        const filterDate = parseEffectiveDate(t.scheduledDate || t.createdAt);
        if (filterDate) {
            const today = new Date();
            filterDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            // Future -> HIDE! (Günü geldiğinde görünsün)
            if (filterDate.getTime() > today.getTime()) {
                return false;
            }
        }

        return true;
    }).sort((a, b) => {
        const getDate = (t: RoutineTask) => {
            const d = parseEffectiveDate(t.scheduledDate || t.createdAt);
            return d ? d.getTime() : 0;
        };
        return getDate(a) - getDate(b);
    });

    // 2. Filter Helper Function (Search)
    const applySearch = (items: any[]) => {
        if (!searchQuery.trim()) return items;
        const lowerQ = searchQuery.toLocaleLowerCase('tr'); // Turkish sensitive lowercasing
        return items.filter(item => {
            const title = (item.title || item.content || '').toLocaleLowerCase('tr');
            const address = (item.address || '').toLocaleLowerCase('tr');
            const phone = (item.phone || item.phoneNumber || '').toLocaleLowerCase('tr');
            const customer = (item.customerName || '').toLocaleLowerCase('tr');
            return title.includes(lowerQ) || address.includes(lowerQ) || phone.includes(lowerQ) || customer.includes(lowerQ);
        });
    };

    // 3. Columns Logic (Based on Permissions)
    const availableStatusList = Object.values(TaskStatus).filter(status => {
        // If admin, show all
        if (userPermissions?.role === 'admin') return true;
        // If no explicit permissions, show all (safe fallback) or none? Desktop shows none usually if blocked.
        if (!userPermissions?.allowedColumns) return true;
        // Filter based on allowed columns
        return userPermissions.allowedColumns.includes(status);
    });

    // 4. Tab Specific Logic
    let displayedTasks: Task[] = [];
    let displayedRoutineTasks: RoutineTask[] = [];

    if (activeTab === 'home') {
        // Filter by Status Pill
        const statusFiltered = filterStatus === 'ALL'
            ? tasks
            : tasks.filter(t => filterStatus === TaskStatus.PROJECT_TO_BE_DRAWN
                ? (t.status === TaskStatus.PROJECT_TO_BE_DRAWN || (t.status === TaskStatus.CHECK_COMPLETED && !t.isProjectDrawn))
                : t.status === filterStatus
            );

        // Apply Search
        displayedTasks = applySearch(statusFiltered);
        displayedRoutineTasks = []; // Home only shows main tasks for now? Or separate pool? sticking to Main Tasks per requirement.

    } else if (activeTab === 'tasks') {
        // My Tasks (Already filtered by user) -> Apply Search & Date Logic
        // Note: filteredMainTasks already includes applySearch equivalent logic inside filterTask function
        // But wait, applySearch helper is used for Home tab. 
        // filteredMainTasks uses filterTask which replicates applySearch logic.
        // So we can just use filteredMainTasks directly.
        displayedTasks = filteredMainTasks;

        // Use myRoutineTasks (which is also date-filtered and sorted)
        // Check if myRoutineTasks needs search? 
        // Current logic: myRoutineTasks has NO search applied in its definition above?
        // Let's check myRoutineTasks definition. It ONLY filters by date/assignment.
        // So we should apply search to it.
        displayedRoutineTasks = applySearch(myRoutineTasks);
    }

    // --- ADMIN: Group tasks by staff for accordion view ---
    // Only show ACTIVE tasks: TO_CHECK status, today/past date, no checkStatus
    const tasksByStaff = useMemo(() => {
        if (userPermissions?.role !== 'admin' || !staffList || staffList.length === 0) return null;

        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today

        const grouped: Record<string, Array<{ type: 'main' | 'routine', data: Task | RoutineTask, dailyOrder: number }>> = {};

        staffList.forEach(staff => {
            // Filter tasks: TO_CHECK, no checkStatus, scheduled for today or past
            const staffTasks = tasks.filter(t => {
                // Basic filters (status, checkStatus, assignee)
                const basicMatch = (t.status !== TaskStatus.CHECK_COMPLETED || t.isProjectDrawn === false) &&
                    !t.checkStatus &&
                    (t.assigneeEmail?.toLowerCase() === staff.email.toLowerCase() || t.assignee === staff.name);

                if (!basicMatch) return false;

                // Date filter: only today or past (not future)
                if (t.scheduledDate) {
                    const schedDate = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
                    return schedDate <= today;
                }
                return true; // No scheduled date = show it
            });

            // Filter routine tasks: incomplete, today or past
            const staffRoutines = routineTasks.filter(t => {
                const basicMatch = !t.isCompleted &&
                    (t.assigneeEmail?.toLowerCase() === staff.email.toLowerCase() || t.assignee === staff.name);

                if (!basicMatch) return false;

                // Date filter for routine tasks
                const date = t.scheduledDate || t.createdAt;
                if (date) {
                    const taskDate = new Date(date.seconds ? date.seconds * 1000 : date);
                    return taskDate <= today;
                }
                return true;
            });

            // COMBINE AND SORT (Matching 'combinedTasks' logic)
            const mainItems = staffTasks.map(t => ({
                type: 'main' as const,
                data: t,
                getTime: () => {
                    let d = t.scheduledDate ? t.scheduledDate : t.date;
                    if (t.scheduledDate?.seconds) return t.scheduledDate.seconds * 1000;
                    if (typeof d === 'string') { const date = new Date(d); if (!isNaN(date.getTime())) return date.getTime(); }
                    return t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
                },
                dailyOrder: t.dailyOrder || 0
            }));

            const routineItems = staffRoutines.map(t => ({
                type: 'routine' as const,
                data: t,
                getTime: () => {
                    if (t.scheduledDate?.seconds) return t.scheduledDate.seconds * 1000;
                    if (t.scheduledDate) return new Date(t.scheduledDate).getTime();
                    return t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
                },
                dailyOrder: t.dailyOrder || 0
            }));

            const combined = [...mainItems, ...routineItems].sort((a, b) => {
                // 1. Full Date Sort (Includes Hour precision from AssignmentView)
                const timeA = a.getTime();
                const timeB = b.getTime();

                if (timeA !== timeB) return timeA - timeB;

                // 2. Daily Order Sort
                // Matched with AssignmentView Week Sorting
                if (a.dailyOrder === 0 && b.dailyOrder === 0) {
                    if (a.type === b.type) return 0;
                    return a.type === 'routine' ? -1 : 1;
                }
                return a.dailyOrder - b.dailyOrder;
            });

            grouped[staff.name] = combined;
        });

        return grouped;
    }, [userPermissions, staffList, tasks, routineTasks]);    // --- COMBINED SORTING LOGIC (Custom Order) ---
    const combinedTasks = React.useMemo(() => {
        if (activeTab !== 'tasks') return [];

        const mainItems = displayedTasks.map(t => ({
            type: 'main' as const,
            data: t,
            // Calculate sort date (Scheduled > Date > Created)
            getTime: () => {
                let d = t.scheduledDate ? t.scheduledDate : t.date;
                // Handle various formats
                if (t.scheduledDate?.seconds) return t.scheduledDate.seconds * 1000;
                if (typeof d === 'string') { const date = new Date(d); if (!isNaN(date.getTime())) return date.getTime(); }
                return t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
            },
            dailyOrder: t.dailyOrder || 0
        }));

        const routineItems = displayedRoutineTasks.map(t => ({
            type: 'routine' as const,
            data: t,
            getTime: () => {
                if (t.scheduledDate?.seconds) return t.scheduledDate.seconds * 1000;
                if (t.scheduledDate) return new Date(t.scheduledDate).getTime();
                return t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
            },
            dailyOrder: t.dailyOrder || 0
        }));

        return [...mainItems, ...routineItems].sort((a, b) => {
            // 1. Full Date Sort (Includes Hour precision from AssignmentView)
            const timeA = a.getTime();
            const timeB = b.getTime();

            if (timeA !== timeB) return timeA - timeB;

            // 2. Daily Order Sort
            // Matched with AssignmentView Week Sorting
            if (a.dailyOrder === 0 && b.dailyOrder === 0) {
                if (a.type === b.type) return 0;
                return a.type === 'routine' ? -1 : 1;
            }
            return a.dailyOrder - b.dailyOrder;
        });
    }, [displayedTasks, displayedRoutineTasks, activeTab]);

    const handleShareTask = async (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        const cleanAddress = (task.address || '').replace(/https?:\/\/[^\s]+/g, '').trim();
        let addressLine = cleanAddress;
        if (task.district) addressLine += ` / ${task.district}`;
        if (task.city) addressLine += ` / ${task.city}`;

        let shareText = `👤 ${task.title}\n📞 ${task.phone || 'Telefon Yok'}\n🏠 ${addressLine || 'Adres Yok'}`;

        if (task.locationCoordinates) {
            shareText += `\n\n📍 Konum:\n${task.locationCoordinates}`;
        }

        const shareData = {
            title: 'Müşteri Bilgileri',
            text: shareText
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareText);
                alert('Bilgiler panoya kopyalandı.');
            }
        } catch (err) {
            console.error('Sharing failed', err);
        }
    };

    // Handlers
    const handlePasswordReset = async () => {
        if (user?.email) {
            if (confirm(`${user.email} adresine şifre sıfırlama bağlantısı gönderilsin mi?`)) {
                try {
                    await sendPasswordResetEmail(auth, user.email);
                    alert('E-posta gönderildi! Lütfen gelen kutunuzu kontrol edin.');
                } catch (error) {
                    alert('Hata oluştu: ' + (error as any).message);
                }
            }
        }
    };

    if (menuStyle === 'dia') {
        if (diaSubView === 'menu') {
            return (
                <MobileDiaMenu
                    user={user}
                    userPermissions={userPermissions}
                    tasks={tasks}
                    routineTasks={routineTasks}
                    staffList={staffList}
                    initialSearch={taskSearchQuery}
                    onSearchChange={(q) => setTaskSearchQuery(q)}
                    onSelectTaskFilter={(status, initialSearch) => {
                        setFilterStatus(status);
                        setTaskSearchQuery(initialSearch || '');
                        setActiveTab('home');
                        setDiaSubView('task_list');
                    }}
                    onSelectMyTasks={(initialSearch) => {
                        setTaskSearchQuery(initialSearch || '');
                        setActiveTab('tasks');
                        setDiaSubView('my_tasks');
                    }}
                    onSelectPriorityTasks={(initialSearch) => {
                        setTaskSearchQuery(initialSearch || '');
                        setDiaSubView('priority_tasks');
                    }}
                    onSelectStockCategory={(cat) => {
                        setStockCategory(cat);
                        setActiveTab('stock');
                        setDiaSubView('stock');
                    }}
                    onSelectQuotationSubView={(sub) => {
                        setEditingQuotation(null);
                        setQuotationSubView(sub);
                        setActiveTab('quotations');
                        setDiaSubView('quotations');
                    }}
                    onOpenAssignmentModal={onOpenAssignmentModal}
                    onOpenRoutineModal={onOpenRoutineModal}
                    onOpenFieldStaff={onOpenFieldStaff}
                    onOpenAdmin={onOpenAdmin}
                    onAddTask={onAddTask}
                    onSignOut={onSignOut}
                    onOpenProfile={() => {
                        setActiveTab('profile');
                        setDiaSubView('profile');
                    }}
                    onPasswordReset={handlePasswordReset}
                    onSwitchToClassic={() => setAndPersistMenuStyle('classic')}
                />
            );
        }

        if (diaSubView === 'priority_tasks') {
            const priorityTasks = tasks.filter(t => t.isPriority);
            const priorityRoutineTasks = routineTasks.filter(r => r.isPriority && !r.isCompleted);

            return (
                <MobileErpTaskList
                    title="Öncelikli İşler"
                    tasks={priorityTasks}
                    routineTasks={priorityRoutineTasks}
                    initialSearchQuery={taskSearchQuery}
                    onToggleRoutineTask={(id) => onToggleRoutineTask(id)}
                    onUpdateRoutineTask={onUpdateRoutineTask}
                    user={user}
                    userPermissions={userPermissions}
                    onBackToMenu={() => setDiaSubView('menu')}
                    onTaskClick={onTaskClick}
                    onAddTask={onAddTask}
                    onTaskUpdate={onTaskUpdate}
                    onSwitchToClassic={() => setAndPersistMenuStyle('classic')}
                    currentFilterStatus="ALL"
                />
            );
        }

        if (diaSubView === 'task_list') {
            const isStaff = userPermissions && userPermissions.role !== 'admin' && userPermissions.role !== 'manager';
            const allowedCols = userPermissions?.allowedColumns || [];

            const taskSource = filterStatus === 'ALL'
                ? (isStaff ? tasks.filter(t => allowedCols.includes(t.status)) : tasks)
                : tasks.filter(t => filterStatus === TaskStatus.PROJECT_TO_BE_DRAWN
                    ? (t.status === TaskStatus.PROJECT_TO_BE_DRAWN || (t.status === TaskStatus.CHECK_COMPLETED && !t.isProjectDrawn))
                    : t.status === filterStatus
                );

            return (
                <MobileErpTaskList
                    title={filterStatus === 'ALL' ? 'Tüm İşler' : (StatusLabels[filterStatus] || 'İş Listesi')}
                    tasks={taskSource}
                    initialSearchQuery={taskSearchQuery}
                    onUpdateRoutineTask={onUpdateRoutineTask}
                    user={user}
                    userPermissions={userPermissions}
                    onBackToMenu={() => setDiaSubView('menu')}
                    onTaskClick={onTaskClick}
                    onAddTask={onAddTask}
                    onTaskUpdate={onTaskUpdate}
                    onSwitchToClassic={() => setAndPersistMenuStyle('classic')}
                    currentFilterStatus={filterStatus}
                />
            );
        }

        if (diaSubView === 'my_tasks') {
            return (
                <MobileErpTaskList
                    title="Bana Atananlar (İşlerim)"
                    tasks={filteredMainTasks}
                    routineTasks={myRoutineTasks}
                    initialSearchQuery={taskSearchQuery}
                    onToggleRoutineTask={(id) => onToggleRoutineTask(id)}
                    onUpdateRoutineTask={onUpdateRoutineTask}
                    user={user}
                    userPermissions={userPermissions}
                    onBackToMenu={() => setDiaSubView('menu')}
                    onTaskClick={onTaskClick}
                    onAddTask={onAddTask}
                    onTaskUpdate={onTaskUpdate}
                    onSwitchToClassic={() => setAndPersistMenuStyle('classic')}
                    currentFilterStatus="ALL"
                />
            );
        }

        if (diaSubView === 'stock') {
            return (
                <MobileErpStockView
                    category={stockCategory}
                    userPermissions={userPermissions}
                    onBackToMenu={() => setDiaSubView('menu')}
                    onSwitchToClassic={() => setAndPersistMenuStyle('classic')}
                />
            );
        }
    }

    return (
        <div className="flex flex-col h-screen bg-slate-900 font-sans overflow-hidden">

            {/* HEADER AREA: DIA Subview Header vs Classic Header */}
            {menuStyle === 'dia' ? (
                /* DIA Subview Sticky Top Header (Warm Orange) */
                <div className="sticky top-0 z-30 px-4 py-3 bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white flex items-center justify-between shadow-md shrink-0">
                    <button
                        onClick={() => setDiaSubView('menu')}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center text-white transition-all shadow-xs"
                    >
                        <ChevronLeft className="w-6 h-6 stroke-[2.5] -ml-0.5" />
                    </button>

                    <div className="flex flex-col items-center">
                        <h2 className="text-sm font-bold tracking-tight text-white truncate max-w-[200px] text-center">
                            {diaSubView === 'stock' && (
                                stockCategory === 'combis' ? 'Kombiler' :
                                stockCategory === 'radiators' ? 'Radyatörler' :
                                stockCategory === 'heatpumps' ? 'Isı Pompaları' :
                                stockCategory === 'thermosiphons' ? 'Termosifonlar' :
                                stockCategory === 'acs' ? 'Klimalar' :
                                stockCategory === 'electric_combis' ? 'Elektrikli Kombi' :
                                stockCategory === 'instant_heaters' ? 'Ani Isıtıcı (DDEİ)' : 'Diğer Stoklar'
                            )}
                            {diaSubView === 'quotations' && (
                                quotationSubView === 'prepare' ? 'Teklif Hazırla' :
                                quotationSubView === 'list' ? 'Hazırlanan Teklifler' : 'Teklif Yönetimi'
                            )}
                            {diaSubView === 'profile' && 'Profil & Güvenlik'}
                        </h2>
                        <span className="text-[10px] text-orange-100 font-medium">
                            {diaSubView === 'stock' ? 'Stok Takip Modülü' : 'Onay Mühendislik'}
                        </span>
                    </div>

                    <button
                        onClick={() => setAndPersistMenuStyle('classic')}
                        className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold border border-white/30 active:scale-95 transition-all"
                        title="Klasik Görünüme Geç"
                    >
                        Klasik
                    </button>
                </div>
            ) : (
                /* Classic Header (Sticky Top) */
                <>
                    {activeTab !== 'profile' && (
                        <div className="sticky top-0 z-30 px-5 pt-6 pb-3 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/10 shrink-0 space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Merhaba,</h2>
                                    <h1 className="text-xl font-bold text-white leading-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">{displayName}</h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setDiaSubView('menu');
                                            setAndPersistMenuStyle('dia');
                                        }}
                                        className="px-3 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 flex items-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <span>📱 ONAY Menü</span>
                                    </button>
                                    {(userPermissions?.canAddCustomers || userPermissions?.role === 'admin') && (
                                        <button
                                            onClick={onAddTask}
                                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30 text-white flex items-center justify-center active:scale-95 transition-all duration-200 hover:shadow-orange-500/50"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Search Input - Enhanced */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-orange-400 transition-colors" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        inputMode="search"
                                        placeholder="İş, müşteri, adres veya telefon ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            inputRef.current?.focus({ preventScroll: true });
                                        }}
                                        className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/30 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HEADER (Profile) */}
                    {activeTab === 'profile' && (
                        <div className="px-5 pt-8 pb-4 bg-slate-900 shrink-0 flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-white">Profilim</h1>
                            <button
                                onClick={() => {
                                    setDiaSubView('menu');
                                    setAndPersistMenuStyle('dia');
                                }}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-xs"
                            >
                                📱 ONAY Menü
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* DIA Search bar for tasks subview */}
            {menuStyle === 'dia' && (diaSubView === 'task_list' || diaSubView === 'my_tasks') && (
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800/80 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Müşteri, adres, telefon veya iş ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth pb-24">

                {/* VIEW: HOME & TASKS */}
                {activeTab !== 'profile' && (
                    <div className="px-4 py-2 space-y-6">

                        {/* Filter Pills (Home Only) - REMOVED 'ALL' BUTTON */}
                        {activeTab === 'home' && (
                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                                {availableStatusList.map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${filterStatus === status ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                                    >
                                        {StatusLabels[status]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* --- HOME TAB LIST RENDER --- */}
                        {activeTab === 'home' && (
                            <div className="space-y-4 pt-2">
                                {displayedTasks.length === 0 ? (
                                    <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center">
                                            <Search className="w-8 h-8 opacity-20" />
                                        </div>
                                        <span className="text-sm">
                                            {searchQuery ? 'Arama kriterlerine uygun iş bulunamadı.' : 'Bu kategoride iş bulunmuyor.'}
                                        </span>
                                    </div>
                                ) : (
                                    displayedTasks.map(task => {
                                        // COLOR CODING LOGIC (Copied from below)
                                        let cardStyle = "bg-slate-800 border-slate-700/50";
                                        let badgeStyle = "bg-blue-500/20 text-blue-400";
                                        let shadowStyle = "";

                                        if (task.isWaiting) {
                                            cardStyle = "bg-blue-950/20 border-blue-500/40";
                                            badgeStyle = "bg-blue-500/20 text-blue-400";
                                            shadowStyle = "shadow-[0_0_15px_-5px_rgba(37,99,235,0.2)]";
                                        } else if (task.status === TaskStatus.GAS_OPENED && ((Date.now() - (task.updatedAt?.toMillis?.() || task.updatedAt || Date.now())) / (1000 * 60 * 60 * 24)) > 2) {
                                            cardStyle = "bg-rose-950/30 border-rose-500/60";
                                            badgeStyle = "bg-rose-500/20 text-rose-400";
                                            shadowStyle = "shadow-[0_0_20px_-5px_rgba(225,29,72,0.4)]";
                                        } else if (task.checkStatus === 'missing') {
                                            cardStyle = "bg-orange-950/30 border-orange-500/50";
                                            badgeStyle = "bg-orange-500/20 text-orange-400";
                                            shadowStyle = "shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]";
                                        } else if (task.status === TaskStatus.PROJECT_TO_BE_DRAWN || (task.status === TaskStatus.CHECK_COMPLETED && task.isProjectDrawn === false)) {
                                            cardStyle = "bg-amber-950/20 border-amber-500/40";
                                            badgeStyle = "bg-amber-500/20 text-amber-400";
                                            shadowStyle = "shadow-[0_0_15px_-5px_rgba(245,158,11,0.2)]";
                                        } else if (task.checkStatus === 'clean') {
                                            cardStyle = "bg-emerald-950/40 border-emerald-500/40";
                                            badgeStyle = "bg-gradient-to-r from-emerald-500/30 to-emerald-600/20 text-emerald-300 border border-emerald-500/30";
                                            shadowStyle = "shadow-lg shadow-emerald-500/10";
                                        }

                                        return (
                                            <div
                                                key={task.id}
                                                className={`rounded-2xl p-4 border backdrop-blur-sm transition-all relative overflow-hidden active:scale-[0.98] ${cardStyle} ${shadowStyle}`}
                                            >
                                                <div className="flex justify-between items-start mb-2 relative z-10">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                                        {StatusLabels[task.status]}
                                                    </span>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs text-slate-500 font-mono bg-slate-800/50 px-1.5 py-0.5 rounded">#{task.orderNumber}</span>
                                                        {task.district && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{task.district}</span>}
                                                    </div>
                                                </div>

                                                <div className="relative z-10">
                                                    <h4 className={`font-bold text-sm mb-2 line-clamp-2 ${task.checkStatus === 'missing' ? 'text-orange-100' : task.checkStatus === 'clean' ? 'text-emerald-100' : 'text-white'}`}>
                                                        {task.title}
                                                    </h4>

                                                    <div className="flex items-center gap-2 text-amber-300/90 text-xs mb-3 bg-amber-500/10 p-2 rounded-xl border border-amber-500/10">
                                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                                        <span className="truncate">{task.address || 'Adres Girilmemiş'}</span>
                                                    </div>

                                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => onTaskClick(task)}
                                                                className="flex items-center gap-2 text-slate-300 text-xs font-semibold hover:text-blue-400 transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl active:scale-95 border border-white/5"
                                                            >
                                                                <Calendar className="w-4 h-4" /> Detay
                                                            </button>
                                                            {task.createdAt && (
                                                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                                    {formatSafeDate(task.createdAt)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => handleShareTask(task, e)}
                                                                className="w-10 h-10 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20 transition-all active:scale-95"
                                                            >
                                                                <Share2 className="w-4 h-4" />
                                                            </button>

                                                            {task.phone && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.open(`tel:${task.phone}`);
                                                                    }}
                                                                    className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20 transition-all active:scale-95"
                                                                >
                                                                    <Phone className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {onTaskUpdate && task.status === TaskStatus.GAS_OPENED && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onTaskUpdate(task.id, { isWaiting: !task.isWaiting });
                                                                    }}
                                                                    className={`px-3 py-2 rounded-xl text-[10px] font-bold shadow-sm transition-all active:scale-95 border ${
                                                                        task.isWaiting 
                                                                            ? 'bg-blue-600 text-white border-blue-500' 
                                                                            : 'bg-white/5 text-slate-300 border-white/5'
                                                                    }`}
                                                                >
                                                                    {task.isWaiting ? 'BEKLİYOR' : 'BEKLET'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* --- COMBINED TASKS LIST (Mixed & Ordered) - Only for Staff, NOT Admin --- */}
                        {activeTab === 'tasks' && userPermissions?.role !== 'admin' && (
                            <div className="space-y-4">
                                {combinedTasks.length === 0 ? (
                                    <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center">
                                            <Search className="w-8 h-8 opacity-20" />
                                        </div>
                                        <span className="text-sm">
                                            {searchQuery ? 'Arama kriterlerine uygun iş bulunamadı.' : 'Görüntülenecek iş bulunamadı.'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Optional Header for Today? */}
                                        <div className="flex items-center gap-2 text-slate-400 pb-2 border-b border-white/5">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">İş Listesi</span>
                                            <span className="bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full">{combinedTasks.length}</span>
                                        </div>

                                        {combinedTasks.map((item, index) => {
                                            if (item.type === 'routine') {
                                                const task = item.data as RoutineTask;
                                                return (
                                                    <div key={task.id} className={`bg-slate-800/80 border ${task.isCompleted ? 'border-green-500/30' : 'border-purple-500/30'} rounded-xl p-4 relative overflow-hidden shadow-sm transition-all`}>
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.isCompleted ? 'bg-green-500' : 'bg-purple-500'}`}></div>

                                                        {/* Header: Alert Icon + Content + Check Button */}
                                                        <div className="flex justify-between items-start gap-3 mb-2">
                                                            <div className="flex items-start gap-2 flex-1">
                                                                <div className="bg-slate-700/50 text-slate-300 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                                                    {index + 1}
                                                                </div>
                                                                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5 animate-pulse" />
                                                                <h4 className={`font-medium text-sm ${task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>{task.content}</h4>
                                                            </div>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onToggleRoutineTask(task.id);
                                                                }}
                                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${task.isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}
                                                            >
                                                                {task.isCompleted ? <Check className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 opacity-50" />}
                                                            </button>
                                                        </div>

                                                        <div className="space-y-1.5 mb-2 pl-7">
                                                            <div className="flex items-center justify-between gap-2">
                                                                {task.customerName ? (
                                                                    <div className="flex items-center gap-2 text-sky-400 text-xs">
                                                                        <User className="w-3 h-3 text-sky-500/70" /> {task.customerName}
                                                                    </div>
                                                                ) : <div />}

                                                                {task.district && (
                                                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-900/30 px-1.5 py-0.5 rounded uppercase whitespace-nowrap">{task.district}</span>
                                                                )}
                                                            </div>
                                                            {task.address && (
                                                                <div className="flex items-center gap-2 text-amber-300/90 text-xs">
                                                                    <MapPin className="w-3 h-3 text-amber-500/70" />
                                                                    <span className="truncate">{task.address}</span>
                                                                </div>
                                                            )}
                                                            {task.phoneNumber && (
                                                                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                                                                    <Phone className="w-3 h-3 text-emerald-500/70" />
                                                                    <a href={`tel:${task.phoneNumber}`} className="hover:text-emerald-300 transition-colors">{task.phoneNumber}</a>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 border-t border-white/5 pt-2 ml-7">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(task.createdAt?.seconds * 1000).toLocaleDateString('tr-TR')}
                                                            </span>
                                                            <span className={task.isCompleted ? 'text-green-400 font-bold' : 'text-purple-400 font-medium'}>
                                                                {task.isCompleted ? 'Tamamlandı' : 'Tamamlanmadı'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                const task = item.data as Task;
                                                let cardStyle = "bg-slate-800 border-slate-700/50";
                                                let badgeStyle = "bg-blue-500/20 text-blue-400";
                                                let shadowStyle = "";

                                                if (task.isWaiting) {
                                                    cardStyle = "bg-blue-950/20 border-blue-500/40";
                                                    badgeStyle = "bg-blue-500/20 text-blue-400";
                                                    shadowStyle = "shadow-[0_0_15px_-5px_rgba(37,99,235,0.2)]";
                                                } else if (task.status === TaskStatus.GAS_OPENED && ((Date.now() - (task.updatedAt?.toMillis?.() || task.updatedAt || Date.now())) / (1000 * 60 * 60 * 24)) > 2) {
                                                    cardStyle = "bg-rose-950/30 border-rose-500/60";
                                                    badgeStyle = "bg-rose-500/20 text-rose-400";
                                                    shadowStyle = "shadow-[0_0_20px_-5px_rgba(225,29,72,0.4)]";
                                                } else if (task.checkStatus === 'missing') {
                                                    cardStyle = "bg-orange-950/30 border-orange-500/50";
                                                    badgeStyle = "bg-orange-500/20 text-orange-400";
                                                    shadowStyle = "shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]";
                                                } else if (task.status === TaskStatus.PROJECT_TO_BE_DRAWN || (task.status === TaskStatus.CHECK_COMPLETED && task.isProjectDrawn === false)) {
                                                    cardStyle = "bg-amber-950/20 border-amber-500/40";
                                                    badgeStyle = "bg-amber-500/20 text-amber-400";
                                                    shadowStyle = "shadow-[0_0_15px_-5px_rgba(245,158,11,0.2)]";
                                                } else if (task.checkStatus === 'clean') {
                                                    cardStyle = "bg-emerald-950/30 border-emerald-500/50";
                                                    badgeStyle = "bg-emerald-500/20 text-emerald-400";
                                                    shadowStyle = "shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]";
                                                }

                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={`rounded-2xl p-4 border transition-all relative overflow-hidden ${cardStyle} ${shadowStyle}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                                                {StatusLabels[task.status]}
                                                            </span>
                                                            <div className="flex flex-col items-end">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="bg-blue-500/20 text-blue-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                                        {index + 1}
                                                                    </div>
                                                                    <span className="text-xs text-slate-500 font-mono">#{task.orderNumber}</span>
                                                                </div>
                                                                {task.district && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{task.district}</span>}
                                                            </div>
                                                        </div>

                                                        <div className="relative z-10">
                                                            <h4 className={`font-bold text-sm mb-2 line-clamp-2 ${task.checkStatus === 'missing' ? 'text-orange-100' : task.checkStatus === 'clean' ? 'text-emerald-100' : 'text-white'}`}>
                                                                {task.title}
                                                            </h4>

                                                            <div className="flex items-center gap-2 text-amber-300/90 text-xs mb-3">
                                                                <MapPin className="w-3 h-3 shrink-0 text-amber-500/70" />
                                                                <span className="truncate">{task.address || 'Adres Girilmemiş'}</span>
                                                            </div>

                                                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => onTaskClick(task)}
                                                                        className="flex items-center gap-1.5 text-slate-400 text-xs font-medium hover:text-blue-400 transition-colors bg-white/5 px-3 py-1.5 rounded-lg active:scale-95"
                                                                    >
                                                                        <Calendar className="w-3.5 h-3.5" /> Detay
                                                                    </button>
                                                                    {task.createdAt && (
                                                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                                            {formatSafeDate(task.createdAt)}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    {task.isReassignedForCheck && onTaskUpdate && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onTaskUpdate(task.id, { isReassignedForCheck: false });
                                                                            }}
                                                                            className="w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 transition-colors shadow-[0_0_10px_-2px_rgba(16,185,129,0.2)]"
                                                                            title="Kontrolü Onayla"
                                                                        >
                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => handleShareTask(task, e)}
                                                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center border border-white/10 transition-colors"
                                                                    >
                                                                        <Share2 className="w-3.5 h-3.5" />
                                                                    </button>

                                                                    {task.phone && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.open(`tel:${task.phone}`);
                                                                            }}
                                                                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-white/10 transition-colors"
                                                                        >
                                                                            <Phone className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}

                                                                    {onTaskUpdate && task.status === TaskStatus.GAS_OPENED && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onTaskUpdate(task.id, { isWaiting: !task.isWaiting });
                                                                            }}
                                                                            className={`px-2 py-1 rounded-lg text-[9px] font-bold shadow-sm transition-all active:scale-95 border ${
                                                                                task.isWaiting 
                                                                                    ? 'bg-blue-600 text-white border-blue-500' 
                                                                                    : 'bg-white/5 text-slate-400 border-white/10'
                                                                            }`}
                                                                        >
                                                                            {task.isWaiting ? 'BEKLEMEDE' : 'BEKLET'}
                                                                        </button>
                                                                    )}

                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* VIEW: TASKS */}
                {activeTab === 'tasks' && (
                    <div className="flex flex-col h-full">

                        {/* Management Tools - Sticky Top */}
                        {(userPermissions?.role === 'admin' || userPermissions?.canAccessRoutineTasks || userPermissions?.canAccessAssignment) && (
                            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-xl px-4 py-3 border-b border-slate-800/50">
                                <div className="grid grid-cols-2 gap-3">
                                    {(userPermissions?.role === 'admin' || userPermissions?.canAccessRoutineTasks) && (
                                        <button
                                            onClick={onOpenRoutineModal}
                                            className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 hover:from-purple-500/20 hover:to-purple-600/10 border border-purple-500/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95"
                                        >
                                            <Bell className="w-5 h-5 text-purple-400" />
                                            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Eksikler Havuzu</span>
                                        </button>
                                    )}

                                    {(userPermissions?.role === 'admin' || userPermissions?.canAccessAssignment) && (
                                        <button
                                            onClick={onOpenAssignmentModal}
                                            className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10 border border-blue-500/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95"
                                        >
                                            <Users className="w-5 h-5 text-blue-400" />
                                            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Görev Dağıtımı</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">

                            {/* ADMIN VIEW: Staff Accordion */}
                            {userPermissions?.role === 'admin' && tasksByStaff ? (
                                <>
                                    <div className="flex items-center gap-2 text-slate-400 pb-2 border-b border-white/5">
                                        <Users className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Personel İş Programları</span>
                                        <span className="bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full">{staffList.length}</span>
                                    </div>

                                    {staffList.map(staff => {
                                        const staffData = tasksByStaff[staff.name];
                                        const totalItems = staffData?.length || 0;
                                        const isExpanded = expandedStaff === staff.name;

                                        return (
                                            <div key={staff.email} className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                                                {/* Accordion Header */}
                                                <button
                                                    onClick={() => setExpandedStaff(isExpanded ? null : staff.name)}
                                                    className="w-full flex items-center gap-3 p-4 text-left active:bg-white/5 transition-colors"
                                                >
                                                    {/* Avatar */}
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                        {staff.name.charAt(0).toUpperCase()}
                                                    </div>

                                                    {/* Name & Count */}
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-white text-sm">{staff.name}</h3>
                                                        <p className="text-xs text-slate-500">İş Programı</p>
                                                    </div>

                                                    {/* Badge & Chevron */}
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${totalItems > 0
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-slate-700/50 text-slate-500'
                                                            }`}>
                                                            {totalItems} iş
                                                        </span>
                                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                            <ChevronDown className="w-5 h-5 text-slate-500" />
                                                        </div>
                                                    </div>
                                                </button>

                                                {/* Accordion Content */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3 animate-fadeIn">
                                                        {totalItems === 0 ? (
                                                            <div className="text-center text-slate-500 py-4 text-sm">
                                                                Bu personele atanmış iş bulunmuyor.
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {staffData.map(item => {
                                                                    if (item.type === 'routine') {
                                                                        const task = item.data as RoutineTask;
                                                                        return (
                                                                            <div key={task.id} className={`bg-slate-800/80 border ${task.isCompleted ? 'border-green-500/30' : 'border-purple-500/30'} rounded-xl p-4 relative overflow-hidden shadow-sm transition-all`}>
                                                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.isCompleted ? 'bg-green-500' : 'bg-purple-500'}`}></div>

                                                                                {/* Header: Alert Icon + Content + Check Button */}
                                                                                <div className="flex justify-between items-start gap-3 mb-2">
                                                                                    <div className="flex items-start gap-2 flex-1">
                                                                                        <div className="bg-slate-700/50 text-slate-300 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                                                                            {staffData.indexOf(item) + 1}
                                                                                        </div>
                                                                                        <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5 animate-pulse" />
                                                                                        <h4 className={`font-medium text-sm ${task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>{task.content}</h4>
                                                                                    </div>

                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            onToggleRoutineTask(task.id);
                                                                                        }}
                                                                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${task.isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}
                                                                                    >
                                                                                        {task.isCompleted ? <Check className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 opacity-50" />}
                                                                                    </button>
                                                                                </div>

                                                                                <div className="space-y-1.5 mb-2 pl-7">
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        {task.customerName ? (
                                                                                            <div className="flex items-center gap-2 text-sky-400 text-xs">
                                                                                                <User className="w-3 h-3 text-sky-500/70" /> {task.customerName}
                                                                                            </div>
                                                                                        ) : <div />}

                                                                                        {task.district && (
                                                                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-900/30 px-1.5 py-0.5 rounded uppercase whitespace-nowrap">{task.district}</span>
                                                                                        )}
                                                                                    </div>
                                                                                    {task.address && (
                                                                                        <div className="flex items-center gap-2 text-amber-300/90 text-xs">
                                                                                            <MapPin className="w-3 h-3 text-amber-500/70" />
                                                                                            <span className="truncate">{task.address}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {task.phoneNumber && (
                                                                                        <div className="flex items-center gap-2 text-emerald-400 text-xs">
                                                                                            <Phone className="w-3 h-3 text-emerald-500/70" />
                                                                                            <a href={`tel:${task.phoneNumber}`} className="hover:text-emerald-300 transition-colors">{task.phoneNumber}</a>
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 border-t border-white/5 pt-2 ml-7">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Clock className="w-3 h-3" />
                                                                                        {new Date(task.createdAt?.seconds * 1000).toLocaleDateString('tr-TR')}
                                                                                    </span>
                                                                                    <span className={task.isCompleted ? 'text-green-400 font-bold' : 'text-purple-400 font-medium'}>
                                                                                        {task.isCompleted ? 'Tamamlandı' : 'Tamamlanmadı'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    } else {
                                                                        const task = item.data as Task;
                                                                        let cardStyle = "bg-slate-800 border-slate-700/50";
                                                                        let badgeStyle = "bg-blue-500/20 text-blue-400";
                                                                        let shadowStyle = "";

                                                                        if (task.isWaiting) {
                                                                            cardStyle = "bg-blue-950/20 border-blue-500/40";
                                                                            badgeStyle = "bg-blue-500/20 text-blue-400";
                                                                            shadowStyle = "shadow-[0_0_15px_-5px_rgba(37,99,235,0.2)]";
                                                                        } else if (task.status === TaskStatus.GAS_OPENED && ((Date.now() - (task.updatedAt?.toMillis?.() || task.updatedAt || Date.now())) / (1000 * 60 * 60 * 24)) > 2) {
                                                                            cardStyle = "bg-orange-950/20 border-orange-500/40";
                                                                            badgeStyle = "bg-orange-500/20 text-orange-400";
                                                                            shadowStyle = "shadow-[0_0_15px_-5px_rgba(249,115,22,0.2)]";
                                                                        } else if (task.checkStatus === 'missing') {
                                                                            cardStyle = "bg-orange-950/30 border-orange-500/50";
                                                                            badgeStyle = "bg-orange-500/20 text-orange-400";
                                                                            shadowStyle = "shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]";
                                                                        } else if (task.checkStatus === 'clean') {
                                                                            cardStyle = "bg-emerald-950/30 border-emerald-500/50";
                                                                            badgeStyle = "bg-emerald-500/20 text-emerald-400";
                                                                            shadowStyle = "shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]";
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={task.id}
                                                                                className={`rounded-2xl p-4 border transition-all relative overflow-hidden ${cardStyle} ${shadowStyle}`}
                                                                            >
                                                                                <div className="flex justify-between items-start mb-2 relative z-10">
                                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                                                                        {StatusLabels[task.status]}
                                                                                    </span>
                                                                                    <div className="flex flex-col items-end">
                                                                                        <div className="flex items-center gap-1">
                                                                                            <div className="bg-blue-500/20 text-blue-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                                                                {staffData.indexOf(item) + 1}
                                                                                            </div>
                                                                                            <span className="text-xs text-slate-500 font-mono">#{task.orderNumber}</span>
                                                                                        </div>
                                                                                        {task.district && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{task.district}</span>}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="relative z-10">
                                                                                    <h4 className={`font-bold text-sm mb-2 line-clamp-2 ${task.checkStatus === 'missing' ? 'text-orange-100' : task.checkStatus === 'clean' ? 'text-emerald-100' : 'text-white'}`}>
                                                                                        {task.title}
                                                                                    </h4>

                                                                                    <div className="flex items-center gap-2 text-amber-300/90 text-xs mb-3">
                                                                                        <MapPin className="w-3 h-3 shrink-0 text-amber-500/70" />
                                                                                        <span className="truncate">{task.address || 'Adres Girilmemiş'}</span>
                                                                                    </div>

                                                                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <button
                                                                                                onClick={() => onTaskClick(task)}
                                                                                                className="flex items-center gap-1.5 text-slate-400 text-xs font-medium hover:text-blue-400 transition-colors bg-white/5 px-3 py-1.5 rounded-lg active:scale-95"
                                                                                            >
                                                                                                <Calendar className="w-3.5 h-3.5" /> Detay
                                                                                            </button>
                                                                                            {task.createdAt && (
                                                                                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                                                                    {formatSafeDate(task.createdAt)}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>

                                                                                        <div className="flex items-center gap-3">
                                                                                            <button
                                                                                                onClick={(e) => handleShareTask(task, e)}
                                                                                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center border border-white/10 transition-colors"
                                                                                            >
                                                                                                <Share2 className="w-3.5 h-3.5" />
                                                                                            </button>

                                                                                            {task.phone && (
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        window.open(`tel:${task.phone}`);
                                                                                                    }}
                                                                                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-white/10 transition-colors"
                                                                                                >
                                                                                                    <Phone className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                })}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                /* STAFF VIEW: Empty - handled by combined tasks list above */
                                null
                            )}
                        </div>
                    </div>
                )}

                {/* VIEW: PROFILE - Premium Design */}
                {activeTab === 'profile' && (
                    <div className="px-4 py-4 space-y-6">
                        {/* Profile Card - Glassmorphism */}
                        <div className="relative overflow-hidden">
                            {/* Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-amber-600/10 to-transparent rounded-3xl" />

                            <div className="relative bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 flex flex-col items-center border border-white/10">
                                {/* Avatar with Gradient Ring */}
                                <div className="relative mb-4">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 rounded-full blur-sm opacity-75 animate-pulse" />
                                    <div className="relative w-24 h-24 bg-gradient-to-br from-[#e65100] to-[#f57c00] rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-2xl shadow-orange-950/50 border-2 border-white/20">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold text-white">{displayName}</h2>
                                <p className="text-slate-400 text-sm mt-1">{user?.email}</p>

                                {/* Role Badge - Premium */}
                                <div className={`mt-3 px-4 py-1.5 rounded-full border ${userPermissions?.role === 'admin'
                                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300'
                                    : 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-300'
                                    }`}>
                                    <span className="text-xs font-bold uppercase tracking-wider">{roleName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions - Premium Cards */}
                        <div className="space-y-3">
                            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-2">Hesap İşlemleri</h3>

                            {userPermissions?.role === 'admin' && (
                                <button
                                    onClick={onOpenAdmin}
                                    className="w-full bg-gradient-to-r from-purple-500/10 to-purple-600/5 hover:from-purple-500/20 hover:to-purple-600/10 p-4 rounded-2xl flex items-center gap-4 text-purple-300 transition-all border border-purple-500/20 group active:scale-[0.98]"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-sm flex-1 text-left">Yönetim Paneli</span>
                                    <ChevronRight className="w-5 h-5 text-purple-500/50 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}

                            <button
                                onClick={handlePasswordReset}
                                className="w-full bg-slate-800/60 hover:bg-slate-800 p-4 rounded-2xl flex items-center gap-4 text-white transition-all border border-slate-700/50 group active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-sm flex-1 text-left">Şifremi Değiştir</span>
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button
                                onClick={onSignOut}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 p-4 rounded-2xl flex items-center gap-4 text-red-400 transition-all border border-red-500/20 group active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-sm flex-1 text-left">Çıkış Yap</span>
                                <ChevronRight className="w-5 h-5 text-red-500/50 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Version Footer */}
                        <div className="text-center pt-4">
                            <p className="text-[10px] text-slate-600">Onay Mühendislik v0.0.45</p>
                        </div>
                    </div>
                )}

                {/* VIEW: STOCK */}
                {activeTab === 'stock' && (
                    <div className="h-full overflow-hidden flex flex-col">
                        <div className="px-5 pt-8 pb-4 bg-slate-900 shrink-0 space-y-4">
                            <h1 className="text-2xl font-bold text-white">Stok Takibi</h1>

                            {/* Stock Category Selector */}
                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                                {[
                                    { id: 'combis', label: 'Kombiler' },
                                    { id: 'radiators', label: 'Radyatörler' },
                                    { id: 'heatpumps', label: 'Isı Pompaları' },
                                    { id: 'thermosiphons', label: 'Termosifonlar' },
                                    { id: 'acs', label: 'Klimalar' },
                                    { id: 'electric_combis', label: 'Elektrikli Kombiler' },
                                    { id: 'instant_heaters', label: 'DDEİ (Ani Isıtıcılar)' },
                                    { id: 'others', label: 'Diğerleri' }
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setStockCategory(cat.id as any)}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all ${stockCategory === cat.id
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            <div className="absolute inset-0 bg-slate-900 overflow-hidden">
                                {stockCategory === 'combis' && <StockCombisView />}
                                {stockCategory === 'radiators' && <StockRadiatorsView />}
                                {stockCategory === 'heatpumps' && <StockGenericView collectionName="stock_heatpumps" title="Isı Pompası Stok" itemLabel="Isı Pompası" />}
                                {stockCategory === 'thermosiphons' && <StockGenericView collectionName="stock_thermosiphons" title="Termosifon Stok" itemLabel="Termosifon" />}
                                {stockCategory === 'acs' && <StockGenericView collectionName="stock_acs" title="Klima Stok" itemLabel="Klima" />}
                                {stockCategory === 'electric_combis' && <StockGenericView collectionName="stock_electric_combis" title="Elektrikli Kombi Stok" itemLabel="Elektrikli Kombi" />}
                                {stockCategory === 'instant_heaters' && <StockGenericView collectionName="stock_instant_heaters" title="DDEİ (Ani Isıtıcı) Stok" itemLabel="Ani Isıtıcı" />}
                                {stockCategory === 'others' && <StockGenericView collectionName="stock_others" title="Diğer Stoklar" itemLabel="Ürün" />}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'quotations' && (
                    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 min-h-0">
                        {editingQuotation || quotationSubView === 'prepare' ? (
                            <QuotationApp
                                currentUserEmail={user?.email || ''}
                                currentUserName={userPermissions?.name || user?.email || ''}
                                onClose={() => { setEditingQuotation(null); setQuotationSubView('hub'); }}
                                initialData={editingQuotation?.data}
                                quotationId={editingQuotation?.id}
                            />
                        ) : quotationSubView === 'list' ? (
                            <QuotationsListView
                                currentUserEmail={user?.email || ''}
                                isAdmin={userPermissions?.role === 'admin'}
                                onClose={() => setQuotationSubView('hub')}
                                onEdit={(q: Quotation) => setEditingQuotation({ data: q.data, id: q.id })}
                            />
                        ) : (
                            /* MOBILE HUB VIEW - Compact & Top Aligned */
                            <div className="flex-1 flex flex-col p-6 gap-4">
                                <div className="mb-2 border-b pb-3">
                                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Teklif Yönetimi</h2>
                                </div>

                                <button 
                                    onClick={() => setQuotationSubView('prepare')}
                                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 text-left active:scale-[0.98] transition-all"
                                >
                                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-slate-800">Yeni Teklif Hazırla</h3>
                                        <p className="text-slate-500 text-[10px]">Hızlıca yeni teklif oluştur</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </button>

                                <button 
                                    onClick={() => setQuotationSubView('list')}
                                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 text-left active:scale-[0.98] transition-all"
                                >
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                        <FolderOpen className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-slate-800">Hazırlanan Teklifler</h3>
                                        <p className="text-slate-500 text-[10px]">Arşivdeki tekliflere göz at</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* BOTTOM BAR: Classic 5-Tab Bar (None for DIA mode) */}
            {menuStyle === 'dia' ? null : (
                /* BOTTOM NAVIGATION BAR - Premium Design (Classic) */
                <div className="bg-gradient-to-t from-slate-900 via-slate-900 to-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 flex justify-around items-center h-[72px] pb-3 shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex flex-col items-center gap-1.5 w-20 py-2 rounded-2xl transition-all duration-300 ${activeTab === 'home'
                            ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 shadow-lg shadow-blue-500/10'
                            : 'hover:bg-white/5'}`}
                    >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === 'home' ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' : ''}`}>
                            <Home className={`w-5 h-5 transition-colors ${activeTab === 'home' ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <span className={`text-[10px] font-semibold transition-colors ${activeTab === 'home' ? 'text-blue-400' : 'text-slate-500'}`}>Ana Sayfa</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex flex-col items-center gap-1.5 w-20 py-2 rounded-2xl transition-all duration-300 ${activeTab === 'tasks'
                            ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 shadow-lg shadow-purple-500/10'
                            : 'hover:bg-white/5'}`}
                    >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === 'tasks' ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30' : ''}`}>
                            <List className={`w-5 h-5 transition-colors ${activeTab === 'tasks' ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <span className={`text-[10px] font-semibold transition-colors ${activeTab === 'tasks' ? 'text-purple-400' : 'text-slate-500'}`}>İşlerim</span>
                    </button>

                    {(userPermissions?.role === 'admin' || userPermissions?.role === 'manager' || userPermissions?.canAccessStock) && (
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`flex flex-col items-center gap-1.5 w-20 py-2 rounded-2xl transition-all duration-300 ${activeTab === 'stock'
                            ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 shadow-lg shadow-orange-500/10'
                            : 'hover:bg-white/5'}`}
                    >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === 'stock' ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30' : ''}`}>
                            <Package className={`w-5 h-5 transition-colors ${activeTab === 'stock' ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <span className={`text-[10px] font-semibold transition-colors ${activeTab === 'stock' ? 'text-orange-400' : 'text-slate-500'}`}>Stok</span>
                    </button>
                    )}

                    {(userPermissions?.role === 'admin' || userPermissions?.role === 'manager' || userPermissions?.canAccessQuotations || userPermissions?.isEngineer) && (
                    <button
                        onClick={() => setActiveTab('quotations')}
                        className={`flex flex-col items-center gap-1.5 w-16 py-2 rounded-2xl transition-all duration-300 ${activeTab === 'quotations'
                            ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 shadow-lg shadow-amber-500/10'
                            : 'hover:bg-white/5'}`}
                    >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === 'quotations' ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30' : ''}`}>
                            <FileText className={`w-5 h-5 transition-colors ${activeTab === 'quotations' ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <span className={`text-[10px] font-semibold transition-colors ${activeTab === 'quotations' ? 'text-amber-400' : 'text-slate-500'}`}>Teklifler</span>
                    </button>
                    )}

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex flex-col items-center gap-1.5 w-16 py-2 rounded-2xl transition-all duration-300 ${activeTab === 'profile'
                            ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-lg shadow-emerald-500/10'
                            : 'hover:bg-white/5'}`}
                    >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === 'profile' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30' : ''}`}>
                            <User className={`w-5 h-5 transition-colors ${activeTab === 'profile' ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <span className={`text-[10px] font-semibold transition-colors ${activeTab === 'profile' ? 'text-emerald-400' : 'text-slate-500'}`}>Profil</span>
                    </button>
                </div>
            )}

        </div>
    );
}
