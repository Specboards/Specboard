"use client";

import { useState } from "react";
import { ArrowLeft, GitBranch } from "lucide-react";

/**
 * Interactive product preview for the hero. Renders as a stylized board, and
 * clicking a card navigates (inside the fake browser chrome) to that item's
 * detail view — a Spec Kit-style spec beside a metadata sidebar — mirroring the
 * real app's feature-detail layout. No screenshots or asset files to keep in
 * sync; the data below is illustrative. Every item is a Feature with its own
 * spec, so the spec rendering stays representative of the real output.
 */

type Status = "backlog" | "in_progress" | "in_review" | "done";

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "reqs"; items: { id: string; text: string }[] }
  | { type: "scenarios"; items: { given: string; when: string; then: string }[] };

type Section = { heading: string; blocks: Block[] };

type Person = { name: string; initials: string; tone: string };

type Card = {
  id: string;
  title: string;
  tag: string;
  status: Status;
  priority: string;
  assignee: Person;
  quarter?: string;
  tags: string[];
  specId: string;
  specPath: string;
  branch: string;
  created: string;
  sections: Section[];
};

const STATUS_META: Record<Status, { label: string; dot: string }> = {
  backlog: { label: "Backlog", dot: "bg-gray-400" },
  in_progress: { label: "In progress", dot: "bg-amber-400" },
  in_review: { label: "In review", dot: "bg-pink-400" },
  done: { label: "Done", dot: "bg-emerald-400" },
};

const COLUMN_ORDER: Status[] = ["backlog", "in_progress", "in_review", "done"];

const PEOPLE = {
  maya: { name: "Maya Chen", initials: "MC", tone: "bg-indigo-500" },
  theo: { name: "Theo Park", initials: "TP", tone: "bg-emerald-500" },
  sam: { name: "Sam Rivera", initials: "SR", tone: "bg-amber-500" },
  ada: { name: "Ada Cole", initials: "AC", tone: "bg-pink-500" },
} satisfies Record<string, Person>;

