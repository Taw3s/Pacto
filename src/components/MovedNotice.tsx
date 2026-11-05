"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { SITE, oldAddress } from "@/lib/moved";

// The app moved from pactus-rho.vercel.app to its own domain (28/10/2026). An installed app, its login, the first steps
// and push notices belong to the old address and do not move by themselves: this tells whoever still opens it there.
export function MovedNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(oldAddress(window.location.hostname)), []);
  if (!show) return null;
  const site = new URL(SITE);
  return (
    <aside aria-label="Novo endereço do Pacto" className="gutter mx-auto max-w-[680px] pt-[calc(12px+env(safe-area-inset-top))]">
      <div className="card !border-warn">
        <p className="font-semibold">O Pacto mudou de endereço: {site.host}</p>
        <p className="mt-1 text-sm text-muted">
          Abra por lá e, se usa o app instalado, instale de novo. Entrar na conta, os avisos e os primeiros passos não passam sozinhos para o
          endereço novo. Suas provas, dívidas e o grupo continuam iguais.
        </p>
        <a href={`${site.origin}/login`} className="btn-primary mt-3 w-full sm:w-auto">
          Abrir o Pacto no endereço novo <ArrowRight size={18} aria-hidden />
        </a>
      </div>
    </aside>
  );
}
