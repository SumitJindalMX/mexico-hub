/**
 * Amdocs Mexico Hub — domain model & seed data
 * Catalog covers Mexico activities (cities like GDL when location matters).
 */
window.GDL = {
  site: {
    brand: "MX",
    name: "Amdocs Mexico Hub",
    region: "Mexico · CALA",
    tagline:
      "One colorful platform for every activity that puts Mexico on stage — hackathons, culture, talent, and site moments.",
    asOf: "2026-07-28",
  },

  pulse: [
    {
      label: "Mexico milestone",
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
      detail: "Regional Gen AI Hackathon / Hack-a-Tech across Mexico / CALA",
    },
    {
      label: "Graduates intake",
      value: "~50",
      detail: "Graduates program cohort launched in Mexico",
    },
  ],

  themes: [
    {
      title: "Innovation stage",
      body: "Hackathons, Gen AI fairs, and tech showcases that put Mexico teams on the regional innovation map.",
    },
    {
      title: "People & culture",
      body: "Site celebrations, contests, and social experiences that connect people beyond delivery work.",
    },
    {
      title: "Talent pipeline",
      body: "Graduates programs, ambassadors, and early-career moments that grow the Mexico talent brand.",
    },
    {
      title: "Active lifestyle",
      body: "Sports, wellness, and community challenges that keep energy and visibility high year-round.",
    },
  ],

  /** Events load from data/events.json at runtime (editable by authorized editors). */
  events: [],

  checklist: [
    {
      action: "Confirm 2026 Gen AI Hackathon dates",
      owner: "Mexico site / innovation",
      why: "Keeps the high-visibility tech brand current",
    },
    {
      action: "Publish ATT/BSSe Innovation Day proposal",
      owner: "ATT delivery leads @ Mexico",
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
    confidences: ["All", "Verified", "Editor", "Seed"],
  },
};
