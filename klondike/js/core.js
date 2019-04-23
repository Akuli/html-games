define(['../../js/cards.js'], function(cards) {
  "use strict";

  class KlondikeCore extends cards.CardGameCore {
    static getCardPlaceStrings() {
      return [
        "stock discard - foundation foundation foundation foundation",
        "tableau tableau tableau tableau tableau tableau tableau",
      ];
    }

    constructor(allCards, pickCount) {
      if (allCards.length !== 13*4) {
        throw new Error(`expected ${13*4} cards, got ${allCards.length} cards`);
      }
      super(allCards);

      this._pickCount = pickCount;
      this._currentlyPicked = 0;

      for (const card of this._allCards) {
        card.visible = false;
      }
    }

    checkWin() {
      const foundationArrays = this.constructor.getCardPlaces().kindToPlaceIds.foundation.map(id => this.placeIdToCardArray[id]);
      return foundationArrays.every(cardArray => (cardArray.length === 13));
    }

    deal() {
      this.moveCards(this._allCards, 'stock', false);
      for (let i = 0; i < 7; i++) {
        const howManyCardsToMove = i+1;
        const cardsToMove = this.placeIdToCardArray.stock.splice(-howManyCardsToMove);
        this.moveCards(cardsToMove, 'tableau' + i);
        cardsToMove[cardsToMove.length - 1].visible = true;
      }
    }

    canMaybeMoveSomewhere(card, sourcePlaceId) {
      if (sourcePlaceId === 'stock') {
        // never makes sense (stock to discard moving is handled separately, see stockToDiscard)
        return false;
      }
      if (sourcePlaceId === 'discard' || sourcePlaceId.startsWith('foundation')) {
        // only topmost card can move
        const cardArray = this.placeIdToCardArray[sourcePlaceId];
        return (card === cardArray[cardArray.length - 1]);
      }
      if (sourcePlaceId.startsWith('tableau')) {
        return card.visible;
      }
      throw new Error("unknown card place id: " + sourcePlaceId);
    }

    _cardInSomeTableau(card) {
      const tableauArrays = this.constructor.getCardPlaces().kindToPlaceIds.tableau.map(id => this.placeIdToCardArray[id]);
      return tableauArrays.some(subArray => subArray.includes(card));
    }

    canMove(card, sourcePlaceId, destPlaceId) {
      const sourceArray = this.placeIdToCardArray[sourcePlaceId];
      const destArray = this.placeIdToCardArray[destPlaceId];

      const sourceArrayIndex = sourceArray.indexOf(card);
      if (sourceArrayIndex < 0) {
        throw new Error("card and sourcePlaceId don't match");
      }
      const isTopmost = (sourceArrayIndex === sourceArray.length - 1);

      if (isTopmost) {
        if (destPlaceId === 'stock' || destPlaceId === 'discard' || !card.visible) {
          return false;
        }
        if (destPlaceId.startsWith('foundation')) {
          if (destArray.length === 0) {
            return (card.number === 1);
          }
          const topmostCard = destArray[destArray.length - 1];
          return (card.suit === topmostCard.suit && card.number === topmostCard.number + 1);
        }
      } else {
        // the only valid move for a stack of cards is tableau --> tableau
        // for that, the bottommost moving card must be visible
        if (!( sourcePlaceId.startsWith('tableau') && destPlaceId.startsWith('tableau') && card.visible )) {
          return false;
        }
        // the tableau move is checked below like any other tableau move
      }

      if (!destPlaceId.startsWith('tableau')) {
        throw new Error("bug");   // lol
      }
      if (destArray.length === 0) {
        return (card.number === 13);
      }
      const topmostCard = destArray[destArray.length - 1];
      return (card.suit.color !== topmostCard.suit.color && card.number === topmostCard.number - 1);
    }

    rawMove(card, sourcePlaceId, destPlaceId) {
      super.rawMove(card, sourcePlaceId, destPlaceId);

      const sourceArray = this.placeIdToCardArray[sourcePlaceId];
      if (sourcePlaceId.startsWith('tableau') && sourceArray.length !== 0) {
        sourceArray[sourceArray.length - 1].visible = true;
      }
    }

    stockToDiscard() {
      if (this.placeIdToCardArray.stock.length === 0) {
        for (const card of this.placeIdToCardArray.discard) {
          card.visible = false;
        }
        this.moveCards(this.placeIdToCardArray.discard, 'stock');
        this.placeIdToCardArray.discard.length = 0;
      } else {
        const cardArray = this.placeIdToCardArray.stock.splice(0, this._pickCount);
        this.moveCards(cardArray, 'discard');
        for (const card of cardArray) {
          card.visible = true;
        }
      }
    }

    moveCardToAnyFoundationIfPossible(card, sourcePlaceId) {
      // TODO: do nothing if the card is already in a foundation
      for (const foundationId of this.constructor.getCardPlaces().kindToPlaceIds.foundation) {
        if (this.canMove(card, sourcePlaceId, foundationId)) {
          this.move(card, sourcePlaceId, foundationId);
          return true;
        }
      }
      return false;
    }

    moveAnyCardToAnyFoundationIfPossible() {
      for ( const id of this.constructor.getCardPlaces().kindToPlaceIds.tableau.concat(['discard']) ) {
        const array = this.placeIdToCardArray[id];
        if (array.length !== 0 && this.moveCardToAnyFoundationIfPossible(array[array.length - 1], id)) {
          return true;
        }
      }
      return false;
    }
  }

  return KlondikeCore;
});
