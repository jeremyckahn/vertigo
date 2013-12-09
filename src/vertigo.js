/*
 * vertigo
 *
 *
 * Copyright (c) 2013 Jeremy Kahn
 * Licensed under the MIT license.
 */

;(function ($) {
  'use strict';

  var LAYER_DEPTH = 500;
  // This MUST be kept in sync with $CARD_TRANSITION_DURATION in the Sass file.
  var CARD_TRANSITION_DURATION = 300;

  var $win = $(window);

  $.fn.vertigo = function () {
    return this.each(function () {
      initialize($(this));
    });
  };

  /**
   * @param {jQuery} $card
   */
  function initialize ($el) {
    $el._totalCards = 0;
    $el._isLocked = false;
    $el._isAnyCardFocused = false;
    $el._sampledCardWidth = null;
    $el._sampledCardHeight = null;
    $el._zFadeDistance = LAYER_DEPTH * ($el.children().length * 0.5);

    initCards($el);
    zoom($el, 0);

    $el.on('click', '.card', $.proxy(onClickCard, $el, $el));

    $win.on('mousewheel', $.proxy(onWindowMouseWheel, $el, $el));
    $win.on('click', $.proxy(onWindowClick, $el, $el));
  }

  /**
   * @param {jQuery} $el
   */
  function initCards ($el) {
    $el.children().each(function (i, el) {
      initCard($el, $(el));
    });
  }

  /**
   * @param {jQuery} $el
   * @param {jQuery} $card
   */
  function initCard ($el, $card) {
    if ($el._sampledCardWidth === null) {
      measureAndStoreCardDimensions($el, $card);
    }

    var totalCards = $el._totalCards;
    var quadrant = totalCards % 4;
    var transformX =
        (quadrant === 0 || quadrant === 2) ? -100 : 100;
    var transformY = (quadrant < 2) ? -100 : 100;
    var transformZ = totalCards * -LAYER_DEPTH;
    applyTransform3d(
        $card, transformX + '%', transformY + '%', transformZ + 'px');
    $card.attr({
      'data-x': transformX
      ,'data-y': transformY
      ,'data-z': transformZ
    });
    $card.addClass('card');

    $el._totalCards++;
  }

  /**
   * @param {jQuery} $el
   * @param {jQuery} $card
   */
  function measureAndStoreCardDimensions ($el, $card) {
    $el._sampledCardWidth = $card.outerWidth(true);
    $el._sampledCardHeight = $card.outerHeight(true);
  }

  /**
   * @param {jQuery} $card
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  function applyTransform3d ($card, x, y, z) {
    $card.css('transform', 'translate3d(' + x + ', ' + y + ', ' + z + ')');
  }

  /**
   * @param {jQuery} $el
   * @param {number} zoomDelta
   */
  function zoom ($el, zoomDelta) {
    $el.hide();

    var $cards = $el.children();
    var i = 0, len = $cards.length;
    var $card, x, y, z, newZ;
    // TODO: Rewrite this loop to be faster.
    for (i; i < len; i++) {
      $card = $cards.eq(i);
      x = +$card.attr('data-x') + '%';
      y = +$card.attr('data-y') + '%';
      z = +$card.attr('data-z');
      newZ = cycleZ($el, z + zoomDelta);
      applyTransform3d($card, x, y, newZ + 'px');
      applyZFade($el, $card, newZ);
      $card.attr('data-z', newZ);
    }

    $el.show();
  }

  /**
   * @param {jQuery} $el
   * @param {number} unboundedZ
   * @return {number}
   */
  function cycleZ ($el, unboundedZ) {
    var doubledThreshold = $el._zFadeDistance * 2;
    if (unboundedZ > $el._zFadeDistance) {
      return unboundedZ - doubledThreshold;
    } else if (unboundedZ < -$el._zFadeDistance) {
      return unboundedZ + doubledThreshold;
    }

    return unboundedZ;
  }

  /**
   * @param {jQuery} $el
   * @param {jQuery} $card
   * @param {number} z
   */
  function applyZFade ($el, $card, z) {
    var opacity;
    if (z < 0) {
      opacity = 1 + (z / $el._zFadeDistance);
    } else {
      var boundedOpacity = Math.min(1, (z / $el._zFadeDistance));
      opacity = 1 - boundedOpacity;
    }

    $card.css('opacity', opacity);
  }

  /**
   * @param {jQuery} $el
   * @param {jQuery.Event} evt
   */
  function  onWindowMouseWheel ($el, evt) {
    evt.preventDefault();

    if (!$el._isLocked && !$el._isAnyCardFocused) {
      zoom($el, evt.deltaY);
    }
  }

  /**
   * @param {jQuery} $el
   */
  function  onWindowClick ($el) {
    var $focusedCard = $el.find('.focused');
    if ($focusedCard.length && !$el._isLocked) {
      blurCard($el, $focusedCard);
    }
  }

  /**
   * @param {jQuery} $el
   */
  function onClickCard ($el, evt) {
    if ($el._isLocked) {
      return;
    }

    var $card = $(evt.currentTarget);

    if ($card.hasClass('focused')) {
      blurCard($el, $card);
    } else {
      focusCard($el, $card);
    }
  }

  /**
   * @param {jQuery} $el
   * @param {jQuery} $card
   */
  function blurCard ($el, $card) {
    $el._isAnyCardFocused = false;

    transition($el, function () {
      $card.removeClass('focused');
      zoom($el, 0);
    });
  }

  /**
   * @param {jQuery} $el
   * @param {jQuery} $card
   */
  function focusCard ($el, $card) {
    $el._isAnyCardFocused = true;

    transition($el, function () {
      $el.find('.card.focused').removeClass('focused');
      zoom($el, 0);
      $card.addClass('focused');

      // Remove transform and opacity styles to return the card to its
      // default state.
      $card.css({ transform: '', opacity: '' });
    });
  }

  /**
   * @param {jQuery} $el
   * @param {Function} modificationFn The function that causes a style change.
   */
  function transition ($el, modificationFn) {
    $el.addClass('transition');
    lock($el);
    modificationFn.call($el);
    setTimeout(function () {
      $el.removeClass('transition');
      unlock($el);
    }, CARD_TRANSITION_DURATION);
  }

  /**
   * @param {jQuery} $el
   */
  function lock ($el) {
    $el._isLocked = true;
  }

  /**
   * @param {jQuery} $el
   */
  function unlock ($el) {
    $el._isLocked = false;
  }

}(jQuery));
