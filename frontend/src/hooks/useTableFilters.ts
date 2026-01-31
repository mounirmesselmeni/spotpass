/**
 * useTableFilters - Reusable hook for managing table filters with URL sync
 *
 * Features:
 * - Manages filter state
 * - Debounced search
 * - URL query param synchronization
 * - Clear all filters functionality
 * - Pagination support
 * - Sorting support
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from '@mantine/hooks';

export interface UseTableFiltersOptions {
  defaultSearch?: string;
  defaultPage?: number;
  defaultPageSize?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  debounceMs?: number;
  enableUrlSync?: boolean;
}

export interface FilterState {
  search: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  [key: string]: any; // Allow custom filters
}

export interface UseTableFiltersReturn {
  // State values
  search: string;
  debouncedSearch: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, any>;

  // Setters
  setSearch: (value: string) => void;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setSortBy: (value: string) => void;
  setSortOrder: (value: 'asc' | 'desc') => void;
  setFilter: (key: string, value: any) => void;

  // Utilities
  clearFilters: () => void;
  hasActiveFilters: boolean;
  getQueryParams: () => Record<string, any>;
}

export function useTableFilters(options: UseTableFiltersOptions = {}): UseTableFiltersReturn {
  const {
    defaultSearch = '',
    defaultPage = 1,
    defaultPageSize = 20,
    defaultSortBy = 'created_at',
    defaultSortOrder = 'desc',
    debounceMs = 300,
    enableUrlSync = true,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize from URL if enabled
  const getInitialValue = (key: string, defaultValue: any) => {
    if (enableUrlSync && searchParams.has(key)) {
      const value = searchParams.get(key);
      if (typeof defaultValue === 'number') {
        return parseInt(value || String(defaultValue), 10);
      }
      return value || defaultValue;
    }
    return defaultValue;
  };

  // Core filter states
  const [search, setSearch] = useState<string>(getInitialValue('search', defaultSearch));
  const [page, setPage] = useState<number>(getInitialValue('page', defaultPage));
  const [pageSize, setPageSize] = useState<number>(getInitialValue('pageSize', defaultPageSize));
  const [sortBy, setSortBy] = useState<string>(getInitialValue('sortBy', defaultSortBy));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    getInitialValue('sortOrder', defaultSortOrder)
  );
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Debounced search
  const [debouncedSearch] = useDebouncedValue(search, debounceMs);

  // Sync to URL
  useEffect(() => {
    if (!enableUrlSync) return;

    const params: Record<string, string> = {};

    if (search) params.search = search;
    if (page !== defaultPage) params.page = String(page);
    if (pageSize !== defaultPageSize) params.pageSize = String(pageSize);
    if (sortBy !== defaultSortBy) params.sortBy = sortBy;
    if (sortOrder !== defaultSortOrder) params.sortOrder = sortOrder;

    // Add custom filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params[key] = String(value);
      }
    });

    setSearchParams(params, { replace: true });
  }, [search, page, pageSize, sortBy, sortOrder, filters, enableUrlSync]);

  // Set custom filter
  const setFilter = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearch(defaultSearch);
    setPage(defaultPage);
    setPageSize(defaultPageSize);
    setSortBy(defaultSortBy);
    setSortOrder(defaultSortOrder);
    setFilters({});
  }, [defaultSearch, defaultPage, defaultPageSize, defaultSortBy, defaultSortOrder]);

  // Check if any filters are active
  const hasActiveFilters =
    search !== defaultSearch ||
    page !== defaultPage ||
    sortBy !== defaultSortBy ||
    sortOrder !== defaultSortOrder ||
    Object.keys(filters).some(
      (key) => filters[key] !== null && filters[key] !== undefined && filters[key] !== ''
    );

  // Get query params for API calls
  const getQueryParams = useCallback(() => {
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
    };

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    // Add custom filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params[key] = value;
      }
    });

    return params;
  }, [page, pageSize, sortBy, sortOrder, debouncedSearch, filters]);

  return {
    // Values
    search,
    debouncedSearch,
    page,
    pageSize,
    sortBy,
    sortOrder,
    filters,

    // Setters
    setSearch,
    setPage,
    setPageSize,
    setSortBy,
    setSortOrder,
    setFilter,

    // Utilities
    clearFilters,
    hasActiveFilters,
    getQueryParams,
  };
}
