
import React, { useState, useEffect, useRef } from 'react';

interface SuggestionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (value: string) => void; // New prop for immediate selection handling
    onBlur?: () => void;
    suggestions: string[];
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
    disabled?: boolean;
}

export const SuggestionInput: React.FC<SuggestionInputProps> = ({
    value,
    onChange,
    onSelect,
    onBlur,
    suggestions,
    placeholder,
    className,
    autoFocus,
    disabled
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value && isFocused) {
            const upperValue = value.toLocaleUpperCase('tr-TR');
            const filtered = suggestions
                .filter(item => item.toLocaleUpperCase('tr-TR').includes(upperValue))
                .slice(0, 10); // Limit to top 10 results for performance

            setFilteredSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    }, [value, suggestions, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value.toUpperCase());
        if (!isFocused) setIsFocused(true);
    };

    const handleSuggestionClick = (suggestion: string) => {
        if (onSelect) {
            onSelect(suggestion); // If onSelect exists, use it (it should handle both value and price update)
        } else {
            onChange(suggestion); // Fallback to onChange if onSelect is not provided
        }
        setShowSuggestions(false);
        setIsFocused(false);
    };

    const handleFocus = () => {
        setIsFocused(true);
        // Trigger suggestion update immediately on focus if there's a value
        if (value) {
            const upperValue = value.toLocaleUpperCase('tr-TR');
            const filtered = suggestions
                .filter(item => item.toLocaleUpperCase('tr-TR').includes(upperValue))
                .slice(0, 10);
            setFilteredSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        }
    };

    const handleBlur = (e: React.FocusEvent) => {
        // Delay hiding to allow click event on suggestion to fire
        setTimeout(() => {
            setIsFocused(false);
            setShowSuggestions(false);
            if (onBlur) onBlur();
        }, 200);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={className}
                autoFocus={autoFocus}
                disabled={disabled}
                autoComplete="off"
            />
            {showSuggestions && (
                <ul className="absolute z-50 w-full bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1 text-left">
                    {filteredSuggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur before click
                                handleSuggestionClick(suggestion);
                            }}
                            className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer text-slate-700 border-b border-slate-100 last:border-0 font-medium"
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
