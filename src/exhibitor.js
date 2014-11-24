var _ = require('lodash');
var _S = require('underscore.string');
var themes = require('./themes');

var defaultOptions = {};

/* global $ */
function Exhibitor(element, options) {
  var self = this;
  this.element = $(element || '.exhibitor:first');
  this.options = _.merge(_.cloneDeep(defaultOptions), options);
  this.themes = themes.slice();
  this.themes.forEach(function(theme){
    theme.name = _S.trim(theme.name || _S.titleize(_S.humanize(theme.id)));
    theme.regex = new RegExp('^' + theme.name, 'gi');
  });
  this.element.addClass('map-mode');

  this.themeLiTemplate = this.element.find('ol.themes li:first')[0].outerHTML;
  this.itemLiTemplate = this.element.find('ol.items li:first')[0].outerHTML;
  this.element.find('ol.themes li,ol.items li').remove();

  this.element.on('click', '.themes li > div > a', function(){
    self.select($(this).closest('li').data('theme'));
  });

  this.element.on('click', '.themes li .love-toggle', function(e){
    e.stopPropagation();
    self.loveToggle($(this).closest('li').data('theme'));
  });

  this.element.on('click', '.back-to-map', function(){
    self.goToMap();
  });

  var q = this.queryInput = this.element.find('form [name=q]');
  this.element.on('submit', 'form', function(e){
    e.preventDefault();
    self.query(q.val());
  });
  q.on('input', function(){
    var query = q.val();
    self.query(query);
  }).keydown(function (e) {
    if (e.which === 9) {
      e.preventDefault();
      self.queryComplete();
    }
  });


  var match = /#?q=(.+)/.exec(document.location.hash || '');
  var query = '';
  if (match) {
    query = decodeURIComponent(match[1]);
    q.val(query);
  }
  this.query(query);
}

Exhibitor.prototype.select = function(themeId) {
  this.element.addClass('exhibition-mode').removeClass('map-mode');
  this.element.find('.themes li').removeClass('exhibited');
  this.element.find('.themes .theme-'+themeId).addClass('exhibited');

  var ol = this.element.find('.items');
  ol.empty();
  for (var i = 0; i < 29; i++) {
    var li = $(this.itemLiTemplate);
    li.find('h3').text('Product Name #'+i);
    li.addClass('item-index-' + i);
    ol.append(li);
  }
};

Exhibitor.prototype.queryComplete = function() {
  var q = this.queryInput;
  var suggestion = q.data('autocomplete-suggestion') + ' ';
  if (!_S.trim(suggestion)) {
    return;
  }
  q.val(suggestion);
  this.query(suggestion);
  q.focus().val('').val(suggestion);
};

Exhibitor.prototype.loveToggle = function(themeId) {
  var theme = _.find(themes, { id: themeId });
  theme.love = !theme.love;

  var li = this.element.find('.map li.theme-' + themeId);
  if (theme.love) {
    li.addClass('loved-theme');
  } else {
    li.removeClass('loved-theme');
  }
};

Exhibitor.prototype.goToMap = function() {
  this.element.removeClass('exhibition-mode').addClass('map-mode');
  this.element.find('.exhibited').removeClass('exhibited');
};

