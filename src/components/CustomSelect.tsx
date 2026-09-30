import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeClass?: string;
  icon?: React.ReactNode;
  description?: string;
  subtext?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: 'xs' | 'sm' | 'md';
  searchable?: boolean;
  emptyMessage?: string;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  size = 'sm',
  searchable,
  emptyMessage = 'No matching options',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to SelectOption objects
  const normalizedOptions = useMemo<SelectOption[]>(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Current selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  // Should show search input? (If explicitly true or >= 8 options)
  const isSearchEnabled = searchable ?? normalizedOptions.length >= 8;

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!isSearchEnabled || !search.trim()) return normalizedOptions;
    const q = search.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(q))
    );
  }, [normalizedOptions, search, isSearchEnabled]);

  // Detect available viewport space to open upward if near bottom
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 230 && rect.top > 230) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
      if (isSearchEnabled && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 20);
      }
    } else {
      setSearch('');
    }
  }, [isOpen, isSearchEnabled]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Sizing styles
  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px]',
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
  }[size];

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className} ${isOpen ? 'z-40' : ''}`}
      id={id}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left bg-white border rounded font-mono transition-all duration-150 cursor-pointer shadow-2xs ${
          sizeClasses
        } ${
          isOpen
            ? 'border-black ring-1 ring-black bg-white'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        } ${
          disabled
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
            : 'text-gray-900'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {selectedOption?.icon && (
            <div className="shrink-0 flex items-center">{selectedOption.icon}</div>
          )}
          <span className="truncate font-sans font-medium text-gray-900">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={`font-mono text-[9px] px-1 py-0.2 rounded border shrink-0 ${
                selectedOption.badgeClass ||
                'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ml-1.5 ${
            isOpen ? 'rotate-180 text-black' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 w-full min-w-[200px] bg-white border border-gray-200 rounded-md shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${menuClassName}`}
        >
          {/* Optional Search Filter inside Menu */}
          {isSearchEnabled && (
            <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-1.5 shrink-0">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter options..."
                className="w-full text-xs bg-transparent focus:outline-none placeholder-gray-400 font-sans"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-gray-400 hover:text-black p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="py-1 max-h-56 overflow-y-auto divide-y divide-gray-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;

                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-gray-100 font-semibold text-black'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && (
                        <div className="shrink-0 flex items-center">{opt.icon}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate font-sans font-medium text-gray-900">
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span
                              className={`font-mono text-[9px] px-1 py-0.2 rounded border shrink-0 ${
                                opt.badgeClass ||
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <p className="text-[11px] text-gray-500 font-mono truncate mt-0.5">
                            {opt.description}
                          </p>
                        )}
                        {opt.subtext && (
                          <p className="text-[10px] text-gray-400 font-mono truncate">
                            {opt.subtext}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-black shrink-0 ml-1 stroke-[2.5]" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-3 text-xs text-center text-gray-400 font-mono">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
