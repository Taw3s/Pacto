import { redirect } from "next/navigation";
import { requireMember } from "@/lib/data";

export default async function HistoryIndex() {
  const { me } = await requireMember();
  redirect(`/historico/${me.user_id}`);
}
