import { Tables } from "@/lib/db/supabase";

export type Startup = Tables<"startup"> & {
  _createdAt?: string;
};

export type Author = Tables<"author"> &{_createdAt:string};

export type StartupWithAuthor = Startup & { author: Author | null };

