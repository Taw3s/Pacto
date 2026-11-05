import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, CONTROLLER_NAME, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = { title: "Termos de uso · Pacto" };

export default function TermsPage() {
  const contact = CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <b>(e-mail de contato ainda não definido)</b>;
  return (
    <>
      <h1>Termos de uso</h1>
      <p className="text-sm text-muted">Atualizados em {LEGAL_UPDATED}.</p>
      <p>
        Ao criar uma conta ou entrar num grupo do Pacto, você concorda com estes termos e com a{" "}
        <Link href="/privacidade">política de privacidade</Link>. O Pacto é mantido por {CONTROLLER_NAME}. Contato: {contact}.
      </p>

      <h2>O que é o Pacto</h2>
      <p>
        Um app para grupos de amigos cumprirem metas diárias juntos: cada pessoa manda provas do que fez, o grupo acompanha e, quando alguém
        falha, fica devendo um item combinado (o cardápio da dívida). O Pacto está em fase de testes: pode mudar, ficar fora do ar ou perder
        funções sem aviso prévio.
      </p>

      <h2>A dívida é um combinado entre amigos</h2>
      <p>
        O Pacto só registra quem deve o quê e quem disse que recebeu. Ele <b>não processa pagamentos</b>, não cobra ninguém e não garante que
        uma dívida seja paga. Pagar ou não é um acordo entre as pessoas do grupo, e o Pacto não responde por esses acordos.
      </p>

      <h2>Provas e tribunal</h2>
      <ul>
        <li>Mande provas verdadeiras e suas. Não envie fotos de outras pessoas sem a autorização delas, nem conteúdo ilegal ou ofensivo.</li>
        <li>Provas enviadas não podem ser editadas. O grupo pode contestá-las no tribunal, e a decisão é do grupo, por voto.</li>
        <li>
          O juiz IA é uma ajuda: ele pode errar e não decide nada sozinho. A palavra final é sempre do grupo.
        </li>
      </ul>

      <h2>Grupos</h2>
      <ul>
        <li>Quem cria o desafio é o dono do grupo: troca o cardápio da dívida e pode remover membros.</li>
        <li>Você pode sair do grupo ou excluir a sua conta quando quiser, em Configurações.</li>
        <li>
          Se uma pessoa usar o Pacto para ofender, expor ou prejudicar alguém, o responsável pelo Pacto pode remover o conteúdo ou a conta.
        </li>
      </ul>

      <h2>Responsabilidade</h2>
      <p>
        O Pacto é gratuito e está em fase de testes: falhas podem acontecer, e o app pode ficar fora do ar. Os combinados entre os membros e o
        conteúdo que cada pessoa envia são de quem os fez. Nada nestes termos tira ou limita direitos que a lei garante a você, como os do
        Código de Defesa do Consumidor.
      </p>

      <h2>Lei aplicável</h2>
      <p>Estes termos seguem as leis do Brasil, incluindo o Código de Defesa do Consumidor e a LGPD.</p>
    </>
  );
}
