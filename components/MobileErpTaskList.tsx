import React, { useState, useMemo, useRef } from 'react';
import { 
    ChevronLeft, Search, ArrowUpDown, Filter, SlidersHorizontal, 
    Plus, Phone, Share2, MapPin, Calendar, Star, X, Flame, 
    CheckCircle2, AlertTriangle, Clock, ChevronRight, Eye, Send, ChevronDown,
    Square, Check, FileText, Paintbrush, ExternalLink, Copy, CheckSquare, Map,
    Bookmark
} from 'lucide-react';
import { Task, TaskStatus, StatusLabels, UserPermission, RoutineTask } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { PublicPaintingMapView, PublicMapCustomer } from './PublicPaintingMapView';

interface MobileErpTaskListProps {
    title: string;
    tasks: Task[];
    routineTasks?: RoutineTask[];
    onToggleRoutineTask?: (taskId: string, currentStatus?: boolean) => void;
    onUpdateRoutineTask?: (taskId: string, updates: Partial<RoutineTask>) => void;
    user: FirebaseUser | null;
    userPermissions: UserPermission | null;
    onBackToMenu: () => void;
    onTaskClick: (task: Task) => void;
    onAddTask: () => void;
    onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
    onSwitchToClassic: () => void;
    currentFilterStatus?: TaskStatus | 'ALL';
    initialSearchQuery?: string;
    allTasksForPaintingSelector?: Task[];
    isPaintingMode?: boolean;
    isDesktopView?: boolean;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const formatSafeDate = (dateVal: any) => {
    if (!dateVal) return '';
    try {
        if (typeof dateVal === 'string') {
            const datePart = dateVal.split(' ')[0];
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

// --- Helpers for "Kontrolü Onayla" card style (matches FieldStaffStatusModal mobile card) ---
const getStatusBadgeForRecheck = (status: TaskStatus) => {
    switch (status) {
        case TaskStatus.PROJECT_TO_BE_DRAWN:
            return { label: 'Projesi Çizilecek', bg: 'bg-orange-50', text: 'text-[#e65100]', border: 'border-orange-200', stripe: 'bg-orange-500' };
        case TaskStatus.SERVICE_DIRECTED:
            return { label: 'Servis Yönlendirildi', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', stripe: 'bg-blue-500' };
        case TaskStatus.COMBI_REPLACEMENT_RENOVATION:
            return { label: 'Kombi Değişimi', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', stripe: 'bg-indigo-500' };
        case TaskStatus.TO_CHECK:
            return { label: 'Kontrol Yapılacak', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', stripe: 'bg-amber-500' };
        case TaskStatus.CHECK_COMPLETED:
            return { label: 'Kontrol Yapıldı', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', stripe: 'bg-teal-500' };
        case TaskStatus.GAS_OPENED:
            return { label: 'Gazı Açıldı', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', stripe: 'bg-rose-500' };
        case TaskStatus.DEPOSIT_PAID:
            return { label: StatusLabels[TaskStatus.DEPOSIT_PAID] || 'Depozito Yatırıldı', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', stripe: 'bg-purple-500' };
        default:
            return { label: StatusLabels[status] || status, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', stripe: 'bg-slate-400' };
    }
};

const getRecheckTaskDate = (t: any): Date => {
    try {
        const source = t.scheduledDate || t.createdAt;
        if (!source) return new Date();
        if (source.seconds) return new Date(source.seconds * 1000);
        if (source instanceof Date) return source;
        if (typeof source === 'string') { const d = new Date(source); if (!isNaN(d.getTime())) return d; }
        if (typeof source === 'number') return new Date(source);
        return new Date();
    } catch { return new Date(); }
};

const isRecheckToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

const isRecheckOverdue = (date: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return date < today;
};

const safeFormatRecheckDate = (date: Date) => {
    try {
        if (isNaN(date.getTime())) return 'Tarihsiz';
        return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'numeric' });
    } catch { return date.toDateString(); }
};

export const MobileErpTaskList: React.FC<MobileErpTaskListProps> = ({
    title,
    tasks,
    routineTasks,
    onToggleRoutineTask,
    onUpdateRoutineTask,
    user,
    userPermissions,
    onBackToMenu,
    onTaskClick,
    onAddTask,
    onTaskUpdate,
    onSwitchToClassic,
    currentFilterStatus,
    initialSearchQuery,
    allTasksForPaintingSelector,
    isPaintingMode,
    isDesktopView = false
}) => {
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');

    React.useEffect(() => {
        if (initialSearchQuery !== undefined) {
            setSearchQuery(initialSearchQuery);
        }
    }, [initialSearchQuery]);
    const [selectedDistrict, setSelectedDistrict] = useState<string>('');
    const [sortBy, setSortBy] = useState<'order_asc' | 'order_desc' | 'date_desc' | 'title_asc'>('order_asc');
    const [tabFilter, setTabFilter] = useState<'all' | 'main' | 'routine'>('all');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [statusModalTask, setStatusModalTask] = useState<Task | null>(null);
    const [selectedNewStatus, setSelectedNewStatus] = useState<TaskStatus>(TaskStatus.TO_CHECK);
    const [modalIsWaiting, setModalIsWaiting] = useState<boolean>(false);
    const [callSelectTask, setCallSelectTask] = useState<Task | null>(null);

    // Painting Route & List State
    const [selectedPaintingIds, setSelectedPaintingIds] = useState<string[]>([]);
    const [showPaintingSelectorModal, setShowPaintingSelectorModal] = useState<boolean>(false);
    const [paintingSearchQuery, setPaintingSearchQuery] = useState<string>('');
    const [selectorSelectedIds, setSelectorSelectedIds] = useState<string[]>([]);
    const [paintNoteModalTask, setPaintNoteModalTask] = useState<Task | null>(null);
    const [paintNoteInput, setPaintNoteInput] = useState<string>('');
    const [showPublicMapModal, setShowPublicMapModal] = useState<boolean>(false);


    // Permission checks for Painting Mode
    const isAdmin = userPermissions?.role === 'admin' || userPermissions?.role === 'manager';
    const canEditPainting = isAdmin || userPermissions?.canEditPaintingTasks === true;
    const canViewPainting = isAdmin || userPermissions?.canViewPaintingTasks === true || canEditPainting || userPermissions?.canAccessPaintingTasks === true;

    // Synchronize selected painting task IDs: Automatically select all tasks in painting mode including new additions
    React.useEffect(() => {
        if (isPaintingMode && tasks.length > 0) {
            setSelectedPaintingIds(prev => {
                const taskIds = tasks.map(t => t.id);
                if (prev.length === 0) return taskIds;
                const prevSet = new Set(prev);
                const newAdded = taskIds.filter(id => !prevSet.has(id));
                const stillValid = prev.filter(id => taskIds.includes(id));
                return [...stillValid, ...newAdded];
            });
        }
    }, [isPaintingMode, tasks]);

    // Kontrol Ekibi Sihirbazı (Camcı, Elektrikçi, Eksiklikler)
    const [checkWizardTask, setCheckWizardTask] = useState<Task | null>(null);
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
    const [wizardGlazier, setWizardGlazier] = useState<boolean | null>(null);
    const [wizardElectrician, setWizardElectrician] = useState<boolean | null>(null);
    const [wizardNote, setWizardNote] = useState<string>('');
    const [wizardCheckStatus, setWizardCheckStatus] = useState<'clean' | 'missing' | null>(null);

    // Gaz Açıldı Sigorta Kontrolü
    const [gasFuseTask, setGasFuseTask] = useState<Task | null>(null);
    const [gasFuseChoice, setGasFuseChoice] = useState<'yes' | 'no' | null>(null);

    const handleConfirmGasOpened = (hasFuse: boolean) => {
        if (onTaskUpdate && gasFuseTask) {
            const updates: Partial<Task> = {
                status: TaskStatus.GAS_OPENED,
                hasFuse: hasFuse,
                gasOpeningDate: gasFuseTask.gasOpeningDate || new Date().toISOString().split('T')[0],
                isWaiting: modalIsWaiting,
                isReassignedForCheck: false
            };
            if (!hasFuse) {
                updates.isElectricianDirected = true;
            }
            onTaskUpdate(gasFuseTask.id, updates);
        }
        setGasFuseTask(null);
        setGasFuseChoice(null);
    };

    const handleCallClick = (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.phone && task.tenantPhone) {
            setCallSelectTask(task);
        } else if (task.phone) {
            window.location.href = `tel:${task.phone}`;
        } else if (task.tenantPhone) {
            window.location.href = `tel:${task.tenantPhone}`;
        }
    };

    const isValidLatLng = (lat: number, lng: number) => {
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    };

    // Helper: Extract coordinates from task location string
    const extractCoords = (str?: string): { lat: number; lng: number; formatted: string } | null => {
        if (!str) return null;
        let s = str.trim();
        try {
            s = decodeURIComponent(s);
        } catch {}

        // 1. Check for @lat,lng in Google Maps URLs (e.g. /@37.2153,28.3636,17z)
        const atMatch = s.match(/@([+-]?\d{1,2}\.\d+)[,\s]+([+-]?\d{1,3}\.\d+)/);
        if (atMatch) {
            const lat = parseFloat(atMatch[1]);
            const lng = parseFloat(atMatch[2]);
            if (isValidLatLng(lat, lng)) return { lat, lng, formatted: `${lat},${lng}` };
        }

        // 2. Check for q=lat,lng or query=lat,lng or ll=lat,lng or daddr=lat,lng
        const qMatch = s.match(/(?:q|query|ll|daddr|saddr|destination)=([+-]?\d{1,2}\.\d+)[,\s;]+([+-]?\d{1,3}\.\d+)/);
        if (qMatch) {
            const lat = parseFloat(qMatch[1]);
            const lng = parseFloat(qMatch[2]);
            if (isValidLatLng(lat, lng)) return { lat, lng, formatted: `${lat},${lng}` };
        }

        // 3. Check for general lat,lng (decimal numbers separated by comma, space, semicolon)
        const genMatch = s.match(/([+-]?\d{1,2}\.\d+)[,\s;]+([+-]?\d{1,3}\.\d+)/);
        if (genMatch) {
            const lat = parseFloat(genMatch[1]);
            const lng = parseFloat(genMatch[2]);
            if (isValidLatLng(lat, lng)) return { lat, lng, formatted: `${lat},${lng}` };
        }

        return null;
    };

    // Helper: Get currently active tasks for painting route
    const getActivePaintingTasks = (): Task[] => {
        if (tasks.length === 0) return [];
        if (selectedPaintingIds.length === 0) return tasks;
        const filtered = tasks.filter(t => selectedPaintingIds.includes(t.id));
        return filtered.length > 0 ? filtered : tasks;
    };

    // Helper: Build WhatsApp customer list with direct Google Maps location pins (No forced bulk route)
    const buildPaintingRoute = (activeTasks: Task[]) => {
        let stopsText = '';
        let withCoordsCount = 0;

        activeTasks.forEach((task, idx) => {
            const stopNum = idx + 1;
            const coords = extractCoords(task.locationCoordinates);
            if (coords) {
                withCoordsCount++;
            }

            const mainPhone = task.tenantPhone || task.phone;
            stopsText += `\n📍 *${stopNum}. MÜŞTERİ: ${task.title || 'Müşteri'}* ${mainPhone ? `(📞 ${mainPhone})` : ''}\n`;
            if (task.tenantName || task.tenantPhone) {
                if (task.phone) stopsText += `👤 Ev Sahibi: ${task.title} - 📞 Tel: ${task.phone}\n`;
                if (task.tenantName) stopsText += `👤 Kiracı: ${task.tenantName}${task.tenantPhone ? ` - 📞 Tel: ${task.tenantPhone}` : ''}\n`;
            }
            stopsText += `🏠 Adres: ${task.address || 'Adres Girilmemiş'}${task.district ? ' / ' + task.district : ''}\n`;
            if (task.paintNote) {
                stopsText += `📝 Boyacı Notu: ${task.paintNote}\n`;
            }
            if (coords) {
                const labelParam = encodeURIComponent(`${task.title || 'Müşteri'} (${mainPhone || ''})`);
                stopsText += `🗺️ Konum Linki: https://www.google.com/maps?q=${coords.formatted}+(${labelParam})\n`;
            } else {
                stopsText += `⚠️ (GPS Konumu Kayıtlı Değil - Sadece Adres)\n`;
            }
            stopsText += `───────────────`;
        });

        const todayStr = new Date().toLocaleDateString('tr-TR');

        const fullMsg = `🎨 *BOYACI GÜNLÜK İŞ & KONUM LİSTESİ* 🎨\n📅 Tarih: ${todayStr}\n📍 Toplam ${activeTasks.length} Müşteri (${withCoordsCount} Harita Konumlu)\n───────────────${stopsText}\n\n💡 *Bilgi:* Hangi müşteriye gitmek istiyorsanız altındaki mavi "Konum Linki"ne dokunarak Google Haritalar navigasyonunu açabilirsiniz.`;

        return { fullMsg, withCoordsCount };
    };

    const handleSendToPainterWhatsApp = () => {
        const activeTasks = getActivePaintingTasks();
        if (activeTasks.length === 0) {
            alert('Lütfen boyacıya göndermek için listeden en az bir iş seçin.');
            return;
        }
        const { fullMsg } = buildPaintingRoute(activeTasks);
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMsg)}`;
        window.open(waUrl, '_blank');
    };

    const handleCopyRouteText = async () => {
        const activeTasks = getActivePaintingTasks();
        if (activeTasks.length === 0) {
            alert('Lütfen kopyalamak için en az bir iş seçin.');
            return;
        }
        const { fullMsg } = buildPaintingRoute(activeTasks);
        try {
            await navigator.clipboard.writeText(fullMsg);
            alert('Boyacı müşteri ve konum listesi panoya kopyalandı!');
        } catch {
            alert('Panoya kopyalanamadı.');
        }
    };

    // Candidate tasks for "+ Kişi Kartlarından Ekle" Modal
    const candidateTasks = useMemo(() => {
        const pool = (allTasksForPaintingSelector || []).filter(t => !t.isPaintingTask);
        if (!paintingSearchQuery.trim()) return pool;
        const q = paintingSearchQuery.trim().toLocaleLowerCase('tr-TR');
        return pool.filter(t =>
            (t.title && t.title.toLocaleLowerCase('tr-TR').includes(q)) ||
            (t.address && t.address.toLocaleLowerCase('tr-TR').includes(q)) ||
            (t.district && t.district.toLocaleLowerCase('tr-TR').includes(q)) ||
            (t.phone && t.phone.includes(q)) ||
            (t.orderNumber && String(t.orderNumber).includes(q))
        );
    }, [allTasksForPaintingSelector, paintingSearchQuery]);

    // Get all unique districts for filter
    const allDistricts = useMemo(() => {
        const set = new Set<string>();
        tasks.forEach(t => {
            if (t.district?.trim()) set.add(t.district.trim().toLocaleUpperCase('tr-TR'));
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
    }, [tasks]);

    // Share handler (matches TaskModal format exactly)
    const handleShare = async (task: Task, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const cleanAddress = (task.address || '').replace(/https?:\/\/[^\s]+/g, '').trim();

        let addressLine = cleanAddress;
        if (task.district) addressLine += ` / ${task.district}`;
        if (task.city) addressLine += ` / ${task.city}`;

        let shareText = `👤 ${task.title || 'Müşteri'}`;
        if (task.tenantName || task.tenantPhone) {
            shareText += `\n📞 Ev Sahibi Tel: ${task.phone || 'Yok'}`;
            if (task.tenantName) shareText += `\n👤 Kiracı: ${task.tenantName}`;
            if (task.tenantPhone) shareText += `\n📞 Kiracı Tel: ${task.tenantPhone}`;
        } else {
            shareText += `\n📞 ${task.phone || 'Telefon Yok'}`;
        }
        shareText += `\n🏠 ${addressLine || 'Adres Yok'}`;

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
                alert('Müşteri bilgileri panoya kopyalandı.');
            }
        } catch (err) {
            console.error('Share failed', err);
        }
    };

    // Filtered Routine Tasks (for My Tasks view)
    const filteredRoutineTasks = useMemo(() => {
        if (!routineTasks || routineTasks.length === 0) return [];
        if (tabFilter === 'main') return [];
        let list = routineTasks;
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
            list = list.filter(r =>
                (r.customerName && r.customerName.toLocaleLowerCase('tr-TR').includes(q)) ||
                (r.content && r.content.toLocaleLowerCase('tr-TR').includes(q)) ||
                (r.address && r.address.toLocaleLowerCase('tr-TR').includes(q)) ||
                (r.phoneNumber && r.phoneNumber.includes(q))
            );
        }
        return list;
    }, [routineTasks, tabFilter, searchQuery]);

    // Filter & Sort Logic for Main Tasks
    const filteredTasks = useMemo(() => {
        if (routineTasks && routineTasks.length > 0 && tabFilter === 'routine') return [];
        return tasks.filter(t => {
            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLocaleLowerCase('tr');
                const cleanPhone = searchQuery.trim().replace(/\D/g, '');
                const tPhone = (t.phone || '').replace(/\D/g, '');

                const titleMatch = (t.title || '').toLocaleLowerCase('tr').includes(q);
                const custMatch = ((t as any).customerName || '').toLocaleLowerCase('tr').includes(q);
                const addrMatch = (t.address || '').toLocaleLowerCase('tr').includes(q);
                const phoneMatch = (t.phone || '').includes(q) || (cleanPhone.length >= 3 && tPhone.includes(cleanPhone));
                const descMatch = (t.description || '').toLocaleLowerCase('tr').includes(q);
                const jobDescMatch = (t.jobDescription || '').toLocaleLowerCase('tr').includes(q);
                const noteMatch = (t.generalNote || '').toLocaleLowerCase('tr').includes(q) || (t.teamNote || '').toLocaleLowerCase('tr').includes(q);
                const orderMatch = String(t.orderNumber || '').includes(q);
                const districtMatch = (t.district || '').toLocaleLowerCase('tr').includes(q);
                if (!titleMatch && !custMatch && !addrMatch && !phoneMatch && !descMatch && !jobDescMatch && !noteMatch && !orderMatch && !districtMatch) {
                    return false;
                }
            }

            // District filter
            if (selectedDistrict && t.district?.trim().toLocaleUpperCase('tr-TR') !== selectedDistrict) {
                return false;
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === 'order_asc') return (a.orderNumber || 0) - (b.orderNumber || 0);
            if (sortBy === 'order_desc') return (b.orderNumber || 0) - (a.orderNumber || 0);
            if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '', 'tr-TR');
            if (sortBy === 'date_desc') {
                const getTime = (task: Task) => {
                    if (task.scheduledDate?.seconds) return task.scheduledDate.seconds * 1000;
                    if (task.date) { const d = new Date(task.date); if (!isNaN(d.getTime())) return d.getTime(); }
                    return task.createdAt?.seconds ? task.createdAt.seconds * 1000 : 0;
                };
                return getTime(b) - getTime(a);
            }
            return 0;
        });
    }, [tasks, searchQuery, selectedDistrict, sortBy, routineTasks, tabFilter]);

    const canAddTasks = userPermissions?.canAddCustomers || userPermissions?.role === 'admin';
    const displayName = userPermissions?.name || user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';

    type UnifiedTaskItem = { type: 'main'; data: Task } | { type: 'routine'; data: RoutineTask };

    // Unified Tasks and Routine Tasks Sorted by Assignment Order (dailyOrder & scheduled hour)
    const unifiedTaskList = useMemo<UnifiedTaskItem[]>(() => {
        let list: UnifiedTaskItem[] = [];

        if (!routineTasks || routineTasks.length === 0) {
            return filteredTasks.map(t => ({ type: 'main' as const, data: t }));
        }

        if (tabFilter === 'all' || tabFilter === 'main') {
            filteredTasks.forEach(t => list.push({ type: 'main', data: t }));
        }
        if (tabFilter === 'all' || tabFilter === 'routine') {
            filteredRoutineTasks.forEach(rt => list.push({ type: 'routine', data: rt }));
        }

        const getTime = (item: UnifiedTaskItem) => {
            if (item.type === 'main') {
                const t = item.data;
                if (t.scheduledDate?.seconds) return t.scheduledDate.seconds * 1000;
                if (t.scheduledDate) { const d = new Date(t.scheduledDate); if (!isNaN(d.getTime())) return d.getTime(); }
                if (t.date) { const d = new Date(t.date); if (!isNaN(d.getTime())) return d.getTime(); }
                return t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
            } else {
                const rt = item.data;
                if (rt.scheduledDate?.seconds) return rt.scheduledDate.seconds * 1000;
                if (rt.scheduledDate) { const d = new Date(rt.scheduledDate); if (!isNaN(d.getTime())) return d.getTime(); }
                return rt.createdAt?.seconds ? rt.createdAt.seconds * 1000 : 0;
            }
        };

        return list.sort((a, b) => {
            if (sortBy === 'order_asc') {
                // 1. Explicit dailyOrder set in Görev Dağıtımı
                const orderA = a.data.dailyOrder || 0;
                const orderB = b.data.dailyOrder || 0;
                if (orderA !== 0 && orderB !== 0) {
                    if (orderA !== orderB) return orderA - orderB;
                } else if (orderA !== 0) {
                    return -1;
                } else if (orderB !== 0) {
                    return 1;
                }

                // 2. Scheduled Time / Hour from AssignmentView
                const timeA = getTime(a);
                const timeB = getTime(b);
                if (timeA !== timeB && timeA > 0 && timeB > 0) {
                    return timeA - timeB;
                }

                // 3. Priority
                if (a.data.isPriority !== b.data.isPriority) {
                    return a.data.isPriority ? -1 : 1;
                }

                // 4. Fallback orderNumber
                const numA = (a.data as any).orderNumber || 0;
                const numB = (b.data as any).orderNumber || 0;
                if (numA !== numB && numA > 0 && numB > 0) {
                    return numA - numB;
                }

                return 0;
            }

            if (sortBy === 'order_desc') {
                const numA = (a.data as any).orderNumber || 0;
                const numB = (b.data as any).orderNumber || 0;
                return numB - numA;
            }

            if (sortBy === 'title_asc') {
                const titleA = a.type === 'main' ? (a.data.title || '') : (a.data.customerName || '');
                const titleB = b.type === 'main' ? (b.data.title || '') : (b.data.customerName || '');
                return titleA.localeCompare(titleB, 'tr-TR');
            }

            if (sortBy === 'date_desc') {
                return getTime(b) - getTime(a);
            }

            return 0;
        });
    }, [filteredTasks, filteredRoutineTasks, routineTasks, tabFilter, sortBy]);

    const renderMainTask = (task: Task) => {
                        const statusLabel = StatusLabels[task.status] || task.status;
                        const dateText = formatSafeDate(task.scheduledDate || task.date || task.createdAt);
                        const isClean = task.checkStatus === 'clean';
                        const isMissing = task.checkStatus === 'missing';

                        // Status Color Badges
                        let statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                        if (isMissing) {
                            statusColor = "text-rose-700 bg-rose-50 border-rose-200";
                        } else if (task.isWaiting) {
                            statusColor = "text-blue-700 bg-blue-50 border-blue-200";
                        } else if (task.status === TaskStatus.PROJECT_TO_BE_DRAWN) {
                            statusColor = "text-amber-800 bg-amber-50 border-amber-200";
                        } else if (task.status === TaskStatus.TO_CHECK) {
                            statusColor = "text-purple-700 bg-purple-50 border-purple-200";
                        }

                        // --- Kontrolü Onayla olan işler → Sadece bir personele atanmış, gazı açılmamış ve önceden kontrol edilmişse ---
                        const isTaskRecheck = Boolean(
                            task.isReassignedForCheck &&
                            task.assignee && task.assignee.trim() !== '' &&
                            task.status !== TaskStatus.GAS_OPENED &&
                            (task.checkStatus === "clean" || task.checkStatus === "missing")
                        );
                        if (isTaskRecheck) {
                            const badge = getStatusBadgeForRecheck(task.status);
                            const taskDate = getRecheckTaskDate(task);
                            const taskIsToday = isRecheckToday(taskDate);
                            const taskIsOverdue = isRecheckOverdue(taskDate);
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => onTaskClick(task)}
                                    className="px-3.5 py-2.5 bg-white border-l-4 border-emerald-400 hover:bg-emerald-50/20 active:bg-emerald-50/40 transition-colors flex items-start gap-3 cursor-pointer relative"
                                >
                                    {/* Left Status Stripe (color dot) */}
                                    <div className={`w-1 h-1 rounded-full ${badge.stripe} absolute left-1.5 top-1/2 -translate-y-1/2 hidden`} />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Row 1: badges + date */}
                                        <div className="flex items-center justify-between gap-1.5 mb-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                                    #{task.orderNumber}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                            <div className="shrink-0">
                                                {taskIsToday ? (
                                                    <span className="text-[10px] font-black text-[#e65100] bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">Bugün</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">{safeFormatRecheckDate(taskDate)}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2: Title */}
                                        <p className="font-extrabold text-[13px] text-slate-800 uppercase tracking-tight truncate leading-snug">
                                            {task.title}
                                        </p>

                                        {/* Row 3: Address */}
                                        <p className="text-[11px] font-medium text-slate-500 line-clamp-1 leading-snug">
                                            {task.district && <span className="text-slate-600 font-bold">{task.district} · </span>}
                                            {task.address}
                                        </p>

                                        {/* Row 4: Phone + Kontrolü Onayla */}
                                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100 gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            {(task.phone || task.tenantPhone) ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCallClick(task, e)}
                                                    className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10.5px] font-bold active:scale-95 transition-all shadow-2xs"
                                                    title="Arama Yap"
                                                >
                                                    <Phone className="w-3 h-3" />
                                                    <span>{task.phone || task.tenantPhone}</span>
                                                </button>
                                            ) : (
                                                <span />
                                            )}
                                            {onTaskUpdate && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTaskUpdate(task.id, { isReassignedForCheck: false });
                                                    }}
                                                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Kontrolü Onayla</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // --- Normal işler → Eski kart stili ---
                        const activePaintingTasks = isPaintingMode ? getActivePaintingTasks() : [];
                        const stopIdx = isPaintingMode ? activePaintingTasks.findIndex(t => t.id === task.id) : -1;

                        return (
                            <div
                                key={task.id}
                                onClick={() => {
                                    if (isPaintingMode && !canEditPainting) return;
                                    onTaskClick(task);
                                }}
                                className={`px-3.5 py-3 transition-colors flex items-start gap-3 group relative ${
                                    isPaintingMode && !canEditPainting
                                        ? 'cursor-default'
                                        : isDesktopView ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100' : 'cursor-pointer hover:bg-orange-50/30 active:bg-orange-50/60'
                                }`}
                            >
                                {/* Painting Checkbox in Painting Mode */}
                                {isPaintingMode && canEditPainting && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPaintingIds(prev =>
                                                prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]
                                            );
                                        }}
                                        className="pt-2 text-slate-400 hover:text-orange-600 transition-colors shrink-0"
                                    >
                                        {stopIdx !== -1 ? (
                                            <CheckSquare className={`w-5 h-5 ${isDesktopView ? "text-blue-600" : "text-orange-600"}`} />
                                        ) : (
                                            <Square className="w-5 h-5 text-slate-300" />
                                        )}
                                    </button>
                                )}

                                {/* Left: Circle Thumbnail / Order Number */}
                                <div className={`w-11 h-11 rounded-xl ${isDesktopView ? "bg-slate-100 border border-slate-200 text-slate-700" : "bg-gradient-to-br from-orange-50 to-orange-100/60 border border-orange-200 text-orange-700"} flex flex-col items-center justify-center shrink-0 shadow-xs relative`}>
                                    <span className="text-[10px] font-bold text-slate-500 leading-none">NO</span>
                                    <span className="text-xs font-black leading-none mt-0.5">#{task.orderNumber || 0}</span>
                                    
                                    {/* Clickable Star on top-right of number */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isPaintingMode && !canEditPainting) return;
                                            onTaskUpdate && onTaskUpdate(task.id, { isPriority: !task.isPriority });
                                        }}
                                        disabled={isPaintingMode && !canEditPainting}
                                        className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center transition-all ${
                                            isPaintingMode && !canEditPainting ? 'cursor-default pointer-events-none' : 'active:scale-125'
                                        } z-10`}
                                        title={task.isPriority ? "Önceliği Kaldır" : "Öncelikli İş Yap"}
                                    >
                                        <Star className={`w-3 h-3 ${task.isPriority ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'}`} />
                                    </button>
                                </div>

                                {/* Content Details */}
                                <div className="flex-1 min-w-0">
                                    
                                    {/* Line 1: Customer Name (Orange), District, Status Badge */}
                                    <div className="flex items-center justify-between gap-1.5 mb-1">
                                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                            {/* Stop Badge in Painting Mode */}
                                            {isPaintingMode && stopIdx !== -1 && (
                                                <span className={`${isDesktopView ? "bg-blue-600" : "bg-amber-600"} text-white font-black px-1.5 py-0.5 rounded text-[10px] tracking-tight shrink-0 shadow-2xs`}>
                                                    #{stopIdx + 1}
                                                </span>
                                            )}

                                            {/* Customer Name in Bold Orange (Screenshot Style) */}
                                            <span className={`font-extrabold text-[13px] ${isDesktopView ? "text-slate-800" : "text-[#e65100]"} uppercase tracking-tight truncate`}>
                                                {task.title}
                                            </span>

                                            {/* District / Order Code in Slate */}
                                            {task.district && (
                                                <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">
                                                    · {task.district}
                                                </span>
                                            )}

                                            {/* Boyandı Rozeti (Boya modunda ve tamamlandıysa) */}
                                            {isPaintingMode && task.paintStatus === 'completed' && (
                                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                                                    ✓ BOYANDI
                                                </span>
                                            )}
                                        </div>

                                        {/* Status Tag on Top Right: Shows EKSİK VAR / TEMİZ if available */}
                                        {(isMissing || isClean) ? (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 tracking-tight leading-tight ${statusColor}`}>
                                                {isMissing ? 'EKSİK VAR' : 'TEMİZ'}
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Line 2: Job description / Address */}
                                    <p className={`text-[11.5px] font-medium text-slate-700 leading-snug ${isPaintingMode ? 'break-words' : 'line-clamp-1'}`}>
                                        {task.address || task.description || 'Adres bilgisi girilmemiş'}
                                    </p>

                                    {/* Line 2.5: Painting Note in Painting Mode */}
                                    {isPaintingMode && (
                                        <div className="mt-1 text-[11px] text-amber-950 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 flex items-start justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            <span className="truncate">
                                                <strong className="font-bold text-amber-800">Boyacı Notu:</strong> {task.paintNote || 'Özel not yok'}
                                            </span>
                                            {canEditPainting && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPaintNoteModalTask(task);
                                                        setPaintNoteInput(task.paintNote || '');
                                                    }}
                                                    className="text-amber-700 hover:text-amber-900 underline font-bold shrink-0 text-[10px]"
                                                >
                                                    {task.paintNote ? 'Düzenle' : '+ Not Ekle'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Line 3: Date, Interactive Status Button (where red marker was drawn), and Actions */}
                                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100 gap-1.5">
                                        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-mono shrink-0">
                                            {dateText && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    {dateText}
                                                </span>
                                            )}
                                            {task.isWaiting && (
                                                <span className="bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[9.5px]">
                                                    BEKLİYOR
                                                </span>
                                            )}
                                        </div>

                                        {/* Middle (Red marker spot): Clickable Status Button to change status + Beklet */}
                                        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 px-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isPaintingMode && !canEditPainting) return;
                                                    setStatusModalTask(task);
                                                    setSelectedNewStatus(task.status);
                                                    setModalIsWaiting(task.isWaiting || false);
                                                }}
                                                disabled={isPaintingMode && !canEditPainting}
                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 max-w-full truncate transition-all shadow-2xs ${
                                                    isPaintingMode && !canEditPainting ? 'cursor-default pointer-events-none' : 'active:scale-95 hover:brightness-95'
                                                } ${statusColor}`}
                                                title={isPaintingMode && !canEditPainting ? undefined : "Aşamayı Değiştir / Gönder"}
                                            >
                                                <span className="truncate">{statusLabel}</span>
                                                {(!isPaintingMode || canEditPainting) && (
                                                    <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
                                                )}
                                            </button>

                                            {/* Beklet / Beklemede Butonu (Gaz Açıldı aşamasındaysa) */}
                                            {(!isPaintingMode || canEditPainting) && onTaskUpdate && task.status === TaskStatus.GAS_OPENED && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTaskUpdate(task.id, { isWaiting: !task.isWaiting });
                                                    }}
                                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-all active:scale-95 shrink-0 flex items-center gap-1 shadow-2xs ${
                                                        task.isWaiting
                                                            ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                                                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                                    }`}
                                                    title={task.isWaiting ? "Beklemeden Çıkar" : "Beklemeye Al"}
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    <span>{task.isWaiting ? 'BEKLEMEDE' : 'BEKLET'}</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Action Icons */}
                                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>

                                            {/* WhatsApp / Share Button (Boya modunda sadece düzenleme yetkisi olan görür) */}
                                            {(!isPaintingMode || canEditPainting) && (
                                                <button
                                                    onClick={(e) => handleShare(task, e)}
                                                    className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 active:scale-95 transition-all"
                                                    title="Paylaş"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            {/* Boya Listesinden Çıkar Butonu (Sadece Boya İşleri Modunda ve Düzenleme Yetkisi Varsa Görünür) */}
                                            {isPaintingMode && canEditPainting && onTaskUpdate && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTaskUpdate(task.id, { isPaintingTask: false });
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all"
                                                    title="Boya Listesinden Kaldır"
                                                >
                                                    <X className="w-3.5 h-3.5 text-rose-500" />
                                                </button>
                                            )}

                                            {/* Phone Call Button */}
                                            {(task.phone || task.tenantPhone) && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCallClick(task, e)}
                                                    className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10.5px] font-bold active:scale-95 transition-all shadow-2xs"
                                                    title="Arama Yap"
                                                >
                                                    <Phone className="w-3 h-3" />
                                                    <span>Ara</span>
                                                </button>
                                            )}

                                            {/* Detail Arrow */}
                                            {(!isPaintingMode || canEditPainting) && (
                                                <button
                                                    onClick={() => onTaskClick(task)}
                                                    className="p-1 text-slate-400 hover:text-slate-600"
                                                    title="İş Detayı"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
    };

    const renderRoutineTask = (rt: RoutineTask) => {
                        const rtDate = formatSafeDate(rt.scheduledDate || rt.createdAt);
                        return (
                            <div
                                key={rt.id}
                                className="p-3.5 bg-amber-50/40 hover:bg-amber-50/70 transition-colors border-l-4 border-l-amber-500"
                            >
                                <div className="flex items-start gap-3">
                                    {onToggleRoutineTask && (
                                        <button
                                            onClick={() => onToggleRoutineTask(rt.id, rt.isCompleted)}
                                            className="mt-0.5 w-6 h-6 rounded-lg border-2 border-amber-500 bg-white flex items-center justify-center text-amber-600 active:scale-90 transition-all shrink-0 hover:bg-amber-100"
                                            title="Tamamla"
                                        >
                                            <CheckCircle2 className={`w-4 h-4 ${rt.isCompleted ? 'opacity-100 text-emerald-600' : 'opacity-25'}`} />
                                        </button>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                                    EKSİK / RUTİN
                                                </span>
                                                <span className="font-bold text-slate-800 text-xs truncate">
                                                    {rt.customerName || 'Müşteri Belirtilmemiş'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {/* Clickable Star for Routine Tasks */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUpdateRoutineTask && onUpdateRoutineTask(rt.id, { isPriority: !rt.isPriority });
                                                    }}
                                                    className="w-6 h-6 rounded-full bg-white border border-amber-200 shadow-2xs flex items-center justify-center transition-all active:scale-125"
                                                    title={rt.isPriority ? "Önceliği Kaldır" : "Öncelikli Yap"}
                                                >
                                                    <Star className={`w-3.5 h-3.5 ${rt.isPriority ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'}`} />
                                                </button>
                                                {rtDate && (
                                                    <span className="text-[10px] font-semibold text-slate-400">
                                                        {rtDate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                                            {rt.content}
                                        </p>
                                        {(rt.address || rt.phoneNumber) && (
                                            <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-amber-200/60 text-xs">
                                                {rt.address ? (
                                                    <span className="text-slate-500 truncate text-[11px]">
                                                        {rt.address}
                                                    </span>
                                                ) : <span />}
                                                {rt.phoneNumber && (
                                                    <a
                                                        href={`tel:${rt.phoneNumber}`}
                                                        className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10.5px] font-bold shrink-0"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        <span>Ara</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
    };

    return (
        <div className="flex flex-col h-full bg-[#f3f4f6] font-sans overflow-hidden select-none">

            {/* --- TOP HEADER (MATCHING SCREENSHOT) --- */}
            <div className={`${isDesktopView ? 'bg-slate-900 border-b border-slate-800' : 'bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00]'} text-white pt-3 pb-3.5 px-4 shadow-md shrink-0 flex items-center justify-between z-20`}>
                {/* Left: Circular Back Button */}
                <button
                    onClick={onBackToMenu}
                    className={`w-9 h-9 rounded-full ${isDesktopView ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white/20 hover:bg-white/30'} active:scale-95 flex items-center justify-center text-white transition-all shadow-xs`}
                    title="Panele Dön"
                >
                    <ChevronLeft className="w-6 h-6 stroke-[2.5] -ml-0.5" />
                </button>

                {/* Center: Title */}
                <div className="flex flex-col items-center flex-1 px-2">
                    <h1 className="font-bold text-[16px] text-white tracking-tight truncate max-w-[220px] text-center drop-shadow-xs">
                        {title}
                    </h1>
                    <span className={`text-[11px] ${isDesktopView ? 'text-slate-400' : 'text-orange-100'} font-medium`}>
                        {filteredTasks.length + filteredRoutineTasks.length} Kayıt Listeleniyor
                    </span>
                </div>

                {/* Right: Switch to classic or menu */}
                <button
                    onClick={onSwitchToClassic}
                    className={`px-2.5 py-1 ${isDesktopView ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white/20 hover:bg-white/30 text-white border-white/30'} rounded-lg text-[10px] font-bold border active:scale-95 transition-all`}
                    title="Kapat"
                >
                    Kapat
                </button>
            </div>

            {/* --- SEARCH & ACTIONS ROW (WHITE BACKGROUND) --- */}
            <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center gap-2 shrink-0 z-10 shadow-xs">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Arama yap..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full bg-[#f8fafc] border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${isDesktopView ? "focus:ring-blue-500/30 focus:border-blue-400" : "focus:ring-orange-500/30 focus:border-orange-400"} transition-all`}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Sort Button */}
                <button
                    onClick={() => setIsSortMenuOpen(prev => !prev)}
                    className={`p-2 rounded-lg border transition-all ${
                        sortBy !== 'order_asc' 
                            ? (isDesktopView ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-xs' : 'bg-orange-50 text-orange-600 border-orange-200 shadow-xs') 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Sıralama"
                >
                    <ArrowUpDown className="w-4 h-4" />
                </button>

                {/* Filter Funnel Button (District Filter) */}
                <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`p-2 rounded-lg border transition-all relative ${
                        selectedDistrict 
                            ? (isDesktopView ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-xs' : 'bg-orange-50 text-orange-600 border-orange-200 shadow-xs') 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="İlçe Filtresi"
                >
                    <Filter className="w-4 h-4" />
                    {selectedDistrict && (
                        <span className={`w-2 h-2 rounded-full ${isDesktopView ? "bg-blue-600" : "bg-orange-600"} absolute top-1 right-1`} />
                    )}
                </button>
            </div>

            {/* --- SUB-TOOLBAR ROW (DARK SLATE #1e293b - CLEAN DESIGN, NO ÖNCELİKLİ/BEKLEYEN/BARKOD) --- */}
            <div className="bg-[#1e293b] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-xs">
                {routineTasks && routineTasks.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        <button
                            onClick={() => setTabFilter('all')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                tabFilter === 'all'
                                    ? (isDesktopView ? 'bg-blue-600 text-white shadow-xs' : 'bg-orange-500 text-white shadow-xs')
                                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                        >
                            Tümü ({tasks.length + routineTasks.length})
                        </button>
                        <button
                            onClick={() => setTabFilter('main')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                tabFilter === 'main'
                                    ? (isDesktopView ? 'bg-blue-600 text-white shadow-xs' : 'bg-orange-500 text-white shadow-xs')
                                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                        >
                            İşler ({tasks.length})
                        </button>
                        <button
                            onClick={() => setTabFilter('routine')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                tabFilter === 'routine'
                                    ? (isDesktopView ? 'bg-blue-600 text-white shadow-xs' : 'bg-orange-500 text-white shadow-xs')
                                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                        >
                            Eksikler ({routineTasks.length})
                        </button>
                    </div>
                ) : (
                    <span className="text-[11px] font-semibold text-slate-300">
                        Toplam <strong className={`${isDesktopView ? "text-blue-400" : "text-orange-400"} font-bold`}>{filteredTasks.length}</strong> İş Kaydı
                    </span>
                )}

                <div className="flex items-center gap-2">
                    {selectedDistrict && (
                        <div className={`flex items-center gap-1 px-2 py-0.5 ${isDesktopView ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-orange-500/20 text-orange-300 border border-orange-500/30"} rounded text-[10px] font-bold`}>
                            <span>{selectedDistrict}</span>
                            <button onClick={() => setSelectedDistrict('')}><X className="w-3 h-3" /></button>
                        </div>
                    )}
                    {routineTasks && routineTasks.length > 0 && (
                        <span className="text-[11px] font-semibold text-slate-300">
                            {filteredTasks.length + filteredRoutineTasks.length} Kayıt
                        </span>
                    )}
                </div>
            </div>

            {/* --- SORT MENU DROPDOWN (IF OPEN) --- */}
            {isSortMenuOpen && (
                <div className="bg-white border-b border-slate-200 px-4 py-2 shadow-md flex items-center justify-between text-xs z-20 animate-in fade-in duration-150">
                    <span className="font-bold text-slate-600 text-[11px]">Sıralama:</span>
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                        {[
                            { id: 'order_asc', label: (routineTasks && routineTasks.length > 0) ? 'Görev Dağıtım Sırası' : 'Sıra No (Artan)' },
                            { id: 'order_desc', label: 'Sıra No (Azalan)' },
                            { id: 'date_desc', label: 'En Yeni' },
                            { id: 'title_asc', label: 'İsim (A-Z)' }
                        ].map(s => (
                            <button
                                key={s.id}
                                onClick={() => { setSortBy(s.id as any); setIsSortMenuOpen(false); }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                    sortBy === s.id 
                                        ? 'bg-orange-500 text-white font-bold shadow-xs' 
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PAINTING MODE ACTION BANNER --- */}
            {isPaintingMode && (
                <div className="bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700 text-white p-3 shadow-md space-y-2.5 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Paintbrush className={`w-5 h-5 ${isDesktopView ? "text-blue-400" : "text-amber-200"}`} />
                            <h3 className="font-black text-xs uppercase tracking-wider text-amber-100">Boyacı Rota & Harita Listesi</h3>
                        </div>
                        {canEditPainting ? (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedPaintingIds.length === tasks.length) {
                                            setSelectedPaintingIds([]);
                                        } else {
                                            setSelectedPaintingIds(tasks.map(t => t.id));
                                        }
                                    }}
                                    className="text-[11px] font-bold bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md transition-colors"
                                >
                                    {selectedPaintingIds.length === tasks.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                </button>
                                <span className="text-[11px] font-bold bg-black/30 px-2 py-0.5 rounded-md">
                                    {getActivePaintingTasks().length} / {tasks.length} Seçili
                                </span>
                            </div>
                        ) : (
                            <span className="text-[11px] font-bold bg-black/30 px-2 py-0.5 rounded-md">
                                Toplam {tasks.length} Müşteri
                            </span>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className={canEditPainting ? "grid grid-cols-2 gap-2" : "w-full"}>
                        <button
                            type="button"
                            onClick={() => setShowPublicMapModal(true)}
                            className={`bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all border border-amber-300/40 ${canEditPainting ? '' : 'w-full py-3 text-sm'}`}
                        >
                            <Map className="w-4 h-4 text-amber-100 shrink-0" />
                            <span>Harita & Müşteri Listesini Aç</span>
                        </button>
                        {canEditPainting && (
                            <button
                                type="button"
                                onClick={handleSendToPainterWhatsApp}
                                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Send className="w-4 h-4 shrink-0" />
                                <span>WhatsApp İle Gönder</span>
                            </button>
                        )}
                    </div>

                    {/* Editor Toolbar (Only for canEditPainting) */}
                    {canEditPainting && (
                        <div className="flex items-center justify-between pt-1 border-t border-white/15 text-[11px] text-amber-100 flex-wrap gap-y-1.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setPaintingSearchQuery('');
                                    setSelectorSelectedIds([]);
                                    setShowPaintingSelectorModal(true);
                                }}
                                className="flex items-center gap-1 hover:text-white font-bold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Kişi Kartı Ekle</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopyRouteText}
                                    className="flex items-center gap-1 hover:text-white underline font-semibold text-[11px]"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Listeyi Kopyala</span>
                                </button>
                                <span>•</span>
                                <span className="font-semibold text-[10.5px]">
                                    {getActivePaintingTasks().filter(t => extractCoords(t.locationCoordinates)).length} Konum Haritada
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- LIST CONTENT AREA (MATCHING THE SCREENSHOT ERP ROWS) --- */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 bg-white custom-scrollbar pb-24">
                {unifiedTaskList.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                        <Search className="w-8 h-8 opacity-30 text-slate-400" />
                        <span className="text-xs font-medium">Bu kriterlere uygun iş kaydı bulunamadı.</span>
                        {(searchQuery || selectedDistrict) && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedDistrict('');
                                }}
                                className={`mt-2 text-xs ${isDesktopView ? "text-blue-600" : "text-orange-600"} font-bold underline`}
                            >
                                Filtreleri Temizle
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                    {unifiedTaskList.map(item => {
                        if (item.type === 'main') {
                            return renderMainTask(item.data);
                        } else {
                            return renderRoutineTask(item.data);
                        }
                    })}                </>
            )}
        </div>

            {/* FAB button */}
            {canAddTasks && !isPaintingMode && (
                <button
                    onClick={onAddTask}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#e65100] via-[#f57c00] to-[#ff9800] text-white shadow-xl shadow-orange-600/40 hover:shadow-orange-600/60 flex items-center justify-center fixed bottom-6 right-4 z-30 active:scale-90 transition-all border-2 border-white/80"
                    title="Yeni Müşteri / İş Ekle"
                >
                    <Plus className="w-7 h-7 stroke-[2.5]" />
                </button>
            )}

            {/* --- DISTRICT FILTER MODAL (IF FUNNEL CLICKED) --- */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[75vh] flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-sm text-slate-800">İlçe Filtresi</h3>
                            <button onClick={() => setIsFilterModalOpen(false)} className="p-1 text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-2 space-y-1">
                            <button
                                onClick={() => { setSelectedDistrict(''); setIsFilterModalOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                    selectedDistrict === '' ? (isDesktopView ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-orange-50 text-orange-600 font-bold') : 'text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                Tüm İlçeler ({tasks.length})
                            </button>

                            {allDistricts.map(dist => {
                                const count = tasks.filter(t => t.district?.trim().toLocaleUpperCase('tr-TR') === dist).length;
                                return (
                                    <button
                                        key={dist}
                                        onClick={() => { setSelectedDistrict(dist); setIsFilterModalOpen(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                                            selectedDistrict === dist ? (isDesktopView ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-orange-50 text-orange-600 font-bold') : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span>{dist}</span>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* --- STATUS CHANGER MODAL / BOTTOM SHEET WITH GÖNDER BUTTON --- */}
            {statusModalTask && (
                <div
                    className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
                    onClick={() => setStatusModalTask(null)}
                >
                    <div
                        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`px-5 py-3.5 ${isDesktopView ? "bg-slate-900 border-b border-slate-800" : "bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00]"} text-white flex items-center justify-between shadow-xs shrink-0`}>
                            <div className="min-w-0">
                                <h3 className="font-black text-sm uppercase tracking-tight">İş Durumunu Değiştir</h3>
                                <p className={`text-[11px] ${isDesktopView ? "text-slate-400" : "text-orange-100"} font-medium truncate`}>
                                    {statusModalTask.title} • #{statusModalTask.orderNumber || 0}
                                </p>
                            </div>
                            <button
                                onClick={() => setStatusModalTask(null)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Status Options */}
                        <div className="p-4 overflow-y-auto space-y-2 flex-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Aktarılacak Aşamayı Seçin:
                            </span>
                            {Object.entries(StatusLabels).filter(([key]) => {
                                // Admin ve Manager tüm aşamaları görebilir
                                if (!userPermissions || userPermissions.role === 'admin' || userPermissions.role === 'manager') return true;
                                // Görevin mevcut aşamasını her zaman göster
                                if (statusModalTask && statusModalTask.status === key) return true;
                                // Personelin yetki verilen aşamaları
                                if (!userPermissions.allowedColumns) return false;
                                return userPermissions.allowedColumns.includes(key as TaskStatus);
                            }).map(([key, label]) => {
                                const isSelected = selectedNewStatus === key;
                                const isCurrent = statusModalTask.status === key;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => setSelectedNewStatus(key as TaskStatus)}
                                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${
                                            isSelected
                                                ? (isDesktopView ? 'bg-blue-50 border-blue-500 shadow-xs ring-2 ring-blue-500/20' : 'bg-orange-50 border-orange-500 shadow-xs ring-2 ring-orange-500/20')
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    isSelected
                                                        ? (isDesktopView ? 'border-blue-500 bg-blue-500 text-white' : 'border-orange-500 bg-orange-500 text-white')
                                                        : 'border-slate-300 bg-white'
                                                }`}
                                            >
                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                            <span className={`text-xs font-bold truncate ${isSelected ? (isDesktopView ? 'text-blue-950 font-black' : 'text-orange-950 font-black') : 'text-slate-700'}`}>
                                                {label}
                                            </span>
                                        </div>

                                        {isCurrent && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                                                Mevcut
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Gaz Açıldı Seçildiyse: Beklet Seçeneği */}
                            {selectedNewStatus === TaskStatus.GAS_OPENED && (
                                <div className="mt-3 p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-blue-950 block leading-tight">
                                                Bekletmeye Al
                                            </span>
                                            <span className="text-[10px] text-blue-600 font-medium">
                                                {modalIsWaiting ? 'İş gaz açıldı aşamasında beklemede kaydedilecek' : 'İsteğe bağlı beklemeye alabilirsiniz'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setModalIsWaiting(!modalIsWaiting)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all active:scale-95 shrink-0 ${
                                            modalIsWaiting
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {modalIsWaiting ? 'BEKLEMEDE' : 'BEKLET'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer with GÖNDER button */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => setStatusModalTask(null)}
                                className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onTaskUpdate && statusModalTask) {
                                        if (selectedNewStatus === TaskStatus.CHECK_COMPLETED) {
                                            // Kontrol Edildi seçildi -> Camcı & Elektrikçi Sihirbazını Başlat
                                            setCheckWizardTask(statusModalTask);
                                            setWizardStep(1);
                                            setWizardGlazier(statusModalTask.isGlazierDirected ?? null);
                                            setWizardElectrician(statusModalTask.isElectricianDirected ?? null);
                                            setWizardNote(statusModalTask.teamNote || '');
                                            setWizardCheckStatus(statusModalTask.checkStatus || null);
                                            setStatusModalTask(null);
                                            return;
                                        }

                                        if (selectedNewStatus === TaskStatus.GAS_OPENED) {
                                            // Gaz Açıldı seçildi -> Sigorta Var mı? Kontrolü Başlat
                                            setGasFuseTask(statusModalTask);
                                            setGasFuseChoice(null);
                                            setStatusModalTask(null);
                                            return;
                                        }

                                        const updates: Partial<Task> = { status: selectedNewStatus, isWaiting: false };
                                        onTaskUpdate(statusModalTask.id, updates);
                                    }
                                    setStatusModalTask(null);
                                }}
                                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Send className="w-4 h-4" />
                                <span>Gönder</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* KONTROL EKİBİ İŞLEM SİHİRBAZI MODALI (DURUM DEĞİŞTİRME PANELİNDEN SONRA) */}
            {/* ========================================================= */}
            {checkWizardTask && (
                <div
                    className="fixed inset-0 z-[230] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
                    onClick={() => setCheckWizardTask(null)}
                >
                    <div
                        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn font-sans"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-xs shrink-0">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                                        Adım {wizardStep} / 3
                                    </span>
                                    <h3 className="font-black text-sm uppercase tracking-tight">Kontrol İşlemini Tamamla</h3>
                                </div>
                                <p className="text-[11px] text-emerald-100 font-medium truncate mt-0.5">
                                    {checkWizardTask.title || 'Müşteri'} • #{checkWizardTask.orderNumber || 0}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCheckWizardTask(null)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-emerald-100 h-1.5 shrink-0">
                            <div
                                className="bg-emerald-500 h-full transition-all duration-300"
                                style={{ width: `${(wizardStep / 3) * 100}%` }}
                            />
                        </div>

                        {/* Wizard Body */}
                        <div className="p-5 overflow-y-auto space-y-4 flex-1">
                            {/* Step 1: Camcı */}
                            {wizardStep === 1 && (
                                <div className="space-y-4 animate-fadeIn py-2">
                                    <div className="text-center space-y-1.5">
                                        <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center shadow-xs">
                                            <span className="text-3xl">🪟</span>
                                        </div>
                                        <h4 className="text-base font-black text-slate-800">
                                            Camcı yönlendirildi mi?
                                        </h4>
                                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                            Bu iş veya daire için camcı ustası yönlendirmesi yapıldı mı?
                                        </p>
                                    </div>

                                    {/* Paylaş Butonu (Yönlendirme yapılmadıysa o bölümde paylaşabilelim) */}
                                    <button
                                        type="button"
                                        onClick={() => handleShare(checkWizardTask)}
                                        className="w-full py-2.5 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                    >
                                        <Share2 className="w-4 h-4 text-orange-600" />
                                        <span>Müşteri Bilgilerini Paylaş (Camcıya Gönder)</span>
                                    </button>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setWizardGlazier(true);
                                                setWizardStep(2);
                                            }}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                                                wizardGlazier === true
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md ring-2 ring-emerald-500/20'
                                                    : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-700'
                                            }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
                                                <Check className="w-6 h-6 stroke-[3]" />
                                            </div>
                                            <span className="font-black text-sm">Evet</span>
                                            <span className="text-[10px] text-slate-400">Yönlendirildi</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setWizardGlazier(false);
                                                setWizardStep(2);
                                            }}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                                                wizardGlazier === false
                                                    ? 'border-slate-500 bg-slate-50 text-slate-800 shadow-md ring-2 ring-slate-500/20'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                            }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black">
                                                <X className="w-6 h-6 stroke-[3]" />
                                            </div>
                                            <span className="font-black text-sm">Hayır</span>
                                            <span className="text-[10px] text-slate-400">Yönlendirilmedi</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Elektrikçi */}
                            {wizardStep === 2 && (
                                <div className="space-y-4 animate-fadeIn py-2">
                                    <div className="text-center space-y-1.5">
                                        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-xs">
                                            <span className="text-3xl">⚡</span>
                                        </div>
                                        <h4 className="text-base font-black text-slate-800">
                                            Elektrikçi yönlendirildi mi?
                                        </h4>
                                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                            Bu iş için elektrikçi ustası yönlendirmesi yapıldı mı?
                                        </p>
                                    </div>

                                    {/* Paylaş Butonu (Yönlendirme yapılmadıysa o bölümde paylaşabilelim) */}
                                    <button
                                        type="button"
                                        onClick={() => handleShare(checkWizardTask)}
                                        className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                    >
                                        <Share2 className="w-4 h-4 text-amber-600" />
                                        <span>Müşteri Bilgilerini Paylaş (Elektrikçiye Gönder)</span>
                                    </button>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setWizardElectrician(true);
                                                setWizardStep(3);
                                            }}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                                                wizardElectrician === true
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md ring-2 ring-emerald-500/20'
                                                    : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-700'
                                            }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
                                                <Check className="w-6 h-6 stroke-[3]" />
                                            </div>
                                            <span className="font-black text-sm">Evet</span>
                                            <span className="text-[10px] text-slate-400">Yönlendirildi</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setWizardElectrician(false);
                                                setWizardStep(3);
                                            }}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                                                wizardElectrician === false
                                                    ? 'border-slate-500 bg-slate-50 text-slate-800 shadow-md ring-2 ring-slate-500/20'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                            }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black">
                                                <X className="w-6 h-6 stroke-[3]" />
                                            </div>
                                            <span className="font-black text-sm">Hayır</span>
                                            <span className="text-[10px] text-slate-400">Yönlendirilmedi</span>
                                        </button>
                                    </div>

                                    <div className="pt-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => setWizardStep(1)}
                                            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                                        >
                                            ← Geri (Camcı Seçimine Dön)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Kontrol ekibinin gördüğü eksiklikler */}
                            {wizardStep === 3 && (
                                <div className="space-y-4 animate-fadeIn">
                                    {/* Özet çipleri */}
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                                        <div className="flex items-center justify-between px-2.5 py-1 bg-white rounded-lg border border-slate-100">
                                            <span className="font-bold text-slate-700 flex items-center gap-1">🪟 Camcı:</span>
                                            <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${wizardGlazier ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {wizardGlazier ? 'Evet' : 'Hayır'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between px-2.5 py-1 bg-white rounded-lg border border-slate-100">
                                            <span className="font-bold text-slate-700 flex items-center gap-1">⚡ Elektrikçi:</span>
                                            <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${wizardElectrician ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {wizardElectrician ? 'Evet' : 'Hayır'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Eksik Durumu Seçimi */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                                            Kontrol Sonucu
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setWizardCheckStatus('clean')}
                                                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-xs cursor-pointer ${
                                                    wizardCheckStatus === 'clean'
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <span>Eksik Yok (Temiz)</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setWizardCheckStatus('missing')}
                                                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-xs cursor-pointer ${
                                                    wizardCheckStatus === 'missing'
                                                        ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                            >
                                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                <span>Eksik Var</span>
                                            </button>
                                        </div>
                                        {!wizardCheckStatus && (
                                            <p className="text-[10px] text-amber-600 font-bold text-center pt-0.5">
                                                * Lütfen bir kontrol sonucu seçiniz
                                            </p>
                                        )}
                                    </div>

                                    {/* Not Alanı */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText className="w-4 h-4 text-emerald-600" />
                                            Kontrol Ekibinin Gördüğü Eksiklikler
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={wizardNote}
                                            onChange={(e) => setWizardNote(e.target.value)}
                                            placeholder="Görülen eksiklikleri ve kontrol notlarını buraya yazın..."
                                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5 shrink-0">
                            {wizardStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                                    className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                >
                                    Geri
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setCheckWizardTask(null)}
                                    className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                >
                                    Vazgeç
                                </button>
                            )}

                            {wizardStep < 3 ? (
                                <button
                                    type="button"
                                    disabled={wizardStep === 1 ? wizardGlazier === null : wizardElectrician === null}
                                    onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                                >
                                    İleri
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={!wizardCheckStatus}
                                    onClick={() => {
                                        if (onTaskUpdate && checkWizardTask && wizardCheckStatus) {
                                            const finalStatus = checkWizardTask.status === TaskStatus.DEPOSIT_PAID
                                                ? TaskStatus.DEPOSIT_PAID
                                                : TaskStatus.CHECK_COMPLETED;

                                            onTaskUpdate(checkWizardTask.id, {
                                                status: finalStatus,
                                                checkStatus: wizardCheckStatus,
                                                isGlazierDirected: wizardGlazier ?? false,
                                                isElectricianDirected: wizardElectrician ?? false,
                                                teamNote: wizardNote.trim(),
                                                isReassignedForCheck: false
                                            });
                                        }
                                        setCheckWizardTask(null);
                                    }}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Tamamla ve Gönder</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* GAZ AÇILDI SİGORTA KONTROLÜ SİHİRBAZI */}
            {/* ========================================================= */}
            {gasFuseTask && (
                <div
                    className="fixed inset-0 z-[230] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
                    onClick={() => {
                        setGasFuseTask(null);
                        setGasFuseChoice(null);
                    }}
                >
                    <div
                        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn font-sans"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-5 py-3.5 bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 text-white flex items-center justify-between shadow-xs shrink-0">
                            <div className="min-w-0">
                                <h3 className="font-black text-sm uppercase tracking-tight flex items-center gap-1.5">
                                    <Flame className="w-4 h-4" /> Gaz Açım Kontrolü
                                </h3>
                                <p className="text-[11px] text-orange-100 font-medium truncate mt-0.5">
                                    {gasFuseTask.title || 'Müşteri'} • #{gasFuseTask.orderNumber || 0}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setGasFuseTask(null);
                                    setGasFuseChoice(null);
                                }}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto space-y-4 flex-1">
                            <div className="text-center space-y-1.5 py-1">
                                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-xs">
                                    <span className="text-3xl">⚡</span>
                                </div>
                                <h4 className="text-base font-black text-slate-800">
                                    Sigorta var mı?
                                </h4>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                    Kombinin elektrik sigortası takılı mı?
                                </p>
                            </div>

                            {/* Evet / Hayır Butonları */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleConfirmGasOpened(true)}
                                    className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black shadow-xs">
                                        <Check className="w-6 h-6 stroke-[3]" />
                                    </div>
                                    <span className="font-black text-sm">Evet</span>
                                    <span className="text-[10px] text-emerald-700 font-semibold">Sigorta Var</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setGasFuseChoice('no')}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                                        gasFuseChoice === 'no'
                                            ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-md ring-2 ring-amber-500/20'
                                            : 'border-slate-200 bg-white hover:border-amber-300 text-slate-700'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black">
                                        <X className="w-6 h-6 stroke-[3]" />
                                    </div>
                                    <span className="font-black text-sm">Hayır</span>
                                    <span className="text-[10px] text-slate-400">Sigorta Yok</span>
                                </button>
                            </div>

                            {/* Hayır seçildiyse: Elektrikçiyi yönlendirmek için Paylaş kısmı öne çıksın */}
                            {gasFuseChoice === 'no' && (
                                <div className="space-y-3 pt-2 animate-fadeIn border-t border-slate-100">
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-1.5">
                                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                            <span>Sigorta yok! Elektrikçiye yönlendirilmelidir.</span>
                                        </div>
                                        <p className="text-[11px] text-amber-700 leading-relaxed">
                                            Aşağıdaki buton ile müşteri adres ve telefon bilgilerini elektrikçi ustasına anında paylaşabilirsiniz.
                                        </p>
                                    </div>

                                    {/* Öne Çıkarılan Paylaş Butonu */}
                                    <button
                                        type="button"
                                        onClick={() => handleShare(gasFuseTask)}
                                        className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer ring-2 ring-amber-400/40"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        <span>Müşteri Bilgilerini Elektrikçiye Paylaş</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setGasFuseTask(null);
                                    setGasFuseChoice(null);
                                }}
                                className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            >
                                Vazgeç
                            </button>

                            {gasFuseChoice === 'no' && (
                                <button
                                    type="button"
                                    onClick={() => handleConfirmGasOpened(false)}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Tamam (Gaz Açıldı'ya Geç)</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Phone Selector Modal (Ev Sahibi / Kiracı) */}
            {callSelectTask && (
                <div
                    className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150"
                    onClick={() => setCallSelectTask(null)}
                >
                    <div
                        className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-black text-slate-800">Arama Yap</h3>
                                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[240px]">
                                    {callSelectTask.title}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCallSelectTask(null)}
                                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {callSelectTask.phone && (
                                <a
                                    href={`tel:${callSelectTask.phone}`}
                                    onClick={() => setCallSelectTask(null)}
                                    className="flex items-center justify-between p-3 rounded-xl bg-orange-50 hover:bg-orange-100/70 border border-orange-200 transition-all active:scale-[0.98]"
                                >
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-black uppercase text-orange-700 tracking-wider block">
                                            🏠 Ev Sahibi
                                        </span>
                                        <span className="text-xs font-bold text-slate-800 block truncate">
                                            {callSelectTask.title}
                                        </span>
                                        <span className="text-xs font-semibold text-orange-950 font-mono">
                                            {callSelectTask.phone}
                                        </span>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                </a>
                            )}

                            {callSelectTask.tenantPhone && (
                                <a
                                    href={`tel:${callSelectTask.tenantPhone}`}
                                    onClick={() => setCallSelectTask(null)}
                                    className="flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100/70 border border-blue-200 transition-all active:scale-[0.98]"
                                >
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block">
                                            🔑 Kiracı
                                        </span>
                                        <span className="text-xs font-bold text-slate-800 block truncate">
                                            {callSelectTask.tenantName || 'Kiracı'}
                                        </span>
                                        <span className="text-xs font-semibold text-blue-950 font-mono">
                                            {callSelectTask.tenantPhone}
                                        </span>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                </a>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setCallSelectTask(null)}
                            className="w-full py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Vazgeç
                        </button>
                    </div>
                </div>
            )}

            {/* Painting Selector Modal (+ Kişi Kartlarından Ekle) */}
            {showPaintingSelectorModal && (
                <div
                    className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
                    onClick={() => setShowPaintingSelectorModal(false)}
                >
                    <div
                        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`${isDesktopView ? "bg-slate-900" : "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700"} text-white p-4 flex items-center justify-between shrink-0`}>
                            <div className="flex items-center gap-2">
                                <Paintbrush className="w-5 h-5 text-amber-200" />
                                <div>
                                    <h3 className="font-black text-sm">Boya Listesine Müşteri Ekle</h3>
                                    <p className={`text-[11px] ${isDesktopView ? "text-slate-400" : "text-amber-100"}`}>Kişi kartlarını seçip listeye dahil edin</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPaintingSelectorModal(false)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="İsim, ilçe, adres veya telefon ile ara..."
                                    value={paintingSearchQuery}
                                    onChange={(e) => setPaintingSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                />
                            </div>
                        </div>

                        {/* Candidate Tasks List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 min-h-[220px]">
                            {candidateTasks.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                                    <Paintbrush className="w-8 h-8 opacity-25 text-slate-400" />
                                    <span>Eklenebilecek müşteri kartı bulunamadı.</span>
                                </div>
                            ) : (
                                candidateTasks.map(t => {
                                    const isSelected = selectorSelectedIds.includes(t.id);
                                    const hasCoords = Boolean(extractCoords(t.locationCoordinates));
                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => {
                                                setSelectorSelectedIds(prev =>
                                                    prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                                );
                                            }}
                                            className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                                                isSelected ? (isDesktopView ? 'bg-blue-50 border border-blue-300' : 'bg-orange-50/80 border border-orange-200') : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="pt-0.5 shrink-0">
                                                {isSelected ? (
                                                    <CheckSquare className={`w-5 h-5 ${isDesktopView ? "text-blue-600" : "text-orange-600"}`} />
                                                ) : (
                                                    <Square className="w-5 h-5 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        #{t.orderNumber}
                                                    </span>
                                                    <span className="font-extrabold text-xs text-slate-900 truncate">
                                                        {t.title}
                                                    </span>
                                                    {hasCoords ? (
                                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded shrink-0">
                                                            📍 Konum Var
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                                                            Konum Yok
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                    {t.district && <strong className="text-slate-600">{t.district} · </strong>}
                                                    {t.address || 'Adres bilgisi yok'}
                                                </p>
                                                {t.phone && (
                                                    <p className="text-[10.5px] text-slate-400 mt-0.5 font-mono">
                                                        📞 {t.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowPaintingSelectorModal(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="button"
                                disabled={selectorSelectedIds.length === 0}
                                onClick={() => {
                                    if (onTaskUpdate && selectorSelectedIds.length > 0) {
                                        selectorSelectedIds.forEach(id => {
                                            onTaskUpdate(id, { isPaintingTask: true });
                                        });
                                        setSelectedPaintingIds(prev => Array.from(new Set([...prev, ...selectorSelectedIds])));
                                    }
                                    setShowPaintingSelectorModal(false);
                                }}
                                className={`px-4 py-2 text-xs font-black rounded-xl transition-all shadow-sm ${
                                    selectorSelectedIds.length > 0
                                        ? (isDesktopView ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95' : 'bg-orange-600 hover:bg-orange-500 text-white active:scale-95')
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                Seçilenleri Ekle ({selectorSelectedIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Paint Note Modal */}
            {paintNoteModalTask && (
                <div
                    className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150"
                    onClick={() => setPaintNoteModalTask(null)}
                >
                    <div
                        className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                                <Paintbrush className={`w-4 h-4 ${isDesktopView ? "text-blue-600" : "text-amber-600"}`} />
                                <h3 className="font-bold text-xs text-slate-800">Boyacıya Özel Not</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPaintNoteModalTask(null)}
                                className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold truncate">
                            {paintNoteModalTask.title} (#{paintNoteModalTask.orderNumber})
                        </p>
                        <textarea
                            rows={3}
                            placeholder="Örn: Sadece balkon borusu ve sayaç boyanacak..."
                            value={paintNoteInput}
                            onChange={(e) => setPaintNoteInput(e.target.value)}
                            className={`w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 ${isDesktopView ? "focus:ring-blue-500/30 focus:border-blue-400" : "focus:ring-orange-500/30"}`}
                        />
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setPaintNoteModalTask(null)}
                                className="px-3 py-1.5 text-xs text-slate-500 font-bold hover:bg-slate-100 rounded-lg"
                            >
                                İptal
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onTaskUpdate && paintNoteModalTask) {
                                        onTaskUpdate(paintNoteModalTask.id, { paintNote: paintNoteInput });
                                    }
                                    setPaintNoteModalTask(null);
                                }}
                                className={`px-4 py-1.5 ${isDesktopView ? "bg-blue-600 hover:bg-blue-500" : "bg-orange-600 hover:bg-orange-500"} text-white text-xs font-black rounded-lg shadow-xs active:scale-95`}
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Public Painting Map & List Modal */}
            {showPublicMapModal && (
                <div className="fixed inset-0 z-[280]">
                    <PublicPaintingMapView
                        initialCustomers={getActivePaintingTasks().map(t => {
                            const coords = extractCoords(t.locationCoordinates);
                            if (!coords) return null;
                            return {
                                id: t.id,
                                n: t.title || 'Müşteri',
                                p: t.tenantPhone || t.phone || '',
                                a: t.address || '',
                                d: t.district || '',
                                m: t.paintNote || '',
                                lat: coords.lat,
                                lng: coords.lng,
                                isDone: t.paintStatus === 'completed'
                            };
                        }).filter(Boolean) as PublicMapCustomer[]}
                        onClose={() => setShowPublicMapModal(false)}
                        onToggleTaskDone={(taskId, isDone) => {
                            if (onTaskUpdate) {
                                onTaskUpdate(taskId, { paintStatus: isDone ? 'completed' : 'pending' });
                            }
                        }}
                    />
                </div>
            )}

        </div>
    );
};
