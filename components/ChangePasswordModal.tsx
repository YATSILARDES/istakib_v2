import React, { useState } from 'react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/src/firebase';
import { Lock, Eye, EyeOff, Save, X, AlertCircle } from 'lucide-react';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Visibility States
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        setError(null);
        setSuccess(false);

        if (!newPassword || !confirmPassword || !currentPassword) {
            setError('Lütfen tüm alanları doldurunuz.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Yeni şifreler eşleşmiyor.');
            return;
        }

        if (newPassword.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user || !user.email) throw new Error("Kullanıcı oturumu bulunamadı.");

            // 1. Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. Update Password
            await updatePassword(user, newPassword);

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setSuccess(false);
            }, 1500);

        } catch (e: any) {
            console.error(e);
            if (e.code === 'auth/wrong-password') {
                setError('Mevcut şifreniz hatalı.');
            } else if (e.code === 'auth/too-many-requests') {
                setError('Çok fazla başarısız deneme. Lütfen bekleyin.');
            } else {
                setError('Şifre değiştirilemedi: ' + e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const InputField = ({
        label,
        value,
        setValue,
        show,
        setShow
    }: {
        label: string, value: string, setValue: (s: string) => void, show: boolean, setShow: (b: boolean) => void
    }) => (
        <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">{label}</label>
            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all pr-12"
                    placeholder="••••••"
                />
                <button
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
                    tabIndex={-1}
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-blue-500" />
                        Şifre Değiştir
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-100">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-green-100">
                            <i className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Şifreniz başarıyla güncellendi!
                        </div>
                    )}

                    <InputField
                        label="Mevcut Şifre"
                        value={currentPassword}
                        setValue={setCurrentPassword}
                        show={showCurrent}
                        setShow={setShowCurrent}
                    />

                    <div className="h-px bg-slate-100 my-2" />

                    <InputField
                        label="Yeni Şifre"
                        value={newPassword}
                        setValue={setNewPassword}
                        show={showNew}
                        setShow={setShowNew}
                    />

                    <InputField
                        label="Yeni Şifre (Tekrar)"
                        value={confirmPassword}
                        setValue={setConfirmPassword}
                        show={showConfirm}
                        setShow={setShowConfirm}
                    />
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-bold text-sm bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || success}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
