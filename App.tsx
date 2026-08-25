/// <reference types="vite/client" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Layout, Plus, LogOut, Settings, Bell, X, Users, User as UserIcon, Menu, Loader2, FileText, ChevronRight, FolderOpen, Sun, Moon, CheckSquare, Square, Star, UserCircle, Phone, MapPin } from 'lucide-react';
import KanbanBoard from './components/KanbanBoard';
import Visualizer from './components/Visualizer';
import TaskModal from './components/TaskModal';
import PinnedStaffSidebar from './components/PinnedStaffSidebar';

import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import MobileLayout from './components/MobileLayout';
import MobileAdminPanel from './components/MobileAdminPanel';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FieldStaffStatusModal from './components/FieldStaffStatusModal';
import TopBar from './components/TopBar';
import ProfileSettingsModal from './components/ProfileSettingsModal';
import ChangePasswordModal from './components/ChangePasswordModal';
// NEW VIEWS
import AssignmentView from './components/AssignmentView';
import RoutineTasksView from './components/RoutineTasksView';
import StockRadiatorsView from './components/StockRadiatorsView';
import StockCombisView from './components/StockCombisView';
import StockGenericView from './components/StockGenericView';
import ServiceRedirectDropdown from './components/ServiceRedirectDropdown';
import QuotationsListView from './components/QuotationsListView';
import { QuotationApp } from './teklif_app/QuotationApp';

import { Task, TaskStatus, AppSettings, StatusLabels, RoutineTask, UserPermission, StaffMember, Quotation } from './types';

import { playNotificationSound } from './utils/notification_sound';
import { auth, db } from './src/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getToken, onMessage, isSupported } from 'firebase/messaging';
import { messaging } from './src/firebase';

