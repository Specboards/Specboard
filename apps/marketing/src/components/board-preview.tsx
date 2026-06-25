"use client";

import { useState } from "react";
import { ArrowLeft, GitBranch } from "lucide-react";

/**
 * Interactive product preview for the hero. Renders as a stylized board, and
 * clicking a card navigates (inside the fake browser chrome) to that item's
 * detail view — spec content beside a metadata sidebar — mirroring the real
 * app's feature-detail layout. No screenshots or asset files to keep in sync;
 * the data below is illustrative.
 */

type Status = "backlog" | "in_progress" | "in_review" | "done";

type Block = { type: "p"; text: string } | { type: "ul"; items: string[] };
type Section = { heading: string; blocks: Block[] };

type Person = { name: string; initials: string; tone: string };

type Child = { title: string; status: Status };

type Card = {
  id: string;
  title: string;
  level: "Feature" | "Epic";
  tag: string;
  status: Status;
  priority: string;
  assignee: Person;
  quarter?: string;
  tags: string[];
  specId: string;
  /** Spec-backed items have a path + sections; grouping items have children. */
  specPath?: string;
  sections?: Section[];
  children?: Child[];
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
    level: "Feature",
    tag: "feature",
    status: "backlog",
    priority: "P2",
    assignee: PEOPLE.maya,
    quarter: "2026 Q4",
    tags: ["portal", "feedback"],
    specId: "f3a9c1e2",
    specPath: "specs/idea-portal/spec.md",
    sections: [
      {
        heading: "Summary",
        blocks: [
          {
            type: "p",
            text: "A public board where customers submit and upvote ideas. Submissions land in the backlog as work items, linked back to the requester.",
          },
        ],
      },
      {
        heading: "Requirements",
        blocks: [
          {
            type: "ul",
            items: [
              "Anonymous and signed-in submission",
              "Upvotes roll up into a priority signal",
              "Triage queue to accept, merge, or decline",
              "Status changes notify subscribers",
            ],
          },
        ],
      },
      {
        heading: "Out of scope",
        blocks: [
          { type: "p", text: "Custom branding and portal SSO ship in a later phase." },
        ],
      },
    ],
  },
  {
    id: "saved-views",
    title: "Saved board views",
    level: "Feature",
    tag: "feature",
    status: "backlog",
    priority: "P2",
    assignee: PEOPLE.theo,
    tags: ["backlog", "filters"],
    specId: "b71d40aa",
    specPath: "specs/saved-views/spec.md",
    sections: [
      {
        heading: "Summary",
        blocks: [
          {
            type: "p",
            text: "Save a named bundle of filters and sort order, then switch between views from the backlog header.",
          },
        ],
      },
      {
        heading: "Behaviour",
        blocks: [
          {
            type: "ul",
            items: [
              "Views are per-user, scoped to a product",
              "Capture status, owner, tag, and quarter filters",
              "Pick a default view that loads on open",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "org-tenancy",
    title: "Org tenancy & product switcher",
    level: "Epic",
    tag: "epic",
    status: "in_progress",
    priority: "P1",
    assignee: PEOPLE.maya,
    quarter: "2026 Q3",
    tags: ["multi-tenant"],
    specId: "9c2e77b4",
    children: [
      { title: "Org URL routing /{org}/{product}", status: "done" },
      { title: "Product switcher in the sidebar", status: "in_progress" },
      { title: "Per-product accent colors", status: "done" },
      { title: "Private product enforcement", status: "backlog" },
    ],
  },
  {
    id: "github-sync",
    title: "GitHub spec sync",
    level: "Feature",
    tag: "feature",
    status: "in_progress",
    priority: "P0",
    assignee: PEOPLE.sam,
    quarter: "2026 Q3",
    tags: ["git", "github"],
    specId: "1ad5e9f0",
    specPath: "specs/github-sync/spec.md",
    sections: [
      {
        heading: "Summary",
        blocks: [
          {
            type: "p",
            text: "Connect a repo through the GitHub App, import every spec, and reconcile on each push so the board never drifts from git.",
          },
        ],
      },
      {
        heading: "Flow",
        blocks: [
          {
            type: "ul",
            items: [
              "One-click App setup, no secrets to paste",
              "Import scans specs/** per .specboard/config.yml",
              "A push webhook re-parses changed specs",
              "blob sha detects drift and conflicts",
            ],
          },
        ],
      },
      {
        heading: "Open questions",
        blocks: [
          {
            type: "p",
            text: "Monorepos with multiple spec roots are still under discussion.",
          },
        ],
      },
    ],
  },
  {
    id: "permalinks",
    title: "Work-item permalinks",
    level: "Feature",
    tag: "feature",
    status: "in_review",
    priority: "P1",
    assignee: PEOPLE.ada,
    quarter: "2026 Q3",
    tags: ["routing"],
    specId: "47c0b8d3",
    specPath: "specs/permalinks/spec.md",
    sections: [
      {
        heading: "Summary",
        blocks: [
          {
            type: "p",
            text: "Stable, type-segmented URLs for every work item, so links survive renames and moves.",
          },
        ],
      },
      {
        heading: "Shape",
        blocks: [
          {
            type: "p",
            text: "Permalinks are /{org}/{product}/backlog/{level}/{specId}. The level makes the item type legible; the spec id is the identity.",
          },
        ],
      },
    ],
  },
  {
    id: "mcp-tools",
    title: "MCP tools for agents",
    level: "Feature",
    tag: "feature",
    status: "done",
    priority: "P1",
    assignee: PEOPLE.theo,
    quarter: "2026 Q2",
    tags: ["mcp", "agents"],
    specId: "5e8a216c",
    specPath: "specs/mcp-tools/spec.md",
    sections: [
      {
        heading: "Summary",
        blocks: [
          {
            type: "p",
            text: "An MCP server that exposes prioritized, status-aware specs to coding agents.",
          },
        ],
      },
      {
        heading: "Tools",
        blocks: [
          {
            type: "ul",
            items: [
              "list_features, with each item's blocks and blockedBy",
              "read_spec for the full spec markdown",
              "update_status, validated against the workflow",
              "get_relations for typed dependencies",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "auth",
    title: "Email auth + reset",
    level: "Feature",
    tag: "feature",
    status: "done",
    priority: "P2",
    assignee: PEOPLE.sam,
    quarter: "2026 Q2",
    tags: ["auth"],
    specId: "c0f4937e",
    specPath: "specs/auth/spec.md",
    sections: [
      {
        heading: "Summary",
        blocks: [
          {
            type: "p",
            text: "Email and password auth with verification and password reset, built on Better Auth.",
          },
        ],
      },
      {
        heading: "Includes",
        blocks: [
          {
            type: "ul",
            items: [
              "Sign-up, sign-in, and sign-out",
              "Email verification before the first write",
              "Password reset over a tokenized link",
              "Account and company settings",
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
    ? `app.specboard.ai/acme/web/backlog/${selected.level.toLowerCase()}/${selected.specId}`
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
            </div>
            <div className="space-y-2">
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelect(card.id)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
          className="inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-3 w-3" />
          Backlog
        </button>

        <div className="mt-2 flex items-center gap-2">
          <span className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            {card.level}
          </span>
          <h3 className="text-base font-semibold tracking-tight text-gray-900">
            {card.title}
          </h3>
        </div>
        {card.specPath ? (
          <p className="mt-1 flex items-center gap-1 font-mono text-[11px] text-gray-400">
            <GitBranch className="h-3 w-3" />
            {card.specPath}
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          {card.sections ? (
            card.sections.map((section) => (
              <section key={section.heading}>
                <h4 className="text-[13px] font-semibold text-gray-900">
                  {section.heading}
                </h4>
                <div className="mt-1 space-y-2">
                  {section.blocks.map((block, i) =>
                    block.type === "p" ? (
                      <p key={i} className="text-[13px] leading-relaxed text-gray-600">
                        {block.text}
                      </p>
                    ) : (
                      <ul key={i} className="space-y-1">
                        {block.items.map((item) => (
                          <li
                            key={item}
                            className="flex gap-2 text-[13px] leading-relaxed text-gray-600"
                          >
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              </section>
            ))
          ) : (
            <ChildrenList card={card} />
          )}
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
        <p className="font-mono text-[10px] text-gray-400">
          {card.specPath ? "spec id" : "id"}: {card.specId}
        </p>
      </aside>
    </div>
  );
}

function ChildrenList({ card }: { card: Card }) {
  const children = card.children ?? [];
  const done = children.filter((c) => c.status === "done").length;
  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-dashed border-gray-300 p-3 text-[13px] text-gray-500">
        This {card.level.toLowerCase()} groups work and has no spec of its own.
      </p>
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-gray-400">
          Children · {done}/{children.length} done
        </p>
        {children.map((child) => (
          <div key={child.title} className="flex items-center gap-2 text-[13px] text-gray-700">
            <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_META[child.status].dot}`} />
            <span className="truncate">{child.title}</span>
          </div>
        ))}
      </div>
    </div>
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
