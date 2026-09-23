"use client";

import { useState } from "react";
import { SearchInput } from "@/components/SearchInput";
import { useAutocomplete } from "@/hooks/useAutocomplete";

export function HomeSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const { results, isLoading } = useAutocomplete(searchQuery, undefined);

  return (
    <div className="relative h-11 w-full">
      <SearchInput
        map={null}
        placement="hero"
        results={results}
        isLoading={isLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  );
}
