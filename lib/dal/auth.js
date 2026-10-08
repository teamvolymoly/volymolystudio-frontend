import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { fetchCurrentUser } from "../server/laravel-client";

export const getCurrentUser = cache(async () => fetchCurrentUser());

export const verifySession = cache(async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return {
    isAuthenticated: true,
    user,
  };
});
