(() => {
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toIcsDate(d) {
    return (
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      "Z"
    );
  }

  function downloadEventIcs(event) {
    const start = event.sortKey
      ? new Date(`${event.sortKey}T16:00:00Z`)
      : new Date();
    const end = new Date(start.getTime() + 2 * 3600 * 1000);
    const uid = `${event.id}@mexico-hub`;
    const desc = [event.highlight, event.audience, `City: ${event.city || "Mexico"}`]
      .filter(Boolean)
      .join("\\n");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Amdocs Mexico Hub//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${(event.name || "Mexico Hub activity").replace(/,/g, "\\,")}`,
      `DESCRIPTION:${desc.replace(/,/g, "\\,")}`,
      `LOCATION:${event.city || "Mexico"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `${event.id || "mexico-hub"}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.GDLCalendar = { downloadEventIcs };
})();
