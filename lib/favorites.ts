"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "usstory:favorites:v1";
const EMPTY_FAVORITES: string[] = [];
let cachedFavorites: string[] | null = null;
const listeners = new Set<() => void>();

function readFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
  } catch {
    return [];
  }
}

function getSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY_FAVORITES;
  if (cachedFavorites === null) cachedFavorites = readFavorites();
  return cachedFavorites;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  cachedFavorites = readFavorites();
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", handleStorage);
  };
}

export function toggleFavorite(productId: string) {
  const current = getSnapshot();
  cachedFavorites = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedFavorites));
  } catch {
    // Keep the current page responsive if browser storage is unavailable.
  }
  notify();
}

export function useFavorites() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_FAVORITES);
}