const CARDS: Card[] = [
  {
    id: "idea-portal",
    title: "Public idea portal",
    tag: "feature",
    status: "backlog",
    priority: "P2",
    assignee: PEOPLE.maya,
    quarter: "2026 Q4",
    tags: ["portal", "feedback"],
    specId: "f3a9c1e2",
    specPath: "specs/idea-portal/spec.md",
    branch: "feat/idea-portal",
    created: "2026-05-12",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a customer, I want to submit and upvote ideas so the team can see what matters most to me.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "a signed-in customer",
                when: "they submit an idea",
                then: "it lands in the triage queue linked to their account",
              },
              {
                given: "an idea on the portal",
                when: "another user upvotes it",
                then: "its priority signal increases on the backlog",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "System MUST accept submissions from anonymous and signed-in users." },
              { id: "FR-002", text: "System MUST roll upvotes into a priority signal on the backlog." },
              { id: "FR-003", text: "Triage MUST allow accepting, merging, or declining a submission." },
              { id: "FR-004", text: "System MUST notify subscribers when an idea's status changes." },
            ],
          },
        ],
      },
      {
        heading: "Edge Cases",
        blocks: [
          {
            type: "ul",
            items: [
              "Duplicate submissions are surfaced for merge before they reach the backlog.",
              "Declined ideas stay visible with a reason.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "saved-views",
    title: "Saved board views",
    tag: "feature",
    status: "backlog",
    priority: "P2",
    assignee: PEOPLE.theo,
    tags: ["backlog", "filters"],
    specId: "b71d40aa",
    specPath: "specs/saved-views/spec.md",
    branch: "feat/saved-views",
    created: "2026-05-20",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a product lead, I want to save filter sets so I can switch between the views I check daily.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "an active set of filters",
                when: "the user saves it with a name",
                then: "it appears in the view switcher",
              },
              {
                given: "a chosen default view",
                when: "the user opens the backlog",
                then: "that view loads automatically",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "System MUST persist views per user, scoped to a product." },
              { id: "FR-002", text: "A view MUST capture status, owner, tag, and quarter filters." },
              { id: "FR-003", text: "Users MUST be able to set one view as the default." },
            ],
          },
        ],
      },
      {
        heading: "Out of Scope",
        blocks: [{ type: "p", text: "Sharing views across a team ships in a later phase." }],
      },
    ],
  },
  {
    id: "bulk-status",
    title: "Bulk status updates",
    tag: "feature",
    status: "backlog",
    priority: "P3",
    assignee: PEOPLE.ada,
    tags: ["backlog", "bulk"],
    specId: "a82f5d61",
    specPath: "specs/bulk-status/spec.md",
    branch: "feat/bulk-status",
    created: "2026-06-02",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a maintainer, I want to move several items at once so grooming the backlog isn't one click at a time.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "multiple selected cards",
                when: "the user picks a new status",
                then: "every selected item moves and the board updates",
              },
              {
                given: "one invalid transition in the selection",
                when: "the bulk action runs",
                then: "valid items move and the rest are reported",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "Users MUST be able to multi-select cards on the board." },
              { id: "FR-002", text: "System MUST apply status, owner, or tag changes across the selection." },
              {
                id: "FR-003",
                text: "System MUST validate each change against the workflow. [NEEDS CLARIFICATION: behavior on partial failure?]",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "slack-notify",
    title: "Slack notifications",
    tag: "feature",
    status: "backlog",
    priority: "P2",
    assignee: PEOPLE.sam,
    tags: ["slack", "notifications"],
    specId: "d4b1907c",
    specPath: "specs/slack-notify/spec.md",
    branch: "feat/slack-notify",
    created: "2026-06-10",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a team member, I want status changes in Slack so I don't have to watch the board.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "a connected workspace",
                when: "an item moves to In review",
                then: "its reviewers get a Slack message",
              },
              {
                given: "a muted product",
                when: "its items change status",
                then: "no messages are sent",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "System MUST post to a channel when subscribed items change status." },
              { id: "FR-002", text: "Users MUST be able to subscribe per product or per item." },
              { id: "FR-003", text: "Messages MUST deep-link to the work-item permalink." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "org-tenancy",
    title: "Org tenancy & product switcher",
    tag: "feature",
    status: "in_progress",
    priority: "P1",
    assignee: PEOPLE.maya,
    quarter: "2026 Q3",
    tags: ["multi-tenant"],
    specId: "9c2e77b4",
    specPath: "specs/org-tenancy/spec.md",
    branch: "feat/org-tenancy",
    created: "2026-04-18",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As an admin, I want one org with multiple products so teams share a workspace but keep separate boards.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "a user in an org",
                when: "they open the switcher",
                then: "they see every product they can access",
              },
              {
                given: "a private product",
                when: "a non-member opens its URL",
                then: "access is denied",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "URLs MUST be scoped as /{org}/{product}." },
              { id: "FR-002", text: "The sidebar MUST offer a switcher across a user's products." },
              { id: "FR-003", text: "Each product MUST carry its own accent color." },
              { id: "FR-004", text: "Private products MUST be hidden from non-members." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "github-sync",
    title: "GitHub spec sync",
    tag: "feature",
    status: "in_progress",
    priority: "P0",
    assignee: PEOPLE.sam,
    quarter: "2026 Q3",
    tags: ["git", "github"],
    specId: "1ad5e9f0",
    specPath: "specs/github-sync/spec.md",
    branch: "feat/github-sync",
    created: "2026-04-30",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a developer, I want the board to mirror specs in git so it never drifts from the source of truth.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "a connected repo",
                when: "specs are imported",
                then: "each spec.md becomes a work item",
              },
              {
                given: "a push to the default branch",
                when: "a spec changes",
                then: "the matching item re-parses",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "Setup MUST use the GitHub App with no secrets to paste." },
              { id: "FR-002", text: "Import MUST scan specs/** per .specboard/config.yml." },
              { id: "FR-003", text: "A push webhook MUST re-parse changed specs." },
              { id: "FR-004", text: "System MUST detect drift via blob sha." },
            ],
          },
        ],
      },
      {
        heading: "Open Questions",
        blocks: [
          {
            type: "p",
            text: "Monorepos with multiple spec roots are [NEEDS CLARIFICATION: one product or many?].",
          },
        ],
      },
    ],
  },
  {
    id: "command-palette",
    title: "Keyboard command palette",
    tag: "feature",
    status: "in_progress",
    priority: "P2",
    assignee: PEOPLE.theo,
    tags: ["shortcuts", "ux"],
    specId: "6fe2c83a",
    specPath: "specs/command-palette/spec.md",
    branch: "feat/command-palette",
    created: "2026-06-08",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a power user, I want a command palette so I can jump and act without the mouse.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "any screen",
                when: "the user presses Cmd-K",
                then: "a searchable palette opens",
              },
              {
                given: "a typed query",
                when: "the user selects a command",
                then: "it runs in the current context",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "Palette MUST open from a global shortcut." },
              { id: "FR-002", text: "Palette MUST search work items, products, and actions." },
              { id: "FR-003", text: "Recent and contextual commands MUST rank first." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "permalinks",
    title: "Work-item permalinks",
    tag: "feature",
    status: "in_review",
    priority: "P1",
    assignee: PEOPLE.ada,
    quarter: "2026 Q3",
    tags: ["routing"],
    specId: "47c0b8d3",
    specPath: "specs/permalinks/spec.md",
    branch: "feat/permalinks",
    created: "2026-05-02",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a user, I want stable links to items so they survive renames and moves.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "an item",
                when: "it is renamed",
                then: "its existing links still resolve",
              },
              {
                given: "a moved item",
                when: "an old link is opened",
                then: "it redirects to the new location",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "Permalinks MUST be /{org}/{product}/backlog/{level}/{specId}." },
              { id: "FR-002", text: "The spec id MUST be the durable identity, not the title." },
              { id: "FR-003", text: "Renames and moves MUST NOT break existing links." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "spec-diff",
    title: "Spec diff viewer",
    tag: "feature",
    status: "in_review",
    priority: "P2",
    assignee: PEOPLE.maya,
    tags: ["git", "review"],
    specId: "3c90ab47",
    specPath: "specs/spec-diff/spec.md",
    branch: "feat/spec-diff",
    created: "2026-05-28",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a reviewer, I want to see what changed in a spec so I can approve with context.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "an item synced from git",
                when: "its spec changes",
                then: "the detail view shows a diff against the last version",
              },
              {
                given: "a reviewer",
                when: "they open the diff",
                then: "additions and removals are highlighted inline",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "System MUST render a section-aware diff between spec versions." },
              { id: "FR-002", text: "Diffs MUST link to the originating commit." },
              { id: "FR-003", text: "Requirement-level changes MUST be called out." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "export",
    title: "CSV / JSON export",
    tag: "feature",
    status: "in_review",
    priority: "P3",
    assignee: PEOPLE.sam,
    tags: ["export", "reporting"],
    specId: "e15d762b",
    specPath: "specs/export/spec.md",
    branch: "feat/export",
    created: "2026-06-01",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As an analyst, I want to export the backlog so I can report outside the tool.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "a filtered board",
                when: "the user exports",
                then: "the file matches the current filters",
              },
              {
                given: "an export file",
                when: "it is opened",
                then: "it includes status, owner, tags, and spec id",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "System MUST export the current view as CSV and JSON." },
              { id: "FR-002", text: "Exports MUST respect active filters." },
              { id: "FR-003", text: "Export MUST include stable spec ids for joins." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "mcp-tools",
    title: "MCP tools for agents",
    tag: "feature",
    status: "done",
    priority: "P1",
    assignee: PEOPLE.theo,
    quarter: "2026 Q2",
    tags: ["mcp", "agents"],
    specId: "5e8a216c",
    specPath: "specs/mcp-tools/spec.md",
    branch: "feat/mcp-tools",
    created: "2026-03-15",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a coding agent, I want prioritized, status-aware specs so I can pick up the right work.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "the MCP server",
                when: "an agent lists features",
                then: "each carries its blocks and blockedBy",
              },
              {
                given: "an item",
                when: "an agent updates status",
                then: "the change is validated against the workflow",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "Server MUST expose list_features with blocks and blockedBy." },
              { id: "FR-002", text: "Server MUST expose read_spec for the full spec markdown." },
              { id: "FR-003", text: "update_status MUST validate against the workflow." },
              { id: "FR-004", text: "get_relations MUST return typed dependencies." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "auth",
    title: "Email auth + reset",
    tag: "feature",
    status: "done",
    priority: "P2",
    assignee: PEOPLE.sam,
    quarter: "2026 Q2",
    tags: ["auth"],
    specId: "c0f4937e",
    specPath: "specs/auth/spec.md",
    branch: "feat/auth",
    created: "2026-02-20",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As a new user, I want to sign up and recover my account so I can get in and stay in.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "a new email",
                when: "the user signs up",
                then: "they must verify before the first write",
              },
              {
                given: "a forgotten password",
                when: "the user requests a reset",
                then: "a tokenized link lets them set a new one",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "System MUST support sign-up, sign-in, and sign-out." },
              { id: "FR-002", text: "Email MUST be verified before the first write." },
              { id: "FR-003", text: "Password reset MUST use a tokenized, expiring link." },
              { id: "FR-004", text: "Users MUST be able to manage account and company settings." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "spec-editor",
    title: "Markdown spec editor",
    tag: "feature",
    status: "done",
    priority: "P2",
    assignee: PEOPLE.ada,
    tags: ["editor", "git"],
    specId: "82a4f0d9",
    specPath: "specs/spec-editor/spec.md",
    branch: "feat/spec-editor",
    created: "2026-03-02",
    sections: [
      {
        heading: "Primary User Story",
        blocks: [
          {
            type: "p",
            text: "As an author, I want to edit specs in the app so I don't have to leave for small changes.",
          },
        ],
      },
      {
        heading: "Acceptance Scenarios",
        blocks: [
          {
            type: "scenarios",
            items: [
              {
                given: "an item with a spec",
                when: "the author edits and saves",
                then: "the change writes back to git",
              },
              {
                given: "a saved edit",
                when: "the commit lands",
                then: "the board reflects the new content",
              },
            ],
          },
        ],
      },
      {
        heading: "Functional Requirements",
        blocks: [
          {
            type: "reqs",
            items: [
              { id: "FR-001", text: "Editor MUST render and edit spec markdown in place." },
              { id: "FR-002", text: "Saves MUST commit back to the connected repo." },
              { id: "FR-003", text: "Concurrent edits MUST be detected via blob sha." },
            ],
          },
        ],
      },
    ],
  },
];

