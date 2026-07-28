/**
 * GDL Site Visibility — domain model & seed data
 * Source: public LinkedIn posts (Amdocs Mexico / GDL, Aug 2025 anniversary).
 * Upcoming rows are planning placeholders — confirm with site ops.
 */
window.GDL = {
  site: {
    brand: "GDL",
    name: "Amdocs Guadalajara",
    region: "CALA · Mexico",
    tagline: "Site visibility for hackathons, culture, and talent moments.",
    asOf: "2026-07-27",
  },

  pulse: [
    {
      label: "Site milestone",
      value: "10 yrs",
      detail: "Amdocs Mexico anniversary celebrated in Aug 2025",
    },
    {
      label: "Anniversary program",
      value: "24",
      detail: "Events across ~2 months (hackathons, sports, culture)",
    },
    {
      label: "Gen AI Hackathon",
      value: "CALA",
      detail: "Regional Gen AI Hackathon / Hack-a-Tech at GDL",
    },
    {
      label: "Graduates intake",
      value: "~50",
      detail: "First graduates program cohort launched at GDL",
    },
  ],

  themes: [
    {
      title: "Innovation stage",
      body: "Gen AI Fair, Gen AI Hackathon, and CALA Hack-a-Tech put GDL on the regional innovation map with leadership visibility.",
    },
    {
      title: "People & culture",
      body: "Black & White anniversary party, photography contest, arcade challenges, and escape rooms broaden engagement beyond engineering.",
    },
    {
      title: "Talent pipeline",
      body: "Graduates Program and Ambassadors Club amplify employee voice and create a repeatable story for early-career hiring.",
    },
    {
      title: "Active lifestyle brand",
      body: "Soccer, bowling, kart racing, and step challenges keep site energy visible across social and internal channels.",
    },
  ],

  /** Events load from data/events.json at runtime (editable by authorized editors). */
  events: [],

  checklist: [
    {
      action: "Confirm 2026 Gen AI Hackathon dates",
      owner: "GDL site / innovation",
      why: "Keeps the high-visibility tech brand current",
    },
    {
      action: "Publish ATT/BSSe Innovation Day proposal",
      owner: "ATT delivery leads @ GDL",
      why: "Local product impact story for leadership",
    },
    {
      action: "Refresh Ambassadors Club content calendar",
      owner: "People / ERG",
      why: "Sustains recruiting and culture visibility",
    },
    {
      action: "Capture winners & demos from last hackathon",
      owner: "Comms",
      why: "Reusable assets for PI demos and hiring pages",
    },
  ],

  filters: {
    categories: [
      "All",
      "Hackathon",
      "Sports",
      "Culture",
      "Talent",
      "Leadership",
      "Community",
    ],
    statuses: ["All", "Upcoming", "Completed", "Recurring"],
    visibilities: ["All", "High", "Medium", "Internal"],
  },
};
