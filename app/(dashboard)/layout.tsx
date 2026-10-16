import SessionActivity from "@/components/SessionActivity";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionActivity />
      {children}
    </>
  );
}
