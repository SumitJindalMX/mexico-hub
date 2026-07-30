#!/usr/bin/env node
/**
 * Mexico Hub Events MCP — stdio server (GitHub JSON backend).
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as store from "./github-store.js";

function text(data) {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function err(e) {
  return {
    isError: true,
    content: [{ type: "text", text: e?.message || String(e) }],
  };
}

const TOOLS = [
  {
    name: "events_list",
    description:
      "List Mexico Hub catalog events. Optional filters: status, city, registrationOpen.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Upcoming | Completed | Recurring" },
        city: { type: "string" },
        registrationOpen: { type: "boolean" },
      },
    },
  },
  {
    name: "events_get",
    description: "Get one event by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "events_upsert",
    description:
      "Create or update an event in data/events.json (requires MEXICO_HUB_GITHUB_TOKEN).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        category: { type: "string" },
        status: { type: "string" },
        when: { type: "string" },
        sortKey: { type: "string" },
        audience: { type: "string" },
        highlight: { type: "string" },
        visibility: { type: "string" },
        registrationOpen: { type: "boolean" },
        confidence: { type: "string" },
        city: { type: "string" },
        capacity: { type: "number" },
        registrationClosesAt: { type: "string" },
        pptUrl: { type: "string" },
        videoUrl: { type: "string" },
        actor: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "events_set_registration",
    description: "Open or close registration for one eventId.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        open: { type: "boolean" },
      },
      required: ["eventId", "open"],
    },
  },
  {
    name: "registrations_list",
    description: "List team registrations; optional eventId filter.",
    inputSchema: {
      type: "object",
      properties: { eventId: { type: "string" } },
    },
  },
  {
    name: "registrations_add",
    description: "Publish a team registration to data/registrations.json.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        teamName: { type: "string" },
        leadName: { type: "string" },
        leadEmail: { type: "string" },
        inviteCode: { type: "string" },
        pptUrl: { type: "string" },
        videoUrl: { type: "string" },
        repoUrl: { type: "string" },
        actor: { type: "string" },
      },
      required: ["eventId", "teamName"],
    },
  },
  {
    name: "scores_list",
    description: "List scores; optional eventId filter.",
    inputSchema: {
      type: "object",
      properties: { eventId: { type: "string" } },
    },
  },
  {
    name: "scores_upsert",
    description: "Create/update a judge score (demo/deck/code 1–5).",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        registrationId: { type: "string" },
        teamName: { type: "string" },
        demo: { type: "number" },
        deck: { type: "number" },
        code: { type: "number" },
        notes: { type: "string" },
        published: { type: "boolean" },
        actor: { type: "string" },
      },
      required: ["eventId", "registrationId"],
    },
  },
  {
    name: "scores_publish",
    description: "Publish or unpublish all scores for an event.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        published: { type: "boolean", default: true },
      },
      required: ["eventId"],
    },
  },
  {
    name: "invites_list",
    description: "List invite codes; optional eventId filter.",
    inputSchema: {
      type: "object",
      properties: { eventId: { type: "string" } },
    },
  },
  {
    name: "invites_create",
    description: "Create an invite code for an event.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        maxUses: { type: "number" },
        expiresOn: { type: "string" },
        code: { type: "string" },
        actor: { type: "string" },
      },
      required: ["eventId"],
    },
  },
];

const server = new Server(
  { name: "mexico-hub-events", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const a = request.params.arguments || {};
  try {
    switch (name) {
      case "events_list":
        return text(
          await store.listEvents({
            status: a.status,
            city: a.city,
            registrationOpen: a.registrationOpen,
          }),
        );
      case "events_get":
        return text(await store.getEvent(a.id));
      case "events_upsert":
        return text(await store.upsertEvent(a));
      case "events_set_registration":
        return text(await store.setRegistration(a.eventId, a.open));
      case "registrations_list":
        return text(await store.listRegistrations(a.eventId));
      case "registrations_add":
        return text(await store.addRegistration(a));
      case "scores_list":
        return text(await store.listScores(a.eventId));
      case "scores_upsert":
        return text(await store.upsertScore(a));
      case "scores_publish":
        return text(
          await store.publishScores(
            a.eventId,
            a.published != null ? a.published : true,
          ),
        );
      case "invites_list":
        return text(await store.listInvites(a.eventId));
      case "invites_create":
        return text(await store.createInvite(a));
      default:
        return err(new Error(`Unknown tool: ${name}`));
    }
  } catch (e) {
    return err(e);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
