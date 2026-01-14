import React from 'react';
import { resetAccount } from '../../core/state/onboardingState';

interface AccountSettingsOverlayProps {
    onClose: () => void;
}

const AccountSettingsOverlay = ({ onClose }: AccountSettingsOverlayProps) => {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-96 rounded-3xl bg-[#151517] border border-white/10 shadow-2xl p-6 relative animate-scale-in">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
                >
                    ✕
                </button>

                {/* Profile Placeholder */}
                <div className="flex flex-col items-center mb-8 mt-2">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4 text-2xl">
                        👤
                    </div>
                    <h2 className="text-white/90 text-lg font-medium">Local Builder</h2>
                    <p className="text-white/40 text-xs mt-1">Local Account</p>
                </div>

                {/* Account Actions */}
                <div className="border-t border-white/5 pt-6 space-y-4">
                    <button
                        onClick={() => {
                            if (confirm('Hard Reset: This will wipe all spaces and local data. Continue?')) {
                                resetAccount();
                            }
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors flex items-center justify-between group"
                    >
                        <span>Reset Account & Data</span>
                        <span className="opacity-50 group-hover:opacity-100">→</span>
                    </button>

                    <button className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors flex items-center justify-between group">
                        <span>Sign Out (Mock)</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountSettingsOverlay;
