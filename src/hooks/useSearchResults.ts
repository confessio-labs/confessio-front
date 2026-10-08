import {
  QueryClient,
  replaceEqualDeep,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useDateFilter } from "./useDateFilter";
import { useMapBounds } from "./useMapBounds";
import { AggregatedSearchResults, fetchChurchesWithWebsites } from "@/utils";

type Church = AggregatedSearchResults["churches"][number];

// Every viewport is its own query, and TanStack's structural sharing only
// compares a query with its own previous data, so a church still in view after
// a pan would come back as a new object. Reusing the instance already cached
// for an unchanged church keeps references stable, which is what lets the
// memoized tiles and markers skip re-rendering.
const reuseCachedChurches = (
  queryClient: QueryClient,
  results: AggregatedSearchResults,
): AggregatedSearchResults => {
  const cached = new Map<string, Church>();
  for (const [, data] of queryClient.getQueriesData<AggregatedSearchResults | null>(
    { queryKey: ["churches"] },
  )) {
    data?.churches.forEach((church) => cached.set(church.uuid, church));
  }
  return {
    ...results,
    churches: results.churches.map((church) => {
      const previous = cached.get(church.uuid);
      return previous ? replaceEqualDeep(previous, church) : church;
    }),
  };
};

export const useSearchResults = () => {
  const { bounds } = useMapBounds();
  const { date } = useDateFilter();
  const queryClient = useQueryClient();
  return useQuery<AggregatedSearchResults | null>({
    queryKey: [
      "churches",
      bounds?.south,
      bounds?.west,
      bounds?.north,
      bounds?.east,
      date?.toString(),
    ],
    queryFn: async ({ signal }) => {
      if (!bounds) return Promise.resolve(null);
      const results = await fetchChurchesWithWebsites({
        min_lat: bounds.south,
        max_lat: bounds.north,
        min_lng: bounds.east,
        max_lng: bounds.west,
        date_filter: date?.toISOString().split("T")?.[0] || undefined,
        signal,
      });
      return reuseCachedChurches(queryClient, results);
    },
    staleTime: 200,
    placeholderData: (previousdata) => previousdata,
  });
};
