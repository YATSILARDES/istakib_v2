/// <reference types="vite/client" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Layout, Plus, LogOut, Settings, Bell, X, Users, Menu, Loader2 } from 'lucide-react';
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

// NEW VIEWS
import AssignmentView from './components/AssignmentView';
import RoutineTasksView from './components/RoutineTasksView';

import { Task, TaskStatus, AppSettings, StatusLabels, RoutineTask, UserPermission, StaffMember } from './types';

import { playNotificationSound } from './utils/notification_sound';
import { auth, db } from './src/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({ notifications: {}, pinnedStaff: [] });
  const [toast, setToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

  // Dashboard & Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kanban' | 'assignment' | 'routine_pool'>('dashboard');
  const [viewMode, setViewMode] = useState<'dashboard' | 'board' | 'split'>('dashboard');
  const [boardFilter, setBoardFilter] = useState<TaskStatus | undefined>(undefined);
  const [isMissingFilterActive, setIsMissingFilterActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // NEW: Global Search

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
              const message = `🔔 ${task.title}: ${StatusLabels[task.status]} aşamasına geldi.`;

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
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            if ('serviceWorker' in navigator) {
              const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

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
        } catch (error) {
          console.error('Notification setup error:', error);
        }
      }
    });

    onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      setToast({ message: payload.notification?.title || 'Yeni Bildirim', visible: true });
      playNotificationSound();
    });

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
          canAddCustomers: true
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
      setIsModalOpen(false);
    } catch (e) {
      console.error("Error saving task: ", e);
      setError("Kayıt sırasında hata oluştu.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setIsModalOpen(false);
    } catch (e) {
      console.error("Error deleting task: ", e);
      setError("Silme sırasında hata oluştu.");
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
  const handleAddRoutineTask = async (content: string, assignee: string, customerName?: string, phoneNumber?: string, address?: string, locationCoordinates?: string, district?: string, city?: string, customDate?: string) => {
    try {
      let createdAtField = serverTimestamp();
      if (customDate) {
        const d = new Date(customDate);
        d.setHours(12, 0, 0, 0);
        createdAtField = Timestamp.fromDate(d);
      }

      await addDoc(collection(db, 'routine_tasks'), {
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
        createdBy: user?.email
      });
    } catch (e) {
      console.error("Routine task error:", e);
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
  const handleAssignTask = async (taskId: string, assignee: string, assigneeEmail?: string, scheduledDate?: Date) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const updateData: any = { assignee, assigneeEmail: assigneeEmail || null, lastUpdatedBy: user?.email };

      if (scheduledDate) {
        const d = new Date(scheduledDate);
        d.setHours(12, 0, 0, 0);
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
        d.setHours(12, 0, 0, 0);
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

  // Tab Switching Logic
  const handleTabChange = (tab: string) => {
    if (tab === 'settings') {
      setIsAdminPanelOpen(true);
      return;
    }
    setActiveTab(tab as any);
    if (tab === 'dashboard') {
      setViewMode('dashboard');
    }
  };

  const handleDashboardNavigate = (status?: TaskStatus) => {
    setBoardFilter(status);
    setIsMissingFilterActive(false);
    if (status === TaskStatus.CHECK_COMPLETED || status === TaskStatus.DEPOSIT_PAID) {
      setViewMode('split');
    } else {
      setViewMode('board');
    }
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
        onSignOut={handleSignOut}
        onTaskClick={handleTaskClick}
        onAddTask={handleAddTaskClick}
        onToggleRoutineTask={handleToggleRoutineTask}
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

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-lg z-[9999] pointer-events-none border border-red-400 flex items-center gap-2">
        <span>🛠️ GELİŞTİRME MODU</span>
      </div>
    </>;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isAdmin={!!hasAdminAccess}
        onLogout={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 transition-all duration-300">

        <div className="fixed bottom-4 right-4 bg-red-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-lg z-[9999] pointer-events-none border border-red-400 flex items-center gap-2">
          <span>🛠️ GELİŞTİRME MODU | Tasks: {tasks.length} | User: {user?.email} | Admin: {hasAdminAccess ? 'Yes' : 'No'} | Role: {userPermissions?.role || 'None'}</span>
        </div>

        <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-100 relative">
          {(activeTab === 'assignment' || activeTab === 'routine_pool') ? (
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
                  />
                </div>
              )}
              {activeTab === 'routine_pool' && (
                <div className="relative h-full bg-white">
                  <button onClick={() => setActiveTab('dashboard' as any)} className="absolute top-4 right-4 z-50 p-2 bg-white/50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                  <RoutineTasksView
                    tasks={routineTasks}
                    onAddTask={handleAddRoutineTask}
                    onToggleTask={handleToggleRoutineTask}
                    onDeleteTask={handleDeleteRoutineTask}
                    onConvertTask={handleConvertRoutineTask}
                    onUpdateTask={handleUpdateRoutineTask}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* Global Toolbar */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm shrink-0 z-10 w-full">
                <div className="flex items-center gap-4">
                  {activeTab === 'dashboard' && viewMode !== 'dashboard' && (
                    <button onClick={() => setViewMode('dashboard')} className="text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-1">
                      <Layout className="w-4 h-4" /> Panel'e Dön
                    </button>
                  )}
                  <div className="h-4 w-px bg-slate-300 mx-2" />
                  <div>
                    <h1 className="font-bold text-lg tracking-tight text-slate-800">ONAY MÜHENDİSLİK</h1>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">İş Takip V2</p>
                      <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">TEST ORTAMI</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-md mx-6 flex justify-end">
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
                  {(isAdmin || userPermissions?.canAccessRoutineTasks) && (
                    <button
                      onClick={() => setActiveTab('routine_pool' as any)}
                      className={`bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all border border-purple-200 ${(activeTab as string) === 'routine_pool' ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`}
                    >
                      <Bell className="w-4 h-4" />
                      Eksikler Havuzu ({(hasAdminAccess || userPermissions?.canAccessRoutineTasks) ? routineTasks.filter(t => !t.isCompleted).length : visibleRoutineTasks.filter(t => !t.isCompleted).length})
                    </button>
                  )}
                  {(hasAdminAccess || userPermissions?.canAccessAssignment) && (
                    <button
                      onClick={() => setActiveTab('assignment' as any)}
                      className={`bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all border border-blue-200 ${(activeTab as string) === 'assignment' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                    >
                      <Users className="w-4 h-4" />
                      Görev Dağıtımı
                    </button>
                  )}
                  {(hasAdminAccess || userPermissions?.canAddCustomers) && (
                    <button onClick={handleAddTaskClick} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20">
                      <Plus className="w-4 h-4" />
                      Yeni Müşteri
                    </button>
                  )}
                </div>
              </div>

              {activeTab === 'dashboard' && viewMode === 'dashboard' ? (
                <Dashboard
                  tasks={visibleTasks}
                  routineTasks={routineTasks}
                  onNavigate={handleDashboardNavigate}
                  onTaskClick={handleTaskClick}
                  onFilterMissing={handleFilterMissing}
                  onOpenRoutineModal={() => setActiveTab('routine_pool' as any)}
                  onOpenAssignmentModal={() => setActiveTab('assignment' as any)}
                  onOpenNewCustomerModal={handleAddTaskClick}
                />
              ) : (
                <div className="flex-1 flex flex-col min-w-0 bg-transparent h-full">
                  {viewMode === 'split' ? (
                    <div className="flex-1 flex overflow-hidden">
                      <div className="w-1/2 flex flex-col border-r border-slate-200 bg-emerald-50/30 min-w-0">
                        <div className="px-4 py-2 bg-emerald-100/50 border-b border-emerald-200 font-bold text-emerald-800 flex justify-between">
                          <span>✅ Hazır / Sorunsuz İşler</span>
                          <span className="bg-emerald-200 px-2 rounded-full text-xs flex items-center">{visibleTasks.filter(t => (!t.checkStatus || t.checkStatus === 'clean')).length}</span>
                        </div>
                        <KanbanBoard
                          tasks={visibleTasks.filter(t => (!t.checkStatus || t.checkStatus === 'clean'))}
                          routineTasks={[]}
                          myTasks={[]}
                          onTaskClick={handleTaskClick}
                          onToggleRoutineTask={handleToggleRoutineTask}
                          visibleColumns={boardFilter ? [boardFilter] : undefined}
                          showRoutineColumn={false}
                          staffName={userPermissions?.name}
                          isCompact={true}
                        />
                      </div>
                      <div className="w-1/2 flex flex-col bg-red-50/30 min-w-0">
                        <div className="px-4 py-2 bg-red-100/50 border-b border-red-200 font-bold text-red-800 flex justify-between">
                          <span>⚠️ Eksiği Olan İşler</span>
                          <span className="bg-red-200 px-2 rounded-full text-xs flex items-center">{visibleTasks.filter(t => t.checkStatus === 'missing').length}</span>
                        </div>
                        <KanbanBoard
                          tasks={visibleTasks.filter(t => t.checkStatus === 'missing')}
                          routineTasks={[]}
                          myTasks={[]}
                          onTaskClick={handleTaskClick}
                          onToggleRoutineTask={handleToggleRoutineTask}
                          visibleColumns={boardFilter ? [boardFilter] : undefined}
                          showRoutineColumn={false}
                          staffName={userPermissions?.name}
                          isCompact={true}
                        />
                      </div>
                    </div>
                  ) : (
                    <KanbanBoard
                      tasks={visibleTasks}
                      routineTasks={visibleRoutineTasks}
                      myTasks={[]}
                      onTaskClick={handleTaskClick}
                      onToggleRoutineTask={handleToggleRoutineTask}
                      visibleColumns={boardFilter ? [boardFilter] : (userPermissions?.allowedColumns)}
                      showRoutineColumn={!boardFilter && !hasAdminAccess}
                      staffName={userPermissions?.name}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

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

      {/* Admin Panel */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        initialSettings={appSettings}
        onSaveSettings={handleSaveSettings}
        users={uniqueUsers}
        tasks={tasks}
        routineTasks={routineTasks}
        onTasksUpdate={setTasks}
      />
    </div>
  );
}

export default App;