const ADMIN_EMAILS = ['canercelik1994@gmail.com', 'admin@onaymuhendislik.com', 'demo@onay.com', 'caner192@hotmail.com'];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [routineTasks, setRoutineTasks] = useState<RoutineTask[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // UI State
  const [forceMobile, setForceMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768 || forceMobile);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme_preference');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('theme_preference', isDarkMode ? 'dark' : 'light');
    // @ts-ignore
    if (window.initParticles) {
      // @ts-ignore
      window.initParticles(isDarkMode);
    }
  }, [isDarkMode]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isFieldStaffModalOpen, setIsFieldStaffModalOpen] = useState(false);

  // New Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [appSettings, setAppSettings] = useState<AppSettings>({ notifications: {}, pinnedStaff: [] });
  const [toast, setToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

  // Dashboard & Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'dashboard' | 'board' | 'split'>('dashboard');
  const [boardFilter, setBoardFilter] = useState<TaskStatus | undefined>(undefined);
  const [isMissingFilterActive, setIsMissingFilterActive] = useState(false);
  const [isPriorityFilter, setIsPriorityFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // NEW: Global Search

  // Routine Assign Modal State
  const [assignRoutineModal, setAssignRoutineModal] = useState<{ isOpen: boolean; task: RoutineTask | null }>({ isOpen: false, task: null });
  const [routineAssignStaff, setRoutineAssignStaff] = useState('');
  const [routineAssignDate, setRoutineAssignDate] = useState('');

  // Quotation View State
  const [quotationView, setQuotationView] = useState<'none' | 'prepare' | 'list'>('none');
  const [editingQuotation, setEditingQuotation] = useState<{ data: any; id: string } | null>(null);
  const [quotationSubView, setQuotationSubView] = useState<'hub' | 'prepare' | 'list'>('hub');

  // Split Dashboard Context Menu State
  const [splitContextMenuState, setSplitContextMenuState] = useState<{ visible: boolean, x: number, y: number, task: RoutineTask | null }>({ visible: false, x: 0, y: 0, task: null });

  useEffect(() => {
    const handleClick = () => setSplitContextMenuState(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleSplitContextMenu = (e: React.MouseEvent, task: RoutineTask) => {
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX;
    let y = e.clientY;
    if (y + 130 > window.innerHeight) {
        y = window.innerHeight - 130;
    }
    setSplitContextMenuState({
        visible: true,
        x,
        y,
        task
    });
  };

  // Handle Resize & Force Mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768 || forceMobile);

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [forceMobile]);

  // Settings Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as AppSettings;
        console.log("Loaded App Settings:", data);
        setAppSettings({
          notifications: data.notifications || {},
          pinnedStaff: data.pinnedStaff || [],
          staffList: data.staffList || []
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Notification Logic
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const task = change.doc.data() as Task;
          // FIX: Include both configured notification emails AND the assigned staff email
          const configuredEmails = appSettings.notifications?.[task.status] || [];
          // Assignee removed from standard notifications in V2 as per updated logic to notify specific people or admin
          const allTargetEmails = [...configuredEmails];

          if (allTargetEmails.length > 0) {
            const currentUserEmail = user.email?.toLowerCase() || '';
            const normalizedTargetEmails = allTargetEmails.map(e => e.toLowerCase());

            if (normalizedTargetEmails.includes(currentUserEmail)) {
              const message = `🔔”” ${task.title}: ${StatusLabels[task.status]} aşamasına geldi.`;

              // 1. Masaüstü Bildirimi (Tarayıcı izni varsa)
              try {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('İş Durumu Güncellendi', {
                    body: message,
                    icon: '/icon.png'
                  });
                }
              } catch (e) {
                console.log('Notification API not supported');
              }

              // 2. Uygulama İçi Bildirim (Toast)
              setToast({ message, visible: true });
              setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);

              // 3. Sesli Bildirim
              playNotificationSound();
            }
          }
        }
      });
    });

    try {
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    } catch (e) {
      console.log('Notification permission error', e);
    }
    return () => unsubscribe();
  }, [user, appSettings]);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'general'), newSettings, { merge: true });
    } catch (e) {
      console.error("Error saving settings: ", e);
      setError("Ayarlar kaydedilemedi.");
    }
  };

  // Auth Listener & Notifications
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // --- PRESENCE TRACKING START ---
        const updatePresence = async () => {
          if (!currentUser?.email) return;
          try {
            await setDoc(doc(db, 'users', currentUser.email), {
              email: currentUser.email,
              lastSeen: serverTimestamp(),
              active: true
            }, { merge: true });
          } catch (error) {
            console.error('Presence update error:', error);
          }
        };

        // 1. Initial Update
        updatePresence();

        // 2. Interval Update (Every 5 minutes to keep "Online" status fresh)
        // This is low frequency enough to not impact performance.
        const intervalId = setInterval(updatePresence, 5 * 60 * 1000);

        // 3. Visibility Change (Update when coming back to tab)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            updatePresence();
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Clean up interval and listener on unmount/logout
        // Note: We can't easily clean up inside this callback without refs,
        // but since App.tsx is root, it mostly unmounts on close.
        // For correctness in a component cycle:
        // Ideally these should be in a separate useEffect dependent on `user`.
        // However, putting them here for now as requested.
        // BETTER: Moving this logic to a separate useEffect below to handle cleanup correctly.
        // --- PRESENCE TRACKING END ---

        try {
          const supported = await isSupported();
          if (supported && 'serviceWorker' in navigator) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

              if (messaging) {
                const token = await getToken(messaging, {
                  vapidKey: "BAURdcxGoBuc1kI8ImEAu1epIqemw2Lg3zys-O4R9qg175P6l5ycnlGWMx84elDgQDgd8RNBISqdJm59s5mdSmY",
                  serviceWorkerRegistration: registration
                });

                if (token) {
                  await setDoc(doc(db, 'fcm_tokens', currentUser.email!), {
                    token,
                    email: currentUser.email,
                    platform: window.innerWidth < 768 ? 'mobile' : 'desktop',
                    lastSeen: serverTimestamp()
                  }, { merge: true });
                }
              }
            }
          }
        } catch (error: any) {
          // Suppress known errors for unsupported browsers
          if (error?.code === 'messaging/unsupported-browser' || error?.message?.includes('unsupported-browser')) {
            console.log('Firebase Messaging not supported on this browser.');
          } else {
            console.error('Notification setup error:', error);
          }
        }
      }
    });

    const setupMessaging = async () => {
      try {
        const supported = await isSupported();
        if (supported && messaging) {
          onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            setToast({ message: payload.notification?.title || 'Yeni Bildirim', visible: true });
            playNotificationSound();
          });
        }
      } catch (error) {
        // Silently ignore messaging errors on unsupported browsers
        console.log('Firebase Messaging not supported (onMessage check).');
      }
    };
    setupMessaging();

    return () => unsubscribe();
  }, []);

  // Firestore Listeners (Tasks & RoutineTasks)
  useEffect(() => {
    if (!user) return;

    // Tasks - Client side sort to avoid missing field issues
    const qTasks = query(collection(db, 'tasks'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const fetchedTasks: Task[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      // Client-side sort
      fetchedTasks.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
      setTasks(fetchedTasks);
    });

    // Routine Tasks
    const qRoutine = query(collection(db, 'routine_tasks'), orderBy('createdAt', 'desc'));
    const unsubRoutine = onSnapshot(qRoutine, (snapshot) => {
      const fetchedRoutine: RoutineTask[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RoutineTask));
      setRoutineTasks(fetchedRoutine);
    });

    // PERMISSIONS LOGIC
    let unsubPerm = () => { };

    // Start loading
    setPermissionsLoading(true);

    if (user && user.email) {
      const emailLower = user.email.toLowerCase();
      if (ADMIN_EMAILS.includes(emailLower)) {
        setUserPermissions({
          email: user.email,
          name: 'Admin',
          role: 'admin',
          allowedColumns: Object.values(TaskStatus),
          canAccessRoutineTasks: true,
          canAccessAssignment: true,
          canAddCustomers: true,
          isEngineer: true,
          canAccessQuotations: true,
          canAccessStock: true
        });
        setPermissionsLoading(false);
      } else {
        // Reuse emailLower
        unsubPerm = onSnapshot(doc(db, 'permissions', emailLower), (docSnap) => {
          if (docSnap.exists()) {
            setUserPermissions(docSnap.data() as UserPermission);
          } else {
            setUserPermissions({
              email: emailLower,
              name: '',
              canAddCustomers: false,
              role: 'staff',
              allowedColumns: [],
              canAccessRoutineTasks: false,
              canAccessAssignment: false
            });
          }
          setPermissionsLoading(false);
        }, (error) => {
          console.error("Permission fetch error:", error);
          setPermissionsLoading(false);
        });
      }
    } else {
      setPermissionsLoading(false);
    }

    return () => {
      unsubTasks();
      unsubRoutine();
      unsubPerm();
    };
  }, [user]);

  const handleLogout = () => signOut(auth);

  const nextOrderNumber = tasks.length > 0 ? Math.max(...tasks.map(t => t.orderNumber)) + 1 : 1;

  // Handlers - Tasks
  const handleAddTaskClick = () => {
    setSelectedTask(undefined);
    setIsModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (selectedTask) {
        const taskRef = doc(db, 'tasks', selectedTask.id);
        await updateDoc(taskRef, { ...taskData, lastUpdatedBy: user?.email });
      } else {
        await addDoc(collection(db, 'tasks'), {
          orderNumber: nextOrderNumber,
          title: taskData.title || 'Yeni Müşteri',
          jobDescription: taskData.jobDescription || '',
          status: taskData.status || TaskStatus.TO_CHECK,
          assignee: taskData.assignee || '',
          date: taskData.date || new Date().toISOString(),
          address: taskData.address || '',
          district: taskData.district || '',
          city: taskData.city || '',
          locationCoordinates: taskData.locationCoordinates || '',
          phone: taskData.phone || '',
          generalNote: taskData.generalNote || '',
          teamNote: taskData.teamNote || '',
          checkStatus: taskData.checkStatus || null,
          gasOpeningDate: taskData.gasOpeningDate || '',
          gasNote: taskData.gasNote || '',
          serviceSerialNumber: taskData.serviceSerialNumber || '',
          serviceNote: taskData.serviceNote || '',
          createdBy: user?.email,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Error saving task: ", e);
      setError("Kayıt sırasında hata oluştu.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));

    } catch (e) {
      console.error("Error deleting task: ", e);
      setError("Silme sırasında hata oluştu.");
    }
  };

  const handleQuickUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: user?.email || 'System'
      });
    } catch (e) {
      console.error("Quick update error:", e);
    }
  };

  const handleToggleTaskVerification = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, { isCheckVerified: !task.isCheckVerified });
      }
    } catch (e) {
      console.error("Verification error:", e);
    }
  };


  // Handlers - Routine Tasks
  const handleAddRoutineTask = async (content: string, assignee: string, customerName?: string, phoneNumber?: string, address?: string, locationCoordinates?: string, district?: string, city?: string, customDate?: string | Date) => {
    try {
      let createdAtField = serverTimestamp();
      if (customDate) {
        const d = new Date(customDate);
        if (typeof customDate === 'string') {
          d.setHours(12, 0, 0, 0);
        }
        createdAtField = Timestamp.fromDate(d);
      }

      const docRef = await addDoc(collection(db, 'routine_tasks'), {
        content,
        assignee,
        customerName: customerName || '',
        phoneNumber: phoneNumber || '',
        address: address || '',
        locationCoordinates: locationCoordinates || '',
        district: district || '',
        city: city || '',
        isCompleted: false,
        createdAt: createdAtField,
        scheduledDate: customDate ? createdAtField : null, // Add scheduledDate if customDate exists
        createdBy: user?.email
      });
      console.log("Routine task added with ID:", docRef.id, "at", createdAtField);
    } catch (e) {
      console.error("Routine task error:", e);
      alert("Görev eklenirken bir hata oluştu: " + e.message);
    }
  };

  const handleToggleRoutineTask = async (taskId: string) => {
    try {
      const task = routineTasks.find(t => t.id === taskId);
      if (task) {
        const taskRef = doc(db, 'routine_tasks', taskId);
        const newIsCompleted = !task.isCompleted;
        await updateDoc(taskRef, {
          isCompleted: newIsCompleted,
          completedAt: newIsCompleted ? serverTimestamp() : null
        });
      }
    } catch (e) {
      console.error("Toggle routine error:", e);
    }
  };

  const handleDeleteRoutineTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'routine_tasks', taskId));
    } catch (e) {
      console.error("Delete routine error:", e);
    }
  };

  const handleUpdateRoutineTask = async (taskId: string, updatedData: Partial<RoutineTask>) => {
    try {
      const taskRef = doc(db, 'routine_tasks', taskId);
      await updateDoc(taskRef, updatedData);
    } catch (e) {
      console.error("Update routine error:", e);
    }
  };

  const handleConvertRoutineTask = async (taskId: string, targetStatus: TaskStatus) => {
    try {
      const routineTask = routineTasks.find(t => t.id === taskId);
      if (!routineTask) return;

      await addDoc(collection(db, 'tasks'), {
        orderNumber: nextOrderNumber,
        title: routineTask.customerName || 'İsimsiz Müşteri',
        jobDescription: '',
        description: '',
        status: targetStatus,
        assignee: '',
        date: new Date().toISOString(),
        address: routineTask.address || '',
        locationCoordinates: routineTask.locationCoordinates || '',
        phone: routineTask.phoneNumber || '',
        generalNote: '',
        teamNote: '',
        checkStatus: null,
        createdBy: user?.email,
        createdAt: serverTimestamp()
      });

      await deleteDoc(doc(db, 'routine_tasks', taskId));

      setToast({ message: 'Eksik başarıyla karta dönüştürüldü.', visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);

    } catch (e) {
      console.error("Convert routine error:", e);
      setError("Dönüştürme işlemi başarısız.");
    }
  };

  // Handlers - Assignment & Staff
  // --- REORDER HANDLER (BATCH UPDATE) ---
  const handleReorderDailyTasks = async (updates: { id: string, type: 'main' | 'routine', dailyOrder: number }[]) => {
    try {
      if (updates.length > 0) {
        // Optimistic Update can be tricky with mixed types, relying on Firebase updates
        const batchUpdates = updates.map(async (update) => {
          const coll = update.type === 'main' ? 'tasks' : 'routine_tasks';
          const taskRef = doc(db, coll, update.id);
          await updateDoc(taskRef, { dailyOrder: update.dailyOrder });
        });
        await Promise.all(batchUpdates);
      }
    } catch (error) {
      console.error("Reorder Error:", error);
      alert("Sıralama güncellenirken hata oluştu.");
    }
  };

  const handleAssignTask = async (taskId: string, assigneeName: string, assigneeEmail?: string, scheduledDate?: Date) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const updateData: any = { assignee: assigneeName, assigneeEmail: assigneeEmail || null, lastUpdatedBy: user?.email };

      if (scheduledDate) {
        const d = new Date(scheduledDate);
        // Do not reset hours to 12 so we can schedule at specific times
        updateData.scheduledDate = Timestamp.fromDate(d);
      }

      await updateDoc(taskRef, updateData);
    } catch (e) {
      console.error("Assign error:", e);
    }
  };

  const handleAssignRoutineTask = async (taskId: string, assignee: string, assigneeEmail?: string, scheduledDate?: Date) => {
    try {
      const taskRef = doc(db, 'routine_tasks', taskId);

      const updateData: any = {
        assignee,
        assigneeEmail: assigneeEmail || '',
        assignedAt: serverTimestamp()
      };

      if (scheduledDate) {
        const d = new Date(scheduledDate);
        // Do not reset hours to 12 so we can schedule at specific times
        updateData.scheduledDate = Timestamp.fromDate(d);
      } else {
        if (assignee === '') {
          updateData.scheduledDate = null;
        }
      }

      await updateDoc(taskRef, updateData);
    } catch (e) {
      console.error("Assign routine task error:", e);
    }
  };

  const handleRoutineAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignRoutineModal.task && routineAssignStaff && routineAssignDate) {
      const selectedStaff = registeredStaff?.find(s => s.name === routineAssignStaff);
      const targetDate = new Date(routineAssignDate);
      targetDate.setHours(9, 0, 0, 0); // Default to 09:00 for daily assignments

      handleAssignRoutineTask(assignRoutineModal.task.id, routineAssignStaff, selectedStaff?.email, targetDate);
      setAssignRoutineModal({ isOpen: false, task: null });
    }
  };

  const handleAddStaff = async (name: string, email: string) => {
    const currentStaffList = appSettings.staffList || [];
    let newStaffList = currentStaffList;
    if (!currentStaffList.some(s => s.name === name)) {
      newStaffList = [...currentStaffList, { name, email }];
    }

    const currentPinned = appSettings.pinnedStaff || [];
    const newPinned = currentPinned.includes(name) ? currentPinned : [...currentPinned, name];

    setAppSettings(prev => ({ ...prev, pinnedStaff: newPinned, staffList: newStaffList }));
    await handleSaveSettings({ ...appSettings, pinnedStaff: newPinned, staffList: newStaffList });
  };

  const handleRemoveStaff = async (name: string) => {
    if (!confirm(`${name} isimli personeli silmek istediğinize emin misiniz?`)) return;

    const currentPinned = appSettings.pinnedStaff || [];
    const newPinned = currentPinned.filter(p => p !== name);
    const currentStaffList = appSettings.staffList || [];
    const newStaffList = currentStaffList.filter(s => s.name !== name);

    await handleSaveSettings({
      ...appSettings,
      pinnedStaff: newPinned,
      staffList: newStaffList
    });
  };

  const handleTogglePinStaff = async (name: string) => {
    const currentPinned = appSettings.pinnedStaff || [];
    const newPinned = currentPinned.includes(name)
      ? currentPinned.filter(p => p !== name)
      : [...currentPinned, name];

    await handleSaveSettings({ ...appSettings, pinnedStaff: newPinned });
  };


  const handleSignOut = () => signOut(auth);

  // --- Render ---

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white">Yükleniyor...</div>;
  if (!user) return <Login />;

  if (permissionsLoading) {
    return <div className="h-screen bg-slate-900 flex items-center justify-center text-white flex-col gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <div>Yetkiler Kontrol Ediliyor...</div>
    </div>;
  }

  // Benzersiz Personel Listesi
  const registeredStaff = appSettings.staffList || [];
  const taskAssignees = [...tasks, ...routineTasks].map(t => t.assignee).filter(Boolean) as string[];
  const pinnedStaffNames = appSettings.pinnedStaff || [];
  const allNames = Array.from(new Set([...taskAssignees, ...pinnedStaffNames, ...registeredStaff.map(s => s.name)]));
  const allStaff: StaffMember[] = allNames.map(name => {
    const registered = registeredStaff.find(s => s.name === name);
    return registered || { name, email: '' }; // Kayıtlı değilse emailsiz döndür
  });

  const handleTabChange = (tab: string) => {
    if (tab === 'field_staff') {
      setIsFieldStaffModalOpen(true);
      return;
    }

    // RESET ALL FILTERS
    setBoardFilter(undefined);
    setIsMissingFilterActive(false);
    setIsPriorityFilter(false);

    setActiveTab(tab as any);
    if (tab === 'dashboard') {
      setViewMode('dashboard');
    } else if (tab === 'quotations') {
      setQuotationSubView('hub');
      setEditingQuotation(null);
    } else {
      setViewMode('board'); // Reset view mode for other tabs (like kanban)
    }
  };

  const handleDashboardNavigate = (status?: TaskStatus) => {
    setBoardFilter(status);
    setIsMissingFilterActive(false);
    setIsPriorityFilter(false);
    if (status === TaskStatus.CHECK_COMPLETED || status === TaskStatus.DEPOSIT_PAID) {
      setViewMode('split');
    } else {
      setViewMode('board');
    }
  };

  const handleDashboardNavigatePriority = () => {
    setBoardFilter(undefined);
    setIsMissingFilterActive(false);
    setIsPriorityFilter(true);
    setViewMode('split');
  };

  const handleFilterMissing = () => {
    setBoardFilter(undefined);
    setSearchTerm('');
    setIsMissingFilterActive(true);
    setViewMode('board');
  };

  // FiltrelemeLogic
  let visibleTasks: Task[] = tasks;

  // 1. Global Search Filter
  if (searchTerm) {
    const lower = searchTerm.toLocaleLowerCase('tr');
    visibleTasks = visibleTasks.filter(t =>
      t.title.toLocaleLowerCase('tr').includes(lower) ||
      (t.jobDescription && t.jobDescription.toLocaleLowerCase('tr').includes(lower)) ||
      (t.address && t.address.toLocaleLowerCase('tr').includes(lower)) ||
      (t.assignee && t.assignee.toLocaleLowerCase('tr').includes(lower)) ||
      (t.status && StatusLabels[t.status].toLocaleLowerCase('tr').includes(lower))
    );
  }

  // 1.5 Missing Filter (Specific)
  if (isMissingFilterActive) {
    visibleTasks = visibleTasks.filter(t => t.checkStatus === 'missing');
  }

  // 1.6 Priority Filter
  if (isPriorityFilter) {
    visibleTasks = visibleTasks.filter(t => t.isPriority);
  }

  // 2. Permission Filter
  let visibleRoutineTasks: RoutineTask[] = [];
  // FIX: Case-insensitive email check for Admin
  const normalizedEmail = user.email ? user.email.toLowerCase() : '';
  const isAdmin = normalizedEmail && ADMIN_EMAILS.includes(normalizedEmail);
  const isManager = userPermissions?.role === 'manager';
  const hasAdminAccess = isAdmin || isManager;

  console.log('DEBUG: User:', user.email);
  console.log('DEBUG: Is Admin:', isAdmin);
  console.log('DEBUG: Tasks Count:', tasks.length);
  console.log('DEBUG: User Permissions:', userPermissions);



  if (hasAdminAccess) {
    visibleRoutineTasks = routineTasks;
  } else if (!userPermissions) {
    visibleTasks = [];
    visibleRoutineTasks = [];
  } else {
    const myName = userPermissions.name;
    const myEmail = userPermissions.email;
    const canSeePool = userPermissions.canAccessRoutineTasks;
    const allowedColumns = userPermissions.allowedColumns || [];

    // Permission filter ALWAYS applies (even with search)
    visibleTasks = visibleTasks.filter(t => allowedColumns.includes(t.status));

    visibleRoutineTasks = routineTasks.filter(t => {
      const emailMatch = t.assigneeEmail && myEmail && t.assigneeEmail.toLowerCase() === myEmail.toLowerCase();
      const nameMatch = myName && t.assignee === myName;
      const isUnassigned = (!t.assignee || t.assignee.trim() === '') && !t.assigneeEmail;

      if (canSeePool && isUnassigned) return true;
      return emailMatch || nameMatch;
    });
  }


  // --- MATCH MOBILE LAYOUT FILTERING FOR DESKTOP SIDE PANEL ---
  const mobileLikeMyTasks = tasks.filter(t => {
    // 1. Assignment Match
    const emailMatch = t.assigneeEmail && user?.email && t.assigneeEmail.toLowerCase() === user.email.toLowerCase();
    const nameMatch = userPermissions?.name && t.assignee === userPermissions.name;
    if (!emailMatch && !nameMatch) return false;

    // 2. Status Filters (Hide CHECK_COMPLETED, Hide if checkStatus exists)
    if (t.status === TaskStatus.CHECK_COMPLETED) return false;
    if (t.checkStatus) return false;

    // 3. Date Filter (Hide Future)
    let taskDate: Date | null = null;
    if (t.scheduledDate) {
      taskDate = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
    } else if (t.date) {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) taskDate = d;
    }

    if (taskDate) {
      const today = new Date();
      taskDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (taskDate.getTime() > today.getTime()) return false; // Future -> Hide
    }

    return true;
  });

  let mobileLikeRoutineTasks = routineTasks.filter(t => {
    const emailMatch = t.assigneeEmail && user?.email && t.assigneeEmail.toLowerCase() === user.email.toLowerCase();
    const nameMatch = userPermissions?.name && t.assignee === userPermissions.name;
    const isUnassigned = (!t.assignee || t.assignee.trim() === '') && !t.assigneeEmail;
    
    if (!hasAdminAccess && !isManager && !emailMatch && !nameMatch && !isUnassigned) {
      return false;
    }

    // 2. Date Filter
    let filterDate: Date | null = null;
    if (t.scheduledDate) {
      filterDate = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
    } else if (t.createdAt) {
      // Legacy Schedule check logic from MobileLayout
      const d = new Date(t.createdAt.seconds ? t.createdAt.seconds * 1000 : t.createdAt);
      const today = new Date();
      d.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (d.getTime() > today.getTime()) return false; // Hide Future CreatedAt
    }

    if (filterDate) {
      const today = new Date();
      filterDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      // Show if Today or (Past AND Not Completed)
      if (filterDate.getTime() > today.getTime()) return false;
      if (filterDate.getTime() < today.getTime() && t.isCompleted) return false; // Hide Past Completed as per Mobile
    }

    return true;
  });

  if (isPriorityFilter) {
    mobileLikeRoutineTasks = mobileLikeRoutineTasks.filter(t => t.isPriority);
  }

  // RETURN RENDER
  const uniqueUsers = (() => {
    const allEmails = new Set<string>();
    registeredStaff.forEach(s => s.email && allEmails.add(s.email));
    tasks.forEach(t => t.assigneeEmail && allEmails.add(t.assigneeEmail));
    routineTasks.forEach(t => t.assigneeEmail && allEmails.add(t.assigneeEmail));
    return Array.from(allEmails).filter(Boolean);
  })();

  if (isMobile) {
    return <>
      <MobileLayout
        user={user}
        userPermissions={userPermissions}
        tasks={tasks}
        routineTasks={routineTasks}
        staffList={registeredStaff}
        onSignOut={handleSignOut}
        onTaskClick={handleTaskClick}
        onAddTask={handleAddTaskClick}
        onToggleRoutineTask={handleToggleRoutineTask}
        onTaskUpdate={handleQuickUpdateTask}
        onOpenAdmin={() => setIsAdminPanelOpen(true)}
        onOpenRoutineModal={() => setActiveTab('routine_pool')}
        onOpenAssignmentModal={() => setActiveTab('assignment')}
      />

      {isAdminPanelOpen && (
        <MobileAdminPanel
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          initialSettings={appSettings}
          onSaveSettings={handleSaveSettings}
          users={uniqueUsers}
          tasks={tasks}
          routineTasks={routineTasks}
          onTasksUpdate={setTasks}
        />
      )}

      {activeTab === 'routine_pool' && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-slate-50">
            <h2 className="font-bold text-lg">Eksikler Havuzu</h2>
            <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-slate-200 rounded-full"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <RoutineTasksView
              tasks={routineTasks}
              staffList={registeredStaff}
              onAddTask={handleAddRoutineTask}
              onToggleTask={handleToggleRoutineTask}
              onDeleteTask={handleDeleteRoutineTask}
              onConvertTask={handleConvertRoutineTask}
              onUpdateTask={handleUpdateRoutineTask}
            />
          </div>
        </div>
      )}

      {activeTab === 'assignment' && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-slate-50">
            <h2 className="font-bold text-lg">Görev Dağıtımı</h2>
            <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-slate-200 rounded-full"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AssignmentView
              tasks={tasks}
              routineTasks={routineTasks}
              onAssignTask={handleAssignTask}
              onAssignRoutineTask={handleAssignRoutineTask}
              staffList={registeredStaff}
              pinnedStaff={appSettings.pinnedStaff || []}
              onAddStaff={handleAddStaff}
              onRemoveStaff={handleRemoveStaff}
              onTogglePinStaff={handleTogglePinStaff}
              onReorderTasks={handleReorderDailyTasks}
              onAddRoutineTask={handleAddRoutineTask}
            />
          </div>
        </div>
      )}



      {isModalOpen && (
        <TaskModal
          task={selectedTask}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={selectedTask ? () => handleDeleteTask(selectedTask.id) : undefined}
          isOpen={isModalOpen}
          nextOrderNumber={tasks.length + 1}
          isAdmin={!!isAdmin}
          existingTasks={tasks}
        />
      )}


    </>;
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-transparent text-slate-100' : 'bg-transparent text-slate-800'} font-sans selection:bg-blue-500/30 overflow-hidden transition-colors duration-500`}>
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isAdmin={!!hasAdminAccess}
        onLogout={handleSignOut}
        userPermissions={userPermissions}
        isDarkMode={isDarkMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 transition-all duration-300">



        <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-transparent relative">
          {((activeTab as string) === 'assignment' || (activeTab as string) === 'routine_pool' || (activeTab as string).startsWith('stock_') || activeTab === 'quotations') ? (
            <>
              {activeTab === 'assignment' && (
                <div className="relative h-full bg-white">
                  <button onClick={() => setActiveTab('dashboard' as any)} className="absolute top-4 right-4 z-50 p-2 bg-white/50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                  <AssignmentView
                    tasks={tasks}
                    routineTasks={routineTasks}
                    onAssignTask={handleAssignTask}
                    onAssignRoutineTask={handleAssignRoutineTask}
                    staffList={registeredStaff}
                    pinnedStaff={appSettings.pinnedStaff || []}
                    onAddStaff={handleAddStaff}
                    onRemoveStaff={handleRemoveStaff}
                    onTogglePinStaff={handleTogglePinStaff}
                    onReorderTasks={handleReorderDailyTasks}
                    onAddRoutineTask={handleAddRoutineTask}
                  />
                </div>
              )}
              {activeTab === 'routine_pool' && (
                <div className="relative h-full bg-white">
                  <button onClick={() => setActiveTab('dashboard' as any)} className="absolute top-4 right-4 z-50 p-2 bg-white/50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                  <RoutineTasksView
                    tasks={routineTasks}
                    staffList={registeredStaff}
                    onAddTask={handleAddRoutineTask}
                    onToggleTask={handleToggleRoutineTask}
                    onDeleteTask={handleDeleteRoutineTask}
                    onConvertTask={handleConvertRoutineTask}
                    onUpdateTask={handleUpdateRoutineTask}
                  />
                </div>
              )}
              {activeTab === 'stock_radiators' && (
                <div className="relative h-full bg-white">
                  <StockRadiatorsView />
                </div>
              )}
              {activeTab === 'stock_combis' && (
                <div className="relative h-full bg-white">
                  <StockCombisView />
                </div>
              )}
              {/* GENERIC STOCK VIEWS */}
              {(activeTab as string) === 'stock_heatpumps' && (
                <div className="relative h-full bg-white">
                  <StockGenericView collectionName="stock_heatpumps" title="Isı Pompası Stok" itemLabel="Isı Pompası" />
                </div>
              )}
              {(activeTab as string) === 'stock_thermosiphons' && (
                <div className="relative h-full bg-white">
                  <StockGenericView collectionName="stock_thermosiphons" title="Termosifon Stok" itemLabel="Termosifon" />
                </div>
              )}
              {(activeTab as string) === 'stock_acs' && (
                <div className="relative h-full bg-white">
                  <StockGenericView collectionName="stock_acs" title="Klima Stok" itemLabel="Klima" />
                </div>
              )}
              {(activeTab as string) === 'stock_electric_combis' && (
                <div className="relative h-full bg-white">
                  <StockGenericView collectionName="stock_electric_combis" title="Elektrikli Kombi Stok" itemLabel="Elektrikli Kombi" />
                </div>
              )}
              {(activeTab as string) === 'stock_instant_heaters' && (
                <div className="relative h-full bg-white">
                  <StockGenericView collectionName="stock_instant_heaters" title="DDEİ (Ani Isıtıcı) Stok" itemLabel="Ani Isıtıcı" />
                </div>
              )}
              {(activeTab as string) === 'stock_others' && (
                <div className="relative h-full bg-white">
                  <StockGenericView collectionName="stock_others" title="Diğer Stoklar" itemLabel="Ürün" />
                </div>
              )}
              {activeTab === 'quotations' && (
                <div className="relative flex-1 bg-slate-100 overflow-y-auto flex flex-col">
                  {editingQuotation || quotationSubView === 'prepare' ? (
                    <QuotationApp
                      currentUserEmail={user?.email || ''}
                      currentUserName={userPermissions?.name || user?.email || ''}
                      onClose={() => { setEditingQuotation(null); setQuotationSubView('hub'); }}
                      initialData={editingQuotation?.data}
                      quotationId={editingQuotation?.id}
                    />
                  ) : quotationSubView === 'list' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <QuotationsListView
                        currentUserEmail={user?.email || ''}
                        isAdmin={!!isAdmin}
                        onClose={() => setQuotationSubView('hub')}
                        onEdit={(quotation) => {
                          setEditingQuotation({ data: quotation.data, id: quotation.id });
                        }}
                      />
                    </div>
                  ) : (
                    /* HUB VIEW - Compact & Top-Left Aligned */
                    <div className="flex-1 flex flex-col p-8 bg-slate-50 overflow-y-auto">
                      <div className="max-w-5xl w-full">
                        <div className="flex items-center gap-3 mb-8 border-b pb-4">
                          <FileText className="w-6 h-6 text-slate-400" />
                          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Teklif Yönetimi</h1>
                        </div>
                        
                        <div className="flex flex-wrap gap-6">
                          {/* Hazırla Kartı - Orta Boy */}
                          <button 
                            onClick={() => setQuotationSubView('prepare')}
                            className="group bg-white p-6 w-80 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 text-left flex flex-col gap-4"
                          >
                            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                              <FileText className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-800">Yeni Teklif Hazırla</h3>
                              <p className="text-slate-500 text-xs leading-relaxed mt-1">Hızlıca profesyonel bir teklif oluşturun.</p>
                            </div>
                            <div className="mt-2 flex items-center text-orange-600 text-xs font-bold gap-2">
                              Başlat <ChevronRight className="w-4 h-4" />
                            </div>
                          </button>

                          {/* Liste Kartı - Orta Boy */}
                          <button 
                            onClick={() => setQuotationSubView('list')}
                            className="group bg-white p-6 w-80 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 text-left flex flex-col gap-4"
                          >
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                              <FolderOpen className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-800">Hazırlanan Teklifler</h3>
                              <p className="text-slate-500 text-xs leading-relaxed mt-1">Geçmiş teklifleri görün ve düzenleyin.</p>
                            </div>
                            <div className="mt-2 flex items-center text-blue-600 text-xs font-bold gap-2">
                              Arşivi Aç <ChevronRight className="w-4 h-4" />
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Global Toolbar */}
              <div className={`px-6 py-2 flex items-center justify-between shrink-0 z-10 w-full transition-colors duration-500 bg-transparent border-transparent shadow-none ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                <div className="flex items-center gap-4">
                  <div>
                    {/* <h1 className="font-bold text-lg tracking-tight text-white">ONAY MÜHENDİSLİK</h1> */}
                  </div>
                </div>

                <div className="flex-1 max-w-md mx-6 flex justify-end">
                  {/* Search Bar remains here */}
                  <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm shadow-sm"
                      placeholder="Müşteri Ara..."
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <ServiceRedirectDropdown isDarkMode={isDarkMode} />

                  {/* Theme Toggle */}
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`p-2 rounded-full border transition-colors shadow-sm ${isDarkMode ? 'border-white/20 hover:bg-white/10 text-white' : 'border-slate-300 hover:bg-slate-200 text-slate-700'}`}
                    title={isDarkMode ? "Aydınlık Moda Geç" : "Karanlık Moda Geç"}
                  >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>

                  {/* Animated Close Button for Sub-views */}
                  {activeTab === 'dashboard' && viewMode !== 'dashboard' && (
                    <button
                      onClick={() => {
                        setViewMode('dashboard');
                        setBoardFilter(undefined);
                        setIsMissingFilterActive(false);
                        setIsPriorityFilter(false);
                      }}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white p-2 rounded-full transition-all hover:rotate-90 border border-slate-600 shadow-sm"
                      title="Panele Dön"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  <TopBar
                    user={user}
                    userPermissions={userPermissions}
                    onOpenAdmin={() => setIsAdminPanelOpen(true)}
                    onLogout={handleLogout}
                    onOpenProfile={() => setIsProfileModalOpen(true)}
                    onOpenPassword={() => setIsPasswordModalOpen(true)}
                    variant={isDarkMode ? 'dark' : 'light'}
                  />
                </div>
              </div>

              {activeTab === 'assignment' ? (
                <AssignmentView
                  tasks={tasks}
                  routineTasks={routineTasks}
                  onAssignTask={handleAssignTask}
                  onAssignRoutineTask={handleAssignRoutineTask}
                  staffList={
                    userPermissions?.role === 'admin'
                      ? appSettings.staffList || []
                      : (appSettings.staffList || []).filter(s =>
                        (s.email && user?.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
                        (userPermissions?.name && s.name === userPermissions.name)
                      )
                  }
                  pinnedStaff={appSettings.pinnedStaff || []}
                  onAddStaff={(name, email) => {
                    const newList = [...(appSettings.staffList || []), { name, email }];
                    setAppSettings(prev => ({ ...prev, staffList: newList }));
                  }}
                  onRemoveStaff={(name) => {
                    const newList = (appSettings.staffList || []).filter(s => s.name !== name);
                    setAppSettings(prev => ({ ...prev, staffList: newList }));
                  }}
                  onTogglePinStaff={(name) => {
                    const currentPinned = appSettings.pinnedStaff || [];
                    const newPinned = currentPinned.includes(name)
                      ? currentPinned.filter(n => n !== name)
                      : [...currentPinned, name];
                    setAppSettings(prev => ({ ...prev, pinnedStaff: newPinned }));
                  }}
                  onReorderTasks={handleReorderDailyTasks}
                  onAddRoutineTask={handleAddRoutineTask}
                />
              ) : activeTab === 'routine_pool' ? (
                <RoutineTasksView
                  tasks={routineTasks}
                  staffList={registeredStaff}
                  onToggleTask={handleToggleRoutineTask}
                  onDeleteTask={handleDeleteRoutineTask}
                  onAddTask={handleAddRoutineTask}
                  onUpdateTask={handleUpdateRoutineTask}
                  onOpenAssignModal={(task) => {
                     setAssignRoutineModal({ isOpen: true, task });
                     setRoutineAssignStaff(task.assignee || '');
                     setRoutineAssignDate(new Date().toISOString().split('T')[0]);
                  }}
                  onConvertTask={async (taskId, targetStatus) => {
                    // Simple conversion implementation
                    const task = routineTasks.find(t => t.id === taskId);
                    if (!task) return;

                    // 1. Add to main tasks
                    const newTask = {
                      title: task.content,
                      status: targetStatus,
                      orderNumber: tasks.length + 1,
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                      createdBy: user?.email || 'System',
                      // Map other fields
                      customerName: task.customerName,
                      phone: task.phoneNumber,
                      address: task.address,
                      district: task.district,
                      city: task.city,
                      locationCoordinates: task.locationCoordinates
                    };
                    await addDoc(collection(db, 'tasks'), newTask);

                    // 2. Mark routine task as completed
                    await updateDoc(doc(db, 'routine_tasks', task.id), {
                      isCompleted: true,
                      completedAt: serverTimestamp()
                    });
                  }}
                />
              ) : activeTab === 'dashboard' && viewMode === 'dashboard' ? (
                <Dashboard
                  tasks={visibleTasks}
                  routineTasks={routineTasks}
                  onNavigate={handleDashboardNavigate}
                  onNavigatePriority={handleDashboardNavigatePriority}
                  onTaskClick={handleTaskClick}
                  onFilterMissing={handleFilterMissing}
                  onOpenRoutineModal={() => setActiveTab('routine_pool' as any)}
                  onOpenAssignmentModal={() => setActiveTab('assignment' as any)}
                  onOpenNewCustomerModal={handleAddTaskClick}
                  onOpenFieldStaffModal={() => setIsFieldStaffModalOpen(true)}
                  onOpenQuotationPrep={() => { setEditingQuotation(null); setActiveTab('quotations' as any); }}
                  onOpenQuotationList={() => setActiveTab('quotations' as any)}
                  currentUser={userPermissions ? { name: userPermissions.name, email: userPermissions.email } : undefined}
                  userRole={hasAdminAccess ? 'admin' : userPermissions?.role}
                  userPermissions={userPermissions}
                  isDarkMode={isDarkMode}
                />
              ) : (
                <div className="flex-1 flex flex-col min-w-0 bg-transparent h-full">
                  {viewMode === 'split' ? (
                    <div className="flex-1 flex overflow-hidden">
                      {isPriorityFilter ? (
                        <>
                          <div className="w-1/2 flex flex-col border-r border-slate-200 bg-yellow-50/30 min-w-0">
                            <div className="px-4 py-2 bg-yellow-100/50 border-b border-yellow-200 font-bold text-yellow-800 flex justify-between">
                              <span>⭐ Öncelikli Kişi Kartları</span>
                              <span className="bg-yellow-200 px-2 rounded-full text-xs flex items-center">{visibleTasks.length}</span>
                            </div>
                            <KanbanBoard
                              tasks={visibleTasks}
                              routineTasks={[]}
                              myTasks={[]}
                              onTaskClick={handleTaskClick}
                              onToggleRoutineTask={handleToggleRoutineTask}
                              visibleColumns={['MIXED' as any]}
                              showRoutineColumn={false}
                              staffName={userPermissions?.name}
                              isCompact={true}
                              staffList={registeredStaff}
                              onTaskUpdate={handleQuickUpdateTask}
                              onRoutineTaskUpdate={handleUpdateRoutineTask}
                              isDarkMode={isDarkMode}
                            />
                          </div>
                          <div className="w-1/2 flex flex-col bg-purple-50/30 min-w-0">
                            <div className="px-4 py-2 bg-purple-100/50 border-b border-purple-200 font-bold text-purple-800 flex justify-between">
                              <span>📋 Öncelikli Eksikler / Notlar</span>
                              <span className="bg-purple-200 px-2 rounded-full text-xs flex items-center">{mobileLikeRoutineTasks.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                              {/* Context Menu for Split Routine Tasks */}
                              {splitContextMenuState.visible && splitContextMenuState.task && (
                                <div 
                                    className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-[150] min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                                    style={{ top: splitContextMenuState.y, left: splitContextMenuState.x }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSplitContextMenuState(prev => ({ ...prev, visible: false }));
                                            setAssignRoutineModal({ isOpen: true, task: splitContextMenuState.task! });
                                            setRoutineAssignStaff(splitContextMenuState.task!.assignee || '');
                                            setRoutineAssignDate(new Date().toISOString().split('T')[0]);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 font-medium border-b border-slate-100"
                                    >
                                        <UserIcon className="w-4 h-4" />
                                        Görev Ata
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleUpdateRoutineTask(splitContextMenuState.task!.id, { isPriority: !splitContextMenuState.task!.isPriority });
                                            setSplitContextMenuState(prev => ({ ...prev, visible: false }));
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-yellow-50 hover:text-yellow-600 flex items-center gap-2 font-medium"
                                    >
                                        <Star className={`w-4 h-4 ${splitContextMenuState.task!.isPriority ? 'fill-current text-yellow-500' : ''}`} />
                                        {splitContextMenuState.task!.isPriority ? 'Öncelikli İşlerden Çıkar' : 'Öncelikli İşlere Ekle'}
                                    </button>
                                </div>
                              )}
                              
                              {mobileLikeRoutineTasks.length === 0 ? (
                                <div className="text-center text-slate-500 py-10 opacity-70 border-2 border-dashed border-purple-200 rounded-lg">Öncelikli eksik/not bulunamadı.</div>
                              ) : (
                                mobileLikeRoutineTasks.map(t => (
                                  <div key={t.id} onContextMenu={(e) => handleSplitContextMenu(e, t)} className={`flex items-start gap-3 p-3 rounded-xl shadow-sm border transition-all ${t.isCompleted ? 'bg-slate-100 border-slate-200 text-slate-500 opacity-60' : 'bg-white border-slate-200 hover:border-purple-300'}`}>
                                    <button onClick={() => handleToggleRoutineTask(t.id)} className={`mt-0.5 flex-shrink-0 transition-colors ${t.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}>
                                      {t.isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      {(t.customerName || t.phoneNumber || t.address) && (
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                                          {t.customerName && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100"><UserCircle className="w-3 h-3" /> {t.customerName}</span>}
                                          {t.phoneNumber && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100"><Phone className="w-3 h-3" /> {t.phoneNumber}</span>}
                                          {t.address && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100"><MapPin className="w-3 h-3" /> {t.address}</span>}
                                        </div>
                                      )}
                                      <div className={`text-sm break-words leading-relaxed whitespace-pre-wrap ${t.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {t.content}
                                      </div>
                                      
                                      {/* Assignment Display */}
                                      {!t.isCompleted && t.assignee && (
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[11px] bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100 flex items-center gap-1 font-medium">
                                                <UserIcon className="w-3 h-3" /> {t.assignee}
                                              </span>
                                            </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-1/2 flex flex-col border-r border-slate-200 bg-emerald-50/30 min-w-0">
                            <div className="px-4 py-2 bg-emerald-100/50 border-b border-emerald-200 font-bold text-emerald-800 flex justify-between">
                              <span>✅ Hazır / Sorunsuz İşler</span>
                              {/* IF CHECK_COMPLETED: Clean = Clean check AND Project Drawn. ELSE: Clean Check */}
                              <span className="bg-emerald-200 px-2 rounded-full text-xs flex items-center">{visibleTasks.filter(t => (!t.checkStatus || t.checkStatus === 'clean') && (boardFilter !== TaskStatus.CHECK_COMPLETED || t.isProjectDrawn)).length}</span>
                            </div>
                            <KanbanBoard
                              tasks={visibleTasks.filter(t => (!t.checkStatus || t.checkStatus === 'clean') && (boardFilter !== TaskStatus.CHECK_COMPLETED || t.isProjectDrawn))}
                              routineTasks={[]}
                              myTasks={[]}
                              onTaskClick={handleTaskClick}
                              onToggleRoutineTask={handleToggleRoutineTask}
                              visibleColumns={boardFilter ? [boardFilter] : undefined}
                              showRoutineColumn={false}
                              staffName={userPermissions?.name}
                              isCompact={true}
                              staffList={registeredStaff}
                              onTaskUpdate={handleQuickUpdateTask}
                              onRoutineTaskUpdate={handleUpdateRoutineTask}
                              isDarkMode={isDarkMode}
                            />
                          </div>
                          <div className="w-1/2 flex flex-col bg-red-50/30 min-w-0">
                            <div className="px-4 py-2 bg-red-100/50 border-b border-red-200 font-bold text-red-800 flex justify-between">
                              <span>⚠️ Eksiği Olan İşler {boardFilter === TaskStatus.CHECK_COMPLETED ? '(Proje/Kontrol)' : ''}</span>
                              {/* IF CHECK_COMPLETED: Missing = Missing Check OR Project NOT Drawn. ELSE: Missing Check */}
                              <span className="bg-red-200 px-2 rounded-full text-xs flex items-center">{visibleTasks.filter(t => t.checkStatus === 'missing' || (boardFilter === TaskStatus.CHECK_COMPLETED && !t.isProjectDrawn)).length}</span>
                            </div>
                            <KanbanBoard
                              tasks={visibleTasks.filter(t => t.checkStatus === 'missing' || (boardFilter === TaskStatus.CHECK_COMPLETED && !t.isProjectDrawn))}
                              routineTasks={[]}
                              myTasks={[]}
                              onTaskClick={handleTaskClick}
                              onToggleRoutineTask={handleToggleRoutineTask}
                              visibleColumns={boardFilter ? [boardFilter] : undefined}
                              showRoutineColumn={false}
                              staffName={userPermissions?.name}
                              isCompact={true}
                              staffList={registeredStaff}
                              onTaskUpdate={handleQuickUpdateTask}
                              onRoutineTaskUpdate={handleUpdateRoutineTask}
                              isDarkMode={isDarkMode}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <KanbanBoard
                      tasks={visibleTasks}
                      routineTasks={mobileLikeRoutineTasks}
                      myTasks={mobileLikeMyTasks}
                      onTaskClick={handleTaskClick}
                      onToggleRoutineTask={handleToggleRoutineTask}
                      visibleColumns={boardFilter ? [boardFilter] : (userPermissions?.allowedColumns)}
                      showRoutineColumn={false}
                      staffName={userPermissions?.name}
                      staffList={registeredStaff}
                      hideCreator={activeTab === 'archive'}
                      onTaskUpdate={handleQuickUpdateTask}
                      onRoutineTaskUpdate={handleUpdateRoutineTask}
                      isDarkMode={isDarkMode}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main >

      {isModalOpen && (
        <TaskModal
          task={selectedTask}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={selectedTask ? () => handleDeleteTask(selectedTask.id) : undefined}
          isOpen={isModalOpen}
          nextOrderNumber={tasks.length + 1}
          isAdmin={!!isAdmin}
          existingTasks={tasks}
        />
      )}




      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userPermissions={userPermissions}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Mobile Admin Panel */}
      <MobileAdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        initialSettings={appSettings}
        onSaveSettings={(newSettings) => setAppSettings(newSettings)}
        users={(appSettings.staffList || []).map(s => s.name)}
        routineTasks={routineTasks}
        tasks={tasks}
        onTasksUpdate={(newTasks) => setTasks(newTasks)}
      />

      {/* Field Staff Live Status Modal */}
      <FieldStaffStatusModal
        isOpen={isFieldStaffModalOpen}
        onClose={() => setIsFieldStaffModalOpen(false)}
        tasks={tasks}
        routineTasks={routineTasks}
        // If Admin, show all. If Staff, show only SELF.
        staffList={
          (hasAdminAccess || userPermissions?.role === 'admin')
            ? (appSettings.staffList || [])
            : (appSettings.staffList || []).filter(s =>
              (s.email && user?.email && s.email.toLowerCase() === user.email.toLowerCase())
            )
        }
        onUpdateTask={async (taskId, newStatus) => {
          await updateDoc(doc(db, 'tasks', taskId), {
            status: newStatus,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: user?.email || 'Admin',
            // If moving to COMPLETED, should we set activeDate?
            isCheckVerified: newStatus === TaskStatus.CHECK_COMPLETED
          });
        }}
        onToggleRoutineTask={async (taskId, currentStatus) => {
          await updateDoc(doc(db, 'routine_tasks', taskId), {
            isCompleted: !currentStatus,
            completedAt: !currentStatus ? serverTimestamp() : null
          });
        }}
        onTaskClick={(task) => {
          setSelectedTask(task);
          setIsModalOpen(true);
        }}
      />

      {/* Routine Assign Modal for Dashboard Split View */}
      {assignRoutineModal.isOpen && assignRoutineModal.task && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                Görevi Ustaya Ata
              </h3>
              <button onClick={() => setAssignRoutineModal({ isOpen: false, task: null })} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 bg-slate-100 p-3 rounded-lg border border-slate-200">
                <div className="text-xs font-bold text-slate-500 mb-1">Seçili Eksik/Not:</div>
                <div className="font-semibold text-slate-800">{assignRoutineModal.task.customerName || 'İsimsiz Müşteri'}</div>
                <div className="text-xs text-slate-600 mt-1 line-clamp-2">{assignRoutineModal.task.content}</div>
              </div>
              
              <form onSubmit={handleRoutineAssignSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Usta (Personel) Seçimi</label>
                  <select
                    value={routineAssignStaff}
                    onChange={(e) => setRoutineAssignStaff(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-500"
                  >
                    <option value="" disabled>Personel Seçin</option>
                    {registeredStaff?.map(staff => (
                      <option key={staff.email} value={staff.name}>{staff.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Atanacak Tarih</label>
                  <input
                    type="date"
                    value={routineAssignDate}
                    onChange={(e) => setRoutineAssignDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-500"
                  />
                </div>
                <button type="submit" disabled={!routineAssignStaff || !routineAssignDate} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2">
                  <UserIcon className="w-4 h-4" />
                  Görevi Ata
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}

export default App;

