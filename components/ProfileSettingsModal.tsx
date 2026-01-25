import React, { useState, useEffect } from 'react';
import { UserPermission } from '@/types';
import { db } from '@/src/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Phone, Mail, Shield, Save, X, AlertCircle } from 'lucide-react';

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userPermissions?: UserPermission | null;
}

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose, userPermissions }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState(''); // Not in type yet, but good to have prepared or custom field

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && userPermissions) {
            setName(userPermissions.name || '');
            // Phone logic needs extension or extra field if supported, otherwise just name for now
        }
    }, [isOpen, userPermissions]);

    const handleSave = async () => {
        if (!userPermissions?.email) return;

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const userRef = doc(db, 'permissions', userPermissions.email.toLowerCase());

            await updateDoc(userRef, {
                name: name.trim()
                // phone: phone // Future support
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1000);

        } catch (e: any) {
            console.error(e);
            setError('Profil güncellenemedi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !userPermissions) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">

                {/* Header */}
                <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors backdrop-blur-md">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="absolute -bottom-8 left-6">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-lg p-1">
                            <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-3xl font-bold text-slate-400">
                                {name.charAt(0).toUpperCase() || userPermissions.email.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 px-6 pb-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{name}</h2>
                        <span className="text-sm text-slate-500 font-medium">{userPermissions.email}</span>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-blue-100">
                                {userPermissions.role === 'admin' ? 'Yönetici' : 'Personel'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-100">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-green-100">
                                <i className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Değişiklikler kaydedildi!
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" /> Ad Soyad
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1 opacity-60 pointer-events-none grayscale">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" /> E-posta (Değiştirilemez)
                            </label>
                            <input
                                type="text"
                                value={userPermissions.email}
                                readOnly
                                className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-slate-500 font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProfileSettingsModal;
