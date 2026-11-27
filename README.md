# Service Portal: Internal Request Management System

An internal web app where employees create, track, and update requests (IT, Facilities, HR, Other).

Setup, features, and full documentation: [ProjectREADME.md](ProjectREADME.md).

## Technology choices

| Layer            | Choice                                    | Main reason                                                                                         |
| ---------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Frontend         | React, TypeScript, Vite                   | Compile-time type checks across the UI; fast dev server and builds                                  |
| Routing and data | React Router, TanStack Query              | Views live in the URL; server data is cached and refreshed automatically                            |
| Styling          | Tailwind CSS                              | Brand colours and spacing set in one place, with no component library to maintain                   |
| Backend          | Node.js, Express, TypeScript              | One language across the stack; a small, explicit API layer                                          |
| Validation       | Zod                                       | Checks data at runtime and derives TypeScript types from the same schema                            |
| Database         | PostgreSQL, Prisma                        | Relational data with constraints; versioned migrations and a typed client                           |
| Testing          | Vitest, React Testing Library, Playwright | Each layer catches different failures; API tests run against a real database                        |
| Local setup      | Docker Compose, npm workspaces            | One command starts the database; one install covers client, server, and end-to-end tests            |
| Hosting          | Render (free tier)                        | Site, API, and database defined in one Blueprint (`render.yaml`); free, with limits described below |

Decisions and trade-offs are recorded as ADRs in [docs/architecture/decisions/](docs/architecture/decisions/).

## How I used AI

I built this with Claude Code (Anthropic's AI coding assistant) as a pair programmer, under the working rules in [CLAUDE.md](CLAUDE.md). I also created a Claude agent to help me write more efficient prompts. Before I hand a task to Claude Code, the agent helps me turn a rough request into a clear one: the goal, the relevant files, the constraints, and what "done" looks like. The aim was fewer correction rounds and less wasted effort on both sides.

- **I set the requirements and made the decisions.** For each piece of work, the AI inspected the existing code and wrote a proposal with options and trade-offs. I chose between them, and significant choices are recorded as ADRs.
- **Nothing changed without my approval.** Every file change, commit, push, and pull request needed my sign-off first. I reviewed and merged every pull request myself.
- **The AI wrote most of the code, tests, and documentation, and checked its own work.** Before I reviewed anything, it ran the test suite, type checks, linting, and builds. It also checked the interface in a browser for layout, keyboard navigation, and colour contrast.
- **I connected it to tools through MCP (Model Context Protocol).** Context7 gave it current documentation for libraries such as Prisma, TanStack Query, and Tailwind, rather than relying on what it learned in training. Playwright MCP let it open the running app in a browser to check layouts, keyboard navigation, and colour contrast.
- **It was weakest at visual design.** Its layouts and CSS usually worked and passed the accessibility checks, but they didn't always look or feel right. It couldn't judge spacing, visual hierarchy, or what felt natural to use the way a person looking at the screen can. I often had to redirect it: for example, I reverted radio-button cards to a dropdown and reordered the form fields. Several pages took more than one round of restyling. This is also why a UI/UX design pass is on my improvement list.

## What I'd improve with more time

- **Authentication, role-based access control, and role-specific workflows**, including rules for who may change which status.
- **Server-side filtering and pagination**, instead of filtering the full list in the browser.
- **Editing and deleting requests**, with a change history.
- **Continuous integration:** run the tests and checks on every pull request with GitHub Actions.
- **Production hosting:** a paid database with backups, an API that does not sleep, and logging and monitoring, none of which the free tier provides.
- **UI/UX:** a design pass on layout, visual hierarchy, and navigation, building on the accessibility checks already in place.
