import "next-auth";
declare module "next-auth" {
  interface Session {
    user: { id: string; role: "admin" | "staff" | "customer" } & import("next-auth").DefaultSession["user"];
  }
}
