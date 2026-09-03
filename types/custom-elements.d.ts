/**
 * Este arquivo ficou **vazio de propósito**, e o histórico explica por quê.
 *
 * Ele declarava a tag `<piece>` do chessground para o JSX aceitá-la — o
 * seletor de promoção reusava os desenhos de peça do pacote. O TypeScript
 * aceitava; o React 19, não: em desenvolvimento ele derrubava um **erro** no
 * console, "The tag <piece> is unrecognized in this browser", para toda tag
 * desconhecida sem hífen no nome.
 *
 * O seletor de promoção passou a escrever a tag como HTML cru (ver o
 * comentário em `components/board/PromotionPicker.tsx`), e a declaração deixou
 * de ter uso. Ela sai daqui em vez de ficar de reserva: declaração de tipo sem
 * chamador é a próxima pessoa achando que o caminho do JSX funciona.
 */
export {};
