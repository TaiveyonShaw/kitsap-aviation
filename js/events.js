(function (global) {
  var STORAGE_KEY = 'kitsap-aviation-events';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseLocalDate(dateStr) {
    var parts = (dateStr || '').split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function eventEnd(event) {
    var date = parseLocalDate(event.date);
    if (!date) return 0;
    var time = (event.endTime || '23:59').split(':');
    date.setHours(Number(time[0]) || 0, Number(time[1]) || 0, 0, 0);
    return date.getTime();
  }

  function formatTime(hhmm) {
    if (!hhmm) return '';
    var parts = hhmm.split(':');
    var hour = Number(parts[0]);
    var minute = parts[1] || '00';
    if (isNaN(hour)) return hhmm;
    var suffix = hour >= 12 ? 'PM' : 'AM';
    var display = hour % 12;
    if (display === 0) display = 12;
    return minute === '00' ? display + ' ' + suffix : display + ':' + minute + ' ' + suffix;
  }

  function formatMeta(event) {
    var start = formatTime(event.startTime);
    var end = formatTime(event.endTime);
    var time = start && end ? start + ' – ' + end : start || end;
    if (time && event.location) return time + ' · ' + event.location;
    return time || event.location || '';
  }

  function sortEvents(events) {
    return events.slice().sort(function (a, b) {
      return eventEnd(a) - eventEnd(b);
    });
  }

  function upcomingEvents(events) {
    var now = Date.now();
    return sortEvents(events).filter(function (event) {
      return eventEnd(event) >= now;
    });
  }

  function renderEventCard(event) {
    var date = parseLocalDate(event.date);
    var month = date ? MONTHS[date.getMonth()] : '';
    var day = date ? String(date.getDate()).padStart(2, '0') : '';
    var weekday = date ? WEEKDAYS[date.getDay()] : '';
    var iso = event.date || '';
    var href = event.linkHref || 'contact.html?interest=Upcoming+Event';
    var linkText = event.linkText || 'RSVP';

    return (
      '<article class="event-card">' +
        '<time class="event-date" datetime="' + escapeHtml(iso) + '">' +
          '<span class="event-month">' + escapeHtml(month) + '</span>' +
          '<span class="event-day">' + escapeHtml(day) + '</span>' +
          '<span class="event-weekday">' + escapeHtml(weekday) + '</span>' +
        '</time>' +
        '<div class="event-body">' +
          '<h3>' + escapeHtml(event.title) + '</h3>' +
          '<p class="event-meta">' + escapeHtml(formatMeta(event)) + '</p>' +
          '<p>' + escapeHtml(event.description) + '</p>' +
          '<a class="event-link" href="' + escapeHtml(href) + '">' + escapeHtml(linkText) + '</a>' +
        '</div>' +
      '</article>'
    );
  }

  function loadFromFile() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        var parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return Promise.resolve(parsed);
      } catch (error) {
        /* fall through to file */
      }
    }
    return fetch('events.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('Could not load events');
        return response.json();
      })
      .then(function (data) {
        return Array.isArray(data) ? data : [];
      })
      .catch(function () {
        return [];
      });
  }

  function loadEvents() {
    return fetch('/api/events', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('No live events API');
        return response.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error('Invalid events');
        return data;
      })
      .catch(function () {
        return loadFromFile();
      });
  }

  function saveEvents(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function saveLive(events) {
    return fetch('/api/events', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events)
    }).then(function (response) {
      return response.json().then(function (data) {
        return { ok: response.ok, status: response.status, data: data };
      }).catch(function () {
        return { ok: false, status: response.status, data: {} };
      });
    }).catch(function () {
      return { ok: false, status: 0, data: {} };
    });
  }

  function clearLocalEvents() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function hasLocalDraft() {
    return localStorage.getItem(STORAGE_KEY) != null;
  }

  function renderEvents(events, listEl, emptyEl) {
    var upcoming = upcomingEvents(events);
    listEl.innerHTML = upcoming.map(renderEventCard).join('');
    if (emptyEl) emptyEl.hidden = upcoming.length > 0;
  }

  global.KitsapEvents = {
    load: loadEvents,
    save: saveEvents,
    saveLive: saveLive,
    clearLocal: clearLocalEvents,
    hasLocalDraft: hasLocalDraft,
    sort: sortEvents,
    render: renderEvents
  };
})(window);
