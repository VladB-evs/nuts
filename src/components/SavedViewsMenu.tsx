import React, { useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { useIssues } from '../context/TicketContext';

/** Save the current filters and sort as a named view, and jump back to saved ones. */
export const SavedViewsMenu: React.FC = () => {
  const { savedViews, saveCurrentView, applyView, deleteSavedView } = useIssues();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    const ok = await saveCurrentView(name);
    setSaving(false);
    if (ok) {
      setName('');
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 font-mono text-[11px] cursor-pointer"
        title="Saved views"
      >
        <Bookmark className="w-3 h-3" />
        <span>Views{savedViews.length > 0 ? ` (${savedViews.length})` : ''}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 w-64 max-w-[calc(100vw-1.5rem)] bg-white border border-gray-200 rounded-lg shadow-xl z-40 text-xs animate-fade-in"
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          >
            <form onSubmit={save} className="p-2.5 border-b border-gray-200 space-y-1.5">
              <label className="block text-[11px] font-mono text-gray-500">Save the current filters &amp; sort</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My open P0s"
                  className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black"
                />
                <button
                  type="submit"
                  disabled={!name.trim() || saving}
                  className="px-2.5 py-1 bg-black text-white rounded font-medium disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </form>

            <div className="max-h-60 overflow-y-auto py-1">
              {savedViews.length === 0 ? (
                <p className="px-3 py-3 text-gray-400 font-mono text-[11px]">No saved views yet.</p>
              ) : (
                savedViews.map((v) => (
                  <div key={v.id} className="group flex items-center gap-1 px-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        applyView(v);
                        setOpen(false);
                      }}
                      className="flex-1 min-w-0 text-left px-1.5 py-1.5 rounded hover:bg-gray-100 truncate text-gray-800 cursor-pointer"
                    >
                      {v.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.confirm(`Delete the view "${v.name}"?`) && deleteSavedView(v.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded opacity-60 hover:opacity-100 cursor-pointer"
                      title="Delete view"
                      aria-label={`Delete view ${v.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
