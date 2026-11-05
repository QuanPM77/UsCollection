import "next-auth";
declare module "next-auth" {
  interface Session {
    user: { id: string; role: "admin" | "staff" | "customer"; destination: string; isEmailVerified: boolean } & import("next-auth").DefaultSession["user"];
  }
}
