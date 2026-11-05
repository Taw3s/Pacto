// The debt menu: what a missed day can cost. A group picks 1 or 2 of these items; the ids are
// stored in the database (payments.item, debt_menus.items) and checked there, so never rename one.
import type { SpriteName } from "@/components/Sprite";

export const DEBT_ITEMS = ["coke", "snack", "coffee", "chocolate", "acai", "pizza", "icecream", "pix"] as const;
export type DebtItem = (typeof DEBT_ITEMS)[number];

export const DEBT_ITEM: Record<DebtItem, { one: string; many: string; label: string; sprite: SpriteName }> = {
  coke: { one: "Coca", many: "Cocas", label: "Coca", sprite: "sodaCan" },
  snack: { one: "salgado", many: "salgados", label: "Salgado", sprite: "coxinha" },
  coffee: { one: "café", many: "cafés", label: "Café", sprite: "coffeeCup" },
  chocolate: { one: "chocolate", many: "chocolates", label: "Chocolate", sprite: "chocolateBar" },
  acai: { one: "açaí", many: "açaís", label: "Açaí", sprite: "acaiBowl" },
  pizza: { one: "fatia de pizza", many: "fatias de pizza", label: "Pizza", sprite: "pizzaSlice" },
  icecream: { one: "sorvete", many: "sorvetes", label: "Sorvete", sprite: "iceCream" },
  pix: { one: "Pix de R$ 5", many: "Pix de R$ 5", label: "Pix de R$ 5", sprite: "pixCoin" },
};

/** Groups created before the menu existed, and days before any menu: 1 Coca + 1 salgado. */
export const DEFAULT_MENU: DebtItem[] = ["coke", "snack"];

export function isDebtItem(x: string): x is DebtItem {
  return (DEBT_ITEMS as readonly string[]).includes(x);
}

/** "3 Cocas", "1 Pix de R$ 5". */
export function itemCount(item: DebtItem, n: number) {
  return `${n} ${n === 1 ? DEBT_ITEM[item].one : DEBT_ITEM[item].many}`;
}

/** "1 Coca + 1 salgado": what one missed day costs. */
export function menuPhrase(items: DebtItem[]) {
  return items.map((i) => itemCount(i, 1)).join(" + ");
}
