import { cache } from "react";
import { auth } from "@/auth";

// React only shares this result within a server render, never between users.
export const getSession = cache(() => auth());