export function BoardPreview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = CARDS.find((c) => c.id === selectedId) ?? null;

  const urlPath = selected
    ? `app.specboard.ai/acme/web/backlog/feature/${selected.specId}`
    : "app.specboard.ai/acme/web/backlog";

  return (
    <div className="mx-auto mt-16 max-w-5xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl shadow-indigo-100/60 ring-1 ring-black/5">
        {/* fake window chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span className="ml-3 truncate rounded-md bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-400">
            {urlPath}
          </span>
          {!selected ? (
            <span className="ml-auto hidden text-[11px] text-gray-400 sm:inline">
              Click a card to open it
            </span>
          ) : null}
        </div>

        <div className="min-h-[372px] rounded-xl bg-gray-50 p-3">
          {selected ? (
            <DetailView card={selected} onBack={() => setSelectedId(null)} />
          ) : (
            <BoardView onSelect={setSelectedId} />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Board --------------------------------- */

function BoardView({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div
      key="board"
      className="grid animate-preview grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {COLUMN_ORDER.map((status) => {
        const cards = CARDS.filter((c) => c.status === status);
        const meta = STATUS_META[status];
        return (
          <div key={status} className="min-w-0">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium text-gray-600">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              {meta.label}
              <span className="text-gray-400">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelect(card.id)}
                  className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <p className="text-xs font-medium text-gray-900">{card.title}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                      {card.tag}
                    </span>
                    <Avatar person={card.assignee} className="h-4 w-4 text-[8px]" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------- Detail -------------------------------- */

function DetailView({ card, onBack }: { card: Card; onBack: () => void }) {
  const meta = STATUS_META[card.status];
  return (
    <div
      key={card.id}
      className="grid max-h-[372px] animate-preview gap-5 overflow-y-auto p-1 md:grid-cols-[1fr_200px]"
    >
      <article className="min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-3 w-3" />
          Backlog
        </button>

        <div className="mt-2 flex items-center gap-2">
          <span className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Feature
          </span>
          <h3 className="text-base font-semibold tracking-tight text-gray-900">
            Feature Specification: {card.title}
          </h3>
        </div>
        <p className="mt-1 flex items-center gap-1 font-mono text-[11px] text-gray-400">
          <GitBranch className="h-3 w-3" />
          {card.specPath}
        </p>

        {/* Spec Kit-style frontmatter */}
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed">
          <dt className="text-gray-400">Feature Branch</dt>
          <dd className="text-gray-700">{card.branch}</dd>
          <dt className="text-gray-400">Created</dt>
          <dd className="text-gray-700">{card.created}</dd>
          <dt className="text-gray-400">Status</dt>
          <dd className="text-gray-700">{meta.label}</dd>
        </dl>

        <div className="mt-4 space-y-4">
          {card.sections.map((section) => (
            <section key={section.heading}>
              <h4 className="text-[13px] font-semibold text-gray-900">
                {section.heading}
              </h4>
              <div className="mt-1 space-y-2">
                {section.blocks.map((block, i) => (
                  <SpecBlock key={i} block={block} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>

      <aside className="space-y-3 md:border-l md:border-gray-200 md:pl-5">
        <MetaRow label="Status">
          <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </MetaRow>
        <MetaRow label="Priority">
          <span className="font-medium text-gray-900">{card.priority}</span>
        </MetaRow>
        <MetaRow label="Assignee">
          <span className="inline-flex items-center gap-1.5 text-gray-900">
            <Avatar person={card.assignee} className="h-4 w-4 text-[8px]" />
            {card.assignee.name}
          </span>
        </MetaRow>
        {card.quarter ? (
          <MetaRow label="Roadmap">
            <span className="text-gray-900">{card.quarter}</span>
          </MetaRow>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-gray-400">Tags</p>
          <div className="flex flex-wrap gap-1">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <p className="font-mono text-[10px] text-gray-400">spec id: {card.specId}</p>
      </aside>
    </div>
  );
}

function SpecBlock({ block }: { block: Block }) {
  if (block.type === "p") {
    return (
      <p className="text-[13px] leading-relaxed text-gray-600">
        <Annotated text={block.text} />
      </p>
    );
  }
  if (block.type === "ul") {
    return (
      <ul className="space-y-1">
        {block.items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-[13px] leading-relaxed text-gray-600"
          >
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
            <span>
              <Annotated text={item} />
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "reqs") {
    return (
      <ul className="space-y-1">
        {block.items.map((req) => (
          <li
            key={req.id}
            className="flex gap-2 text-[13px] leading-relaxed text-gray-600"
          >
            <span className="mt-px shrink-0 font-mono text-[11px] font-semibold text-brand">
              {req.id}
            </span>
            <span>
              <Annotated text={req.text} />
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ol className="space-y-1.5">
      {block.items.map((s, i) => (
        <li key={i} className="text-[13px] leading-relaxed text-gray-600">
          <span className="font-semibold text-gray-400">{i + 1}.</span>{" "}
          <span className="font-semibold text-gray-700">Given</span> {s.given},{" "}
          <span className="font-semibold text-gray-700">When</span> {s.when},{" "}
          <span className="font-semibold text-gray-700">Then</span> {s.then}.
        </li>
      ))}
    </ol>
  );
}

/** Highlights Spec Kit `[NEEDS CLARIFICATION: ...]` markers like the real tool. */
function Annotated({ text }: { text: string }) {
  const parts = text.split(/(\[NEEDS CLARIFICATION:[^\]]*\])/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("[NEEDS CLARIFICATION") ? (
          <mark
            key={i}
            className="rounded bg-amber-100 px-1 py-px font-medium text-amber-700"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <div className="text-[13px]">{children}</div>
    </div>
  );
}

function Avatar({ person, className = "" }: { person: Person; className?: string }) {
  return (
    <span
      title={person.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${person.tone} ${className}`}
    >
      {person.initials}
    </span>
  );
}
