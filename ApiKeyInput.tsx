
import React, { useState, useEffect } from 'react';
import { setCustomApiKey, getCustomApiKey } from '../geminiService';

export const ApiKeyInput: React.FC = () => {
    const [key, setKey] = useState('');
    const [hasKey, setHasKey] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const current = getCustomApiKey();
        if (current) {
            setHasKey(true);
            setKey(current);
        }
    }, []);

    const handleSave = () => {
        if (key.trim().length > 0) {
            setCustomApiKey(key.trim());
        }
    };

    const handleClear = () => {
        localStorage.removeItem('GEMINI_API_KEY');
        window.location.reload();
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 z-50 text-xs"
                title="Settings / API Key"
            >
                ⚙️ API Key
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full relative">
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>

                <h3 className="text-xl font-bold mb-4 text-gray-800">API Key Configuration</h3>

                <p className="text-sm text-gray-600 mb-4">
                    If the default key is hitting limits or not working, you can provide your own Google Gemini API Key here.
                    It will be saved in your browser's local storage.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                            Your Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            Save & Reload
                        </button>

                        {hasKey && (
                            <button
                                onClick={handleClear}
                                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="text-xs text-gray-400 text-center mt-2">
                        Status: {hasKey ? <span className="text-green-600 font-bold">● Custom Key Active</span> : <span className="text-blue-600 font-bold">● Using Default Key</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};
