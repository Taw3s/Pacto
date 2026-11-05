/** "1 Coca" / "3 Cocas". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
