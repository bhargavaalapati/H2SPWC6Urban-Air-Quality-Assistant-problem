'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { LocationInfo } from '@/domain/air-quality/types';

export function useCitySuggestions(isOffline: boolean) {
  const [cityInput, setCityInput] = useState('');
  const [suggestions, setSuggestions] = useState<LocationInfo[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const trimmed = cityInput.trim();
    if (trimmed.length < 2 || isOffline) {
      setSuggestions([]);
      setDropdownOpen(false);
      setIsSuggesting(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await fetch(`/api/air-quality?suggest=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: LocationInfo[] };
        const items = data.suggestions ?? [];
        setSuggestions(items);
        setHighlightedIdx(-1);
        setDropdownOpen(items.length > 0);
      } catch {
        // Ignore abort or transient suggestion errors
      } finally {
        setIsSuggesting(false);
      }
    }, 260);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cityInput, isOffline]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIdx((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (event.key === 'Escape') {
      setDropdownOpen(false);
      setHighlightedIdx(-1);
    }
  };

  const clearSuggestions = (nextInput?: string) => {
    if (nextInput !== undefined) setCityInput(nextInput);
    setDropdownOpen(false);
    setSuggestions([]);
    setHighlightedIdx(-1);
  };

  return {
    cityInput,
    setCityInput,
    suggestions,
    isSuggesting,
    dropdownOpen,
    setDropdownOpen,
    highlightedIdx,
    setHighlightedIdx,
    containerRef,
    handleKeyDown,
    clearSuggestions,
  };
}