Exhibitor.prototype.query = function(q) {
  var self = this;
  var tryToMatchMoreThemes = true;
  this.queryInput.data('autocomplete-suggestion', '');
  if (typeof q === 'undefined' || q === null || q === '') {
    this.themes = themes.slice();
    themes.forEach(function(theme){
      delete theme.exactMatch;
      delete theme.suggestion;
    });
    this.updateThemeList();
    history.replaceState(undefined, undefined, '#');
    return;
  }
  history.replaceState(undefined, undefined, '#?q=' + encodeURIComponent(q));
  q = _S.trim(q || '').replace(/[ ,]+/g, ' ').toLowerCase();

  var filteredThemes = [];

  themes.forEach(function(theme){
    delete theme.exactMatch;
    delete theme.suggestion;
  });

  function findThemeInQuery(theme) {
    var nextQ = q.replace(theme.regex, '');
    if (nextQ !== q) {
      tryToMatchMoreThemes = true;
      q = _S.trim(nextQ);
      filteredThemes.push(theme);
      theme.exactMatch = true;
    }
  }

  // exact matches
  while (tryToMatchMoreThemes) {
    tryToMatchMoreThemes = false;
    themes.forEach(findThemeInQuery);
  }

  // autocomplete
  var suggested = false;
  var suggestionCount = 0;
  function setSuggestion() {
    if (!suggested) {
      suggested = true;
      self.queryInput.data('autocomplete-suggestion', filteredThemes.map(function(theme){
        return theme.name;
      }).join(' '));
    }
    suggestionCount++;
    filteredThemes[filteredThemes.length - 1].suggestion = suggestionCount;
  }
  if (q !== '') {
    themes.forEach(function(theme){
      if (filteredThemes.indexOf(theme) >= 0) {
        return;
      }
      if (theme.name.substr(0, q.length).toLowerCase() === q) {
        filteredThemes.push(theme);
        setSuggestion();
      }
    });
    themes.forEach(function(theme){
      if (filteredThemes.indexOf(theme) >= 0) {
        return;
      }
      // secondarily, match any word in the name
      if (_.any(theme.name.toLowerCase().split(' '), function(word) {
        return word.substr(0, q.length) === q;
      })) {
        filteredThemes.push(theme);
        setSuggestion();
      }
    });
  }
  this.themes = filteredThemes;
  this.updateThemeList();
};

function removeWithDelay(element, delay) {
  setTimeout(function() {
    if (!element.is('.removed')){
      return;
    }
    element.remove();
  }, delay);
}

function appearWithDelay(element, delay) {
  setTimeout(function() {
    $(element).removeClass('just-appeared');
  }, delay);
}

Exhibitor.prototype.updateThemeList = function(themes) {
  var self = this;
  themes = themes || this.themes;
  var theme;
  var ol = this.element.find('ol.themes');
  var li;
  var found = {};
  if (themes.length) {
    this.element.addClass('not-empty').removeClass('empty');
  } else {
    this.element.addClass('empty').removeClass('not-empty');
  }
  ol.find('li').each(function() {
    li = $(this);
    var themeId = li.data('theme');
    var themeIndex = _.findIndex(themes, { id: themeId });
    theme = themes[themeIndex];
    if (themeIndex < 0) {
      li.addClass('removed');
      removeWithDelay(li, 1000);
    } else {
      var previousIndex = li.data('theme-index');
      if (previousIndex !== themeIndex) {
        li.addClass('theme-index-' + themeIndex);
        if (typeof previousIndex === 'number') {
          li.removeClass('theme-index-' + previousIndex);
        }
        li.data('theme-index', themeIndex);
      }
      li.removeClass('removed');
      found[themeIndex] = true;
    }
    li.removeClass('exact-match suggestion');
    if (theme) {
      if (theme.exactMatch) {
        li.addClass('exact-match');
      } else if (theme.suggestion) {
        li.addClass('suggestion');
      }
    }
  });

  var themesLength = themes.length;
  for (var index = 0; index < themesLength; index++) {
    if (found[index]) {
      continue;
    }

    // new theme, add to the list
    theme = themes[index];
    li = $(this.themeLiTemplate);
    li.find('h2').text(theme.name);
    li.addClass('just-appeared');
    appearWithDelay(li, 5);
    li.addClass('theme-' + theme.id);
    li.addClass('theme-index-' + index);
    li.data('theme', theme.id);
    li.data('theme-index', index);
    if (theme.love) {
      li.addClass('loved-theme');
    }

    if (theme.exactMatch) {
      li.addClass('exact-match');
    } else if (theme.suggestion) {
      li.addClass('suggestion');
    }

    ol.append(li);
  }

  setTimeout(function(){
    self.sortThemeElements();
  }, 1000);
};

Exhibitor.prototype.sortThemeElements = function() {
  var ol = $(this.element).find('ol.themes');
  ol.find('li').sort(function(a, b) {
    return $(a).data('theme-index') > $(b).data('theme-index');
  }).each(function() {
    var li = $(this);
    var index = li.data('theme-index');
    if (index === li.index()) {
      return;
    }
    li.insertBefore(ol.children('li').get(index));
  });
};


module.exports = Exhibitor;
