/// <reference types="vite/client" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality } from '@google/genai';
import * as XLSX from 'xlsx';
import { Mic, MicOff, Layout, Plus, LogOut, Settings, Bell, X, Users, Menu } from 'lucide-react';
import KanbanBoard from './components/KanbanBoard';
import Visualizer from './components/Visualizer';
import TaskModal from './components/TaskModal';
import PinnedStaffSidebar from './components/PinnedStaffSidebar';
import RoutineTasksModal from './components/RoutineTasksModal';
import AssignmentModal from './components/AssignmentModal';

import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { Task, TaskStatus, AppSettings, StatusLabels, RoutineTask, UserPermission, StaffMember } from './types';
import { createPcmBlob, base64ToArrayBuffer, pcmToAudioBuffer } from './utils/audioUtils';
import { auth, db } from './src/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';

// Yöneticiler Listesi
const ADMIN_EMAILS = ['caner192@hotmail.com'];

// ... Tool Definitions ...

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routineTasks, setRoutineTasks] = useState<RoutineTask[]>([]); // Rutin İşler
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(null); // Kullanıcı İzinleri
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false); // Eksikler Modalı
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false); // Atama Modalı
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({ notifications: {}, pinnedStaff: [] });
  const [toast, setToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

  // Sidebar Toggle (Mobil için)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Settings Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as AppSettings;
        setAppSettings({
          notifications: data.notifications || {},
          pinnedStaff: data.pinnedStaff || []
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
          const targetEmails = appSettings.notifications?.[task.status] || [];

          if (targetEmails.length > 0) {
            console.log(`Bildirim gönderiliyor: ${targetEmails.join(', ')} -> ${task.title} - ${task.status}`);

            // Toast Bildirim
            setToast({
              message: `${task.title} işi "${StatusLabels[task.status]}" aşamasına geldi.`,
              visible: true
            });

            setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);

            // Eğer bu durum için bir bildirim ayarlanmışsa ve hedef bizsek
            if (targetEmails.includes(user.email || '')) {
              const message = `${task.title} - ${StatusLabels[task.status]} aşamasına geldi.`;
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
              setToast({ message, visible: true });
              setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e => console.log('Audio play failed', e));
              } catch (e) {
                console.log('Audio API error', e);
              }
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
      setIsAdminPanelOpen(false);
    } catch (e) {
      console.error("Error saving settings: ", e);
      setError("Ayarlar kaydedilemedi.");
    }
  };

  // Audio Refs & Gemini
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
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

    // Permissions (Eğer Admin değilse)
    let unsubPerm = () => { };
    const userEmail = user?.email; // Email'i al

    if (user && userEmail && !ADMIN_EMAILS.includes(userEmail)) {
      unsubPerm = onSnapshot(doc(db, 'permissions', userEmail), (doc) => {
        if (doc.exists()) {
          setUserPermissions(doc.data() as UserPermission);
        } else {
          // Varsayılan: Hiçbir şey göremez
          setUserPermissions({ email: userEmail, allowedColumns: [], role: 'staff' });
        }
      });
    } else if (user) {
      // Admin ise veya email yoksa (admin varsayalım veya kısıtlayalım? Şimdilik admin bloğunda)
      // Eğer email yoksa 'unknown' diyelim
      setUserPermissions({ email: userEmail || 'unknown', allowedColumns: Object.values(TaskStatus), role: 'admin' });
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
  const handleAddRoutineTask = async (content: string, assignee: string, customerName?: string, phoneNumber?: string, address?: string) => {
    try {
      await addDoc(collection(db, 'routine_tasks'), {
        content,
        assignee,
        customerName: customerName || '',
        phoneNumber: phoneNumber || '',
        address: address || '',
        isCompleted: false,
        createdAt: serverTimestamp(),
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

  // Handlers - Assignment & Staff
  const handleAssignTask = async (taskId: string, assignee: string, assigneeEmail?: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { assignee, assigneeEmail: assigneeEmail || null, lastUpdatedBy: user?.email });
    } catch (e) {
      console.error("Assign error:", e);
    }
  };

  const handleAssignRoutineTask = async (taskId: string, assignee: string, assigneeEmail?: string) => {
    try {
      const taskRef = doc(db, 'routine_tasks', taskId);
      await updateDoc(taskRef, { assignee, assigneeEmail: assigneeEmail || null });
    } catch (e) {
      console.error("Assign routine error:", e);
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

    await handleSaveSettings({ ...appSettings, pinnedStaff: newPinned, staffList: newStaffList });
  };

  const handleRemoveStaff = (name: string) => {
    // Pinned listesinden çıkar
    if (appSettings.pinnedStaff?.includes(name)) {
      handleTogglePinStaff(name);
    }
    // NOT: StaffList'ten tamamen silmiyoruz (veri kaybolmasın diye), sadece Pinned'dan düşürüyoruz.
    // İleride tam silme eklenebilir.
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

  // Benzersiz Personel Listesi (StaffMember Objesi Olarak)
  // 1. Settings'den gelen kayıtlı personel
  const registeredStaff = appSettings.staffList || [];

  // 2. Tasklarda geçen ama settings'de olmayan (eski kayıtlar) isimler
  // Bunlar için email 'unknown' veya boş olacak.
  const taskAssignees = [...tasks, ...routineTasks].map(t => t.assignee).filter(Boolean) as string[];
  const pinnedStaffNames = appSettings.pinnedStaff || [];

  const allNames = Array.from(new Set([...taskAssignees, ...pinnedStaffNames, ...registeredStaff.map(s => s.name)]));

  const allStaff: StaffMember[] = allNames.map(name => {
    const registered = registeredStaff.find(s => s.name === name);
    return registered || { name, email: '' }; // Kayıtlı değilse emailsiz döndür
  });

  // Filtreleme (Admin değilse sadece kendi işleri)
  // Eğer kullanıcı Admin değilse, tasks listesini filtreleyeceğiz

  // *** TEMPORARILY DISABLED FOR DEBUG - EVERYONE SEES EVERYTHING ***
  let visibleTasks = tasks; // Show all tasks to everyone
  let visibleRoutineTasks = routineTasks; // Show all routine tasks to everyone

  // Admin kontrolü (Email listesi)
  const isAdmin = user.email && ADMIN_EMAILS.includes(user.email);
  const isStaff = !isAdmin;

  /* DISABLED FILTERING - UNCOMMENT TO RE-ENABLE
  if (isStaff && user.email) {
    // Kullanıcının kayıtlı ismini bul (eğer varsa)
    const userStaffMember = registeredStaff.find(s => s.email === user.email);
    const userName = userStaffMember?.name;

    // Sadece bana atananlar (Email veya İsim eşleşmesi)
    visibleTasks = tasks.filter(t =>
      t.assigneeEmail === user.email ||
      (userName && t.assignee === userName)
    );
  }

  // Not: routineTasks için de aynısı geçerli.
  // Kullanıcının hem email'i hem de kayıtlı ismi ile eşleşen görevleri göster
  if (isStaff && user.email) {
    // Kullanıcının kayıtlı ismini bul (eğer varsa)
    const userStaffMember = registeredStaff.find(s => s.email === user.email);
    const userName = userStaffMember?.name;

    visibleRoutineTasks = routineTasks.filter(t => {
      // 1. E-posta eşleşmesi (varsa)
      const emailMatch = t.assigneeEmail && user.email && t.assigneeEmail.toLowerCase() === user.email.toLowerCase();
      // 2. İsim eşleşmesi (varsa - geriye dönük uyumluluk)
      const nameMatch = userName && t.assignee === userName;
      // 3. Havuz (Atanmamış)
      const isUnassigned = !t.assignee || t.assignee.trim() === '';
      // 4. Yetki kontrolü (Havuz erişimi)
      const hasPoolAccess = userPermissions?.canAccessRoutineTasks;

      return emailMatch || nameMatch || (isUnassigned && hasPoolAccess);
    });
  }
  */

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-6 shadow-lg z-10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle Button - Sadece Admin için */}
          {isAdmin && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="bg-blue-600 p-2 rounded-lg">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">ONAY MÜHENDİSLİK</h1>
            <p className="text-xs text-slate-400">İş Takip V2</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-800/50 rounded-full px-3 py-1.5 border border-slate-700/50 flex items-center gap-3">
            {!connected ? (
              <button
                onClick={connectToGemini}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                title="Sesli Asistanı Başlat"
              >
                <MicOff className="w-4 h-4" />
                <span className="text-sm font-medium">Asistan</span>
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors animate-pulse"
                title="Bağlantıyı Kes"
              >
                <Mic className="w-4 h-4" />
                <span className="text-sm font-medium">Dinliyor...</span>
              </button>
            )}
          </div>

          {user && ADMIN_EMAILS.includes(user.email || '') && (
            <button
              onClick={() => setIsAdminPanelOpen(true)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Yönetici Paneli"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Çıkış Yap"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* Sidebar (Pinned Staff) - Staff için her zaman açık, Admin için toggle edilebilir */}
        {(isStaff || isSidebarOpen) && (
          <PinnedStaffSidebar
            pinnedStaff={appSettings.pinnedStaff || []}
            tasks={visibleTasks}
            routineTasks={visibleRoutineTasks}
            onTaskClick={handleTaskClick}
            onToggleRoutineTask={handleToggleRoutineTask}
            onToggleTaskVerification={handleToggleTaskVerification}
            onUnpin={(name) => handleTogglePinStaff(name)}
            isAdmin={isAdmin}
          />
        )}

        {/* Board Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-slate-900 to-slate-800">
          {/* Toolbar */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/50">
            <h2 className="text-xl font-semibold text-slate-200">Günlük Operasyon</h2>

            <div className="flex items-center gap-3">
              {/* Eksikler Havuzu - Admin veya canAccessRoutineTasks */}
              {(isAdmin || userPermissions?.canAccessRoutineTasks) && (
                <button
                  onClick={() => setIsRoutineModalOpen(true)}
                  className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all border border-purple-600/30"
                >
                  <Bell className="w-4 h-4" />
                  Eksikler Havuzu
                  {routineTasks.filter(t => !t.isCompleted).length > 0 && (
                    <span className="bg-purple-600 text-white text-[10px] px-1.5 rounded-full">
                      {routineTasks.filter(t => !t.isCompleted).length}
                    </span>
                  )}
                </button>
              )}

              {/* Görev Dağıtımı - Admin veya canAccessAssignment */}
              {(isAdmin || userPermissions?.canAccessAssignment) && (
                <button
                  onClick={() => setIsAssignmentModalOpen(true)}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all border border-blue-600/30"
                >
                  <Users className="w-4 h-4" />
                  Görev Dağıtımı
                </button>
              )}

              {/* Müşteri Ekle - Admin veya canAddCustomers */}
              {(isAdmin || userPermissions?.canAddCustomers) && (
                <button
                  onClick={handleAddTaskClick}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-lg shadow-green-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Müşteri Ekle
                </button>
              )}
            </div>
          </div>

          {/* Kanban Board */}
          <KanbanBoard
            tasks={tasks}
            onTaskClick={handleTaskClick}
            visibleColumns={userPermissions?.allowedColumns}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="h-8 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-4 text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Sistem Aktif</span>
        </div>
        <div>
          Toplam İş: {tasks.length}
        </div>
      </footer>

      {/* Modals */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        task={selectedTask}
        nextOrderNumber={nextOrderNumber}
        isAdmin={user && ADMIN_EMAILS.includes(user.email || '')}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        onSaveSettings={handleSaveSettings}
        initialSettings={appSettings}
        users={allStaff.map(s => s.email).filter(Boolean) as string[]}
        tasks={tasks}
        onTasksUpdate={(newTasks) => setTasks(newTasks)}
      />

      <RoutineTasksModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        tasks={visibleRoutineTasks}
        onAddTask={handleAddRoutineTask}
        onToggleTask={handleToggleRoutineTask}
        onDeleteTask={handleDeleteRoutineTask}
      />

      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        tasks={tasks}
        routineTasks={routineTasks}
        onAssignTask={handleAssignTask}
        onAssignRoutineTask={handleAssignRoutineTask}
        staffList={allStaff}
        pinnedStaff={appSettings.pinnedStaff || []}
        onAddStaff={handleAddStaff}
        onRemoveStaff={handleRemoveStaff}
        onTogglePinStaff={handleTogglePinStaff}
      />

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-blue-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-slideIn z-50">
          <div className="bg-blue-500/20 p-2 rounded-full">
            <Bell className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-blue-400">Yeni Bildirim</h4>
            <p className="text-sm text-slate-200">{toast.message}</p>
          </div>
          <button onClick={() => setToast({ ...toast, visible: false })} className="text-slate-500 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}