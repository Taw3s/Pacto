/* eslint-disable @next/next/no-img-element -- signed URLs from Supabase, not optimizable */
/** Decorative: the name is always written next to it. */
export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (url) return <img src={url} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  return (
    <span aria-hidden style={style} className="flex shrink-0 items-center justify-center rounded-full bg-raised text-sm font-semibold uppercase text-muted">
      {name.slice(0, 1)}
    </span>
  );
}
