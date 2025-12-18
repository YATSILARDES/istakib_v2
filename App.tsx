/// <reference types="vite/client" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Layout, Plus, LogOut, Settings, Bell, X, Users, Menu } from 'lucide-react';
import KanbanBoard from './components/KanbanBoard';
import Visualizer from './components/Visualizer';
import TaskModal from './components/TaskModal';
import PinnedStaffSidebar from './components/PinnedStaffSidebar';
import RoutineTasksModal from './components/RoutineTasksModal';
import AssignmentModal from './components/AssignmentModal';

import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import MobileLayout from './components/MobileLayout';
import MobileAdminPanel from './components/MobileAdminPanel';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

import { Task, TaskStatus, AppSettings, StatusLabels, RoutineTask, UserPermission, StaffMember } from './types';

import { playNotificationSound } from './utils/notification_sound';
import { auth, db } from './src/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging'; // NEW
import { messaging } from './src/firebase'; // NEW

// Yöneticiler Listesi
const ADMIN_EMAILS = ['caner192@hotmail.com'];

// ... Tool Definitions ...

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routineTasks, setRoutineTasks] = useState<RoutineTask[]>([]); // Rutin İşler
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(null); // Permission Logic

  // Responsive State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false); // Eksikler Modalı
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false); // Atama Modalı
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({ notifications: {}, pinnedStaff: [] });
  const [toast, setToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

  // Dashboard & Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'dashboard' | 'board'>('dashboard');
  const [boardFilter, setBoardFilter] = useState<TaskStatus | undefined>(undefined);

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
          staffList: data.staffList || [] // Include staffList!
        });
      }
    });
    return () => unsubscribe();
  }, []);  // ... (Rest of useEffects same as before) ...

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
          const assigneeEmail = task.assigneeEmail;

          // Combine and deduplicate
          const allTargetEmails = [...configuredEmails];
          // REMOVED: Assignee automatic inclusion. Now only explicitly configured users get notifications.
          // if (assigneeEmail && !allTargetEmails.includes(assigneeEmail)) {
          //   allTargetEmails.push(assigneeEmail);
          // }

          if (allTargetEmails.length > 0) {
            console.log(`Bildirim gönderiliyor (Config + Assignee): ${allTargetEmails.join(', ')} -> ${task.title} - ${task.status}`);

            // HERKES (veya admin) için genel bildirim yerine, SADECE ilgili kişiye bildirim gönderelim.
            // Önceki kodda herkese toast mesajı gösteriliyordu, bu yüzden admin de görüyordu.

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
            } else {
              // Hedef kişi DEĞİLSEK ama yöneticiysek yine de görelim mi? 
              // Kullanıcı isteğine göre: "Admin olarak bana hep geliyor" -> İstenen bu mu? 
              // Hayır, "atadığım kişiye gelmiyor" diyor. Demek ki asıl sorun diğer kişi.
              // Ama admin paneli açık olduğu için admin tüm değişiklikleri dinliyor.
              console.log('Bu bildirim benim için değil:', currentUserEmail);
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

  // Audio Refs & Gemini


  // Auth Listener & Notifications
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Notification Logic (Run only if user is logged in)
      if (currentUser) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('Notification permission granted.');

            if ('serviceWorker' in navigator) {
              const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
              console.log('Service Worker registered:', registration.scope);

              // Get Token with VAPID Key
              const token = await getToken(messaging, {
                vapidKey: "BAURdcxGoBuc1kI8ImEAu1epIqemw2Lg3zys-O4R9qg175P6l5ycnlGWMx84elDgQDgd8RNBISqdJm59s5mdSmY",
                serviceWorkerRegistration: registration
              });

              if (token) {
                console.log("FCM Token:", token);
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

    // Foreground Message Handler
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

    // Tasks
    const qTasks = query(collection(db, 'tasks'), orderBy('orderNumber', 'asc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const fetchedTasks: Task[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
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

    // PERMISSIONS LOGIC (NEW ROBUST SYSTEM)
    let unsubPerm = () => { };
    if (user && user.email) {
      if (ADMIN_EMAILS.includes(user.email)) {
        // Admin her zaman full yetkili
        setUserPermissions({
          email: user.email,
          name: 'Admin',
          role: 'admin',
          allowedColumns: Object.values(TaskStatus),
          canAccessRoutineTasks: true,
          canAccessAssignment: true,
          canAddCustomers: true
        });
      } else {
        // Staff için Firestore dinle
        const emailLower = user.email.toLowerCase();
        unsubPerm = onSnapshot(doc(db, 'permissions', emailLower), (docSnap) => {
          if (docSnap.exists()) {
            setUserPermissions(docSnap.data() as UserPermission);
          } else {
            // Kayıt yoksa hiçbir şeyi göremez
            setUserPermissions({
              email: emailLower,
              name: '',
              role: 'staff',
              allowedColumns: [], // Göremez
              canAccessRoutineTasks: false,
              canAccessAssignment: false,
              canAddCustomers: false
            });
          }
        });
      }
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
      // Tarih belirleme: Custom varsa onu kullan (saat 12:00 olsun ki gün karışmasın), yoksa ServerTimestamp
      let createdAtField = serverTimestamp();
      if (customDate) {
        const d = new Date(customDate);
        d.setHours(12, 0, 0, 0); // Öğlen 12'ye sabitle
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
        await updateDoc(taskRef, { isCompleted: !task.isCompleted });
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

      // 1. Yeni Task Oluştur
      await addDoc(collection(db, 'tasks'), {
        orderNumber: nextOrderNumber,
        title: routineTask.customerName || 'İsimsiz Müşteri',
        jobDescription: '', // Kullanıcı isteği: Eksik içeriği buraya GELMESİN
        description: '', // Kullanıcı isteği: Notlara da GELMESİN
        status: targetStatus,
        assignee: '', // Atamasız başlasın
        date: new Date().toISOString(),
        address: routineTask.address || '',
        locationCoordinates: routineTask.locationCoordinates || '',
        phone: routineTask.phoneNumber || '',
        generalNote: '',
        teamNote: '',
        checkStatus: null,
        gasOpeningDate: '',
        gasNote: '',
        serviceSerialNumber: '',
        serviceNote: '',
        createdBy: user?.email,
        createdAt: serverTimestamp()
      });

      // 2. Eski RoutineTask'i Sil
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
        // Set to noon to avoid timezone issues
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

      // NEW: Use dedicated scheduledDate field, preserve createdAt
      if (scheduledDate) {
        const d = new Date(scheduledDate);
        d.setHours(12, 0, 0, 0);
        updateData.scheduledDate = Timestamp.fromDate(d);
      } else {
        // If no date (e.g. unassigning date or standard assign assignment), should we clear it?
        // Standard 'Arrow' assignment usually implies "ASAP" or "Backlog".
        // If unscheduling (canceling), we might pass null?
        // For now, if scheduledDate is undefined, we simply don't update it, OR we should perhaps clear it if explicitly requested.
        // But the modal logic passes undefined for arrow click.
        // Let's assume standard assignment doesn't clear date unless explicitly needed.
        // Actually, if we want to "Clear" the date, we need to handle that.
        // The AssignmentModal passes '' and undefined to unassign.

        if (assignee === '') {
          // Unassigning user -> Clear Schedule too?
          updateData.scheduledDate = null; // Or deleteField()
          // Actually, let's keep it simple. If assigning to '', we are unassigning.
          // But if assigning to a user without a date, we might want to keep previous date OR clear it?
          // Safest is: If we explicitly want to set date, we pass date.
          // If we use standard arrow, we might not want to change the date if it's already set? 
          // Or does standard arrow mean "No Date"? 
          // User's context: "Takvime eklediğim tarihle".
          // If I drag/drop or use arrow, I might mean "Do it".
        }
      }

      await updateDoc(taskRef, updateData);
    } catch (e) {
      console.error("Assign routine task error:", e);
    }
  };

  const handleAddStaff = async (name: string, email: string) => {
    // Hem isme (Pinned için) hem de StaffList'e ekle
    const currentStaffList = appSettings.staffList || [];

    // Eğer aynı isimde yoksa ekle
    let newStaffList = currentStaffList;
    if (!currentStaffList.some(s => s.name === name)) {
      newStaffList = [...currentStaffList, { name, email }];
    }

    // Pinned listesine de ekle
    const currentPinned = appSettings.pinnedStaff || [];
    const newPinned = currentPinned.includes(name) ? currentPinned : [...currentPinned, name];

    // OPTIMISTIC UPDATE
    setAppSettings(prev => ({ ...prev, pinnedStaff: newPinned, staffList: newStaffList }));

    await handleSaveSettings({ ...appSettings, pinnedStaff: newPinned, staffList: newStaffList });
  };

  const handleRemoveStaff = async (name: string) => {
    if (!confirm(`${name} isimli personeli silmek istediğinize emin misiniz?`)) return;

    // 1. Pinned listesinden çıkar
    const currentPinned = appSettings.pinnedStaff || [];
    const newPinned = currentPinned.filter(p => p !== name);

    // 2. StaffList'ten çıkar
    const currentStaffList = appSettings.staffList || [];
    const newStaffList = currentStaffList.filter(s => s.name !== name);

    // 3. Ayarları kaydet
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


  // ... (Gemini Functions, SignOut, etc. same as before)
  const handleSignOut = () => signOut(auth);
  // Gemini Connection Logic (Same as before, collapsed for brevity)
  const connectToGemini = async () => { /* ... (Same code) ... */ };
  const disconnect = useCallback(() => { /* ... (Same code) ... */ }, []);

  // --- Render ---

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white">Yükleniyor...</div>;
  if (!user) return <Login />;

  // ... (Calculations logic same)
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
    setActiveTab(tab);
    if (tab === 'dashboard') {
      setViewMode('dashboard');
    }
  };

  const handleDashboardNavigate = (status?: TaskStatus) => {
    setBoardFilter(status);
    setViewMode('board');
  };

  const handleFilterMissing = () => {
    // setBoardFilter(undefined); // Missing filter logic needed? 
    // KanbanBoard doesn't support 'missing' prop directly yet, but we can filter visibleTasks.
    // For now, let's just switch to board.
    setViewMode('board');
    // TODO: Implement specific 'missing' filter in KanbanBoard or filter 'visibleTasks' here.
  };

  // FiltrelemeLogic
  let visibleTasks: Task[] = [];
  let visibleRoutineTasks: RoutineTask[] = [];
  const isAdmin = user.email && ADMIN_EMAILS.includes(user.email);
  const isManager = userPermissions?.role === 'manager';
  const hasAdminAccess = isAdmin || isManager;

  if (hasAdminAccess) {
    visibleTasks = tasks;
    visibleRoutineTasks = routineTasks;
  } else if (!userPermissions) {
    visibleTasks = [];
    visibleRoutineTasks = [];
  } else {
    const myName = userPermissions.name;
    const myEmail = userPermissions.email;
    const canSeePool = userPermissions.canAccessRoutineTasks;
    const allowedColumns = userPermissions.allowedColumns || [];
    visibleTasks = tasks.filter(t => allowedColumns.includes(t.status));
    visibleRoutineTasks = routineTasks.filter(t => {
      const emailMatch = t.assigneeEmail && myEmail && t.assigneeEmail.toLowerCase() === myEmail.toLowerCase();
      const nameMatch = myName && t.assignee === myName;
      const isUnassigned = (!t.assignee || t.assignee.trim() === '') && !t.assigneeEmail;
      return emailMatch || nameMatch;
    });
  }

  // RETURN RENDER
  // Pre-calculate users for Admin Panels (Mobile & Desktop)
  const uniqueUsers = (() => {
    const allEmails = new Set<string>();
    registeredStaff.forEach(s => s.email && allEmails.add(s.email));
    tasks.forEach(t => t.assigneeEmail && allEmails.add(t.assigneeEmail));
    routineTasks.forEach(t => t.assigneeEmail && allEmails.add(t.assigneeEmail));
    return Array.from(allEmails).filter(Boolean);
  })();

  if (isMobile) {

    return (
      <>
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
          onOpenRoutineModal={() => setIsRoutineModalOpen(true)}
          onOpenAssignmentModal={() => setIsAssignmentModalOpen(true)}
        />

        {/* Mobile Admin Panel */}
        {isAdminPanelOpen && (
          <MobileAdminPanel
            isOpen={isAdminPanelOpen}
            onClose={() => setIsAdminPanelOpen(false)}
            initialSettings={appSettings}
            onSaveSettings={handleSaveSettings}
            users={uniqueUsers}
            tasks={tasks}
            onTasksUpdate={setTasks}
          />
        )}

        {/* Shared Modals for Mobile */}
        {isRoutineModalOpen && (
          <RoutineTasksModal
            isOpen={isRoutineModalOpen}
            onClose={() => setIsRoutineModalOpen(false)}
            tasks={routineTasks}
            onAddTask={handleAddRoutineTask}
            onToggleTask={handleToggleRoutineTask}
            onDeleteTask={handleDeleteRoutineTask}
            onConvertTask={handleConvertRoutineTask}
            onUpdateTask={handleUpdateRoutineTask}
          />
        )}

        {isAssignmentModalOpen && (
          <AssignmentModal
            isOpen={isAssignmentModalOpen}
            onClose={() => setIsAssignmentModalOpen(false)}
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
        )}

        {/* Modals for Mobile */}
        {isModalOpen && (
          <TaskModal
            task={selectedTask}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveTask}
            onDelete={selectedTask ? () => handleDeleteTask(selectedTask.id) : undefined}
            isOpen={isModalOpen}
            nextOrderNumber={tasks.length + 1}
            isAdmin={isAdmin}
            existingTasks={tasks}
          />
        )}


        {/* DEVELOPMENT MODE INDICATOR */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-lg z-[9999] pointer-events-none border border-red-400 flex items-center gap-2">
          <span>🛠️ GELİŞTİRME MODU</span>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-500/30 overflow-hidden">

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isAdmin={hasAdminAccess}
        onLogout={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 transition-all duration-300">

        {/* DEVELOPMENT MODE INDICATOR (Keeping it) */}
        <div className="fixed bottom-4 right-4 bg-red-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-lg z-[9999] pointer-events-none border border-red-400 flex items-center gap-2">
          <span>🛠️ GELİŞTİRME MODU</span>
        </div>

        {/* Content Render Logic */}
        {activeTab === 'dashboard' && viewMode === 'dashboard' ? (
          <Dashboard
            tasks={visibleTasks} // Pass permissions-filtered tasks
            onNavigate={handleDashboardNavigate}
            onTaskClick={handleTaskClick}
            onFilterMissing={handleFilterMissing}
          />
        ) : (
          /* Kanban Board View */
          <div className="flex-1 flex flex-col min-w-0 bg-transparent h-full">
            {/* Toolbar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm shrink-0 z-10">
              <div className="flex items-center gap-4">
                {activeTab === 'dashboard' && (
                  <button
                    onClick={() => setViewMode('dashboard')}
                    className="text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-1"
                  >
                    <Layout className="w-4 h-4" /> Panel'e Dön
                  </button>
                )}
                <div className="h-4 w-px bg-slate-300 mx-2" />
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  Günlük Operasyon
                  <span className="text-xs text-red-500 font-bold border border-red-500 px-1 rounded">(V3.0 YENİ)</span>
                  {userPermissions && (
                    <span className="text-[10px] text-slate-500 px-1 border border-slate-700 rounded">
                      {userPermissions.role === 'admin' ? 'ADMIN' : (userPermissions.role === 'manager' ? 'YÖNETİCİ' : `STAFF: ${userPermissions.name}`)}
                    </span>
                  )}
                </h2>

                <div className="flex items-center gap-3">
                  {/* Eksikler Havuzu - Admin veya Yetkili */}
                  {(isAdmin || userPermissions?.canAccessRoutineTasks) && (
                    <button
                      onClick={() => setIsRoutineModalOpen(true)}
                      className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all border border-purple-600/30"
                    >
                      <Bell className="w-4 h-4" />
                      Eksikler Havuzu ({(hasAdminAccess || userPermissions?.canAccessRoutineTasks)
                        ? routineTasks.filter(t => !t.isCompleted).length
                        : visibleRoutineTasks.filter(t => !t.isCompleted).length})
                      {/* Badge mantığı: Admin/Havuz yetkilisi tümünü görür, diğerleri sadece kendisininkini */}
                    </button>
                  )}

                  {/* Görev Dağıtımı - Admin veya Yetkili */}
                  {(hasAdminAccess || userPermissions?.canAccessAssignment) && (
                    <button
                      onClick={() => setIsAssignmentModalOpen(true)}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all border border-blue-600/30"
                    >
                      <Users className="w-4 h-4" />
                      Görev Dağıtımı
                    </button>
                  )}

                  {/* Müşteri Ekle - Admin veya Yetkili */}
                  {(hasAdminAccess || userPermissions?.canAddCustomers) && (
                    <button
                      onClick={handleAddTaskClick}
                      className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20"
                    >
                      <Plus className="w-4 h-4" />
                      Yeni Müşteri
                    </button>
                  )}
                </div>
              </div>

              {/* Kanban Board */}
              <KanbanBoard
                tasks={visibleTasks} // Filtrelenmiş görevler (Board Sütunları için)
                routineTasks={visibleRoutineTasks} // Personel Eksik Listesi (Staff için)
                myTasks={!hasAdminAccess && userPermissions ? tasks.filter(t => t.assignee && userPermissions.name && t.assignee.toLocaleLowerCase('tr').trim() === userPermissions.name.toLocaleLowerCase('tr').trim() && t.status !== TaskStatus.CHECK_COMPLETED) : []} // Personel Kendi Standart İşleri
                onTaskClick={handleTaskClick}
                onToggleRoutineTask={handleToggleRoutineTask}
                visibleColumns={userPermissions?.allowedColumns} // Sütun görünürlüğü
                showRoutineColumn={!hasAdminAccess} // Admin/Manager için bu sütunu gizle
                staffName={userPermissions?.name} // [NEW] Sütun başlığı için isim
              />
            </div>
        )}
          </main>

      {/* Modals */}
        {isModalOpen && (
          <TaskModal
            task={selectedTask}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveTask}
            onDelete={selectedTask ? () => handleDeleteTask(selectedTask.id) : undefined}
            isOpen={isModalOpen}
            nextOrderNumber={tasks.length + 1}
            isAdmin={isAdmin}
            existingTasks={tasks}
          />
        )}

        {isRoutineModalOpen && (
          <RoutineTasksModal
            isOpen={isRoutineModalOpen}
            onClose={() => setIsRoutineModalOpen(false)}
            tasks={routineTasks}
            onAddTask={handleAddRoutineTask}
            onToggleTask={handleToggleRoutineTask}
            onDeleteTask={handleDeleteRoutineTask}
            onConvertTask={handleConvertRoutineTask}
            onUpdateTask={handleUpdateRoutineTask}
          />
        )}

        {isAssignmentModalOpen && (
          <AssignmentModal
            isOpen={isAssignmentModalOpen}
            onClose={() => setIsAssignmentModalOpen(false)}
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
        )}

        {/* Admin Panel Modal */}
        <AdminPanel
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          initialSettings={appSettings}
          onSaveSettings={handleSaveSettings}
          users={(() => {
            const allEmails = new Set<string>();
            registeredStaff.forEach(s => s.email && allEmails.add(s.email));
            tasks.forEach(t => t.assigneeEmail && allEmails.add(t.assigneeEmail));
            routineTasks.forEach(t => t.assigneeEmail && allEmails.add(t.assigneeEmail));
            const uniqueUsers = Array.from(allEmails).filter(Boolean);
            console.log("AdminPanel Users List:", uniqueUsers);
            return uniqueUsers;
            return uniqueUsers;
          })()}
          tasks={tasks}
          routineTasks={routineTasks}
          onTasksUpdate={setTasks}
        />

        {/* Toast Notification */}
        {toast.visible && (
          <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 z-50 animate-slide-up">
            <div className="bg-emerald-500/10 p-2 rounded-full">
              <Bell className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast({ ...toast, visible: false })} className="text-slate-500 hover:text-white ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
    </div>
  );
}
