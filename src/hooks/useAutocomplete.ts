import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { type AutocompleteResults, fetchApi } from "@/utils";

// Stands in until the first autocomplete query settles.
const EMPTY_AUTOCOMPLETE_RESULTS: AutocompleteResults = {
  query: "",
  latitude: null,
  longitude: null,
  items: [],
};

export const useAutocomplete = (
  searchQuery: string,
  center: { lat: number; lng: number } | undefined,
) => {
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  const { data, isLoading, isFetching } = useQuery<AutocompleteResults>({
    queryKey: ["mapData", debouncedSearchQuery],
    queryFn: async () => {
      const latitude = center?.lat ?? null;
      const longitude = center?.lng ?? null;
      const request = { query: debouncedSearchQuery, latitude, longitude };
      if (debouncedSearchQuery.length === 0) return { ...request, items: [] };
      const params = new URLSearchParams({ query: debouncedSearchQuery });
      if (latitude !== null && longitude !== null) {
        params.set("latitude", latitude.toString());
        params.set("longitude", longitude.toString());
      }
      return { ...request, items: await fetchApi(`/autocomplete?${params}`) };
    },
    placeholderData: (previousData) => previousData,
  });

  return {
    results: data ?? EMPTY_AUTOCOMPLETE_RESULTS,
    isLoading: isLoading || isFetching || searchQuery !== debouncedSearchQuery,
  };
};
