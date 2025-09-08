import { Tables } from "@/lib/db/supabase";

export type Startup = Tables<"startup"> & {
  _createdAt?: string;
};

export type Author = Tables<"author">;

export type StartupWithAuthor = Startup & { author: Author | null };