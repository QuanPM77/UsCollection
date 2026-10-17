import { auth } from "@/auth";
import CustomizerView from "./CustomizerView";

export default async function CustomizerPage() {
  const session = await auth();
  return <CustomizerView isAuthenticated={Boolean(session?.user)} />;
}
