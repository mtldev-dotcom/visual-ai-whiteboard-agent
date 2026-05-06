import type { Prisma } from "@/generated/prisma/client";
import { createBoard } from "../db/boards";
import { createCanvasItem } from "../db/canvas-items";

type TemplateItem = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: Prisma.InputJsonObject;
};

type BoardTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  items: TemplateItem[];
};

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "project-kickoff",
    name: "Project Kickoff",
    description: "Goals, tasks, and notes for starting a new project.",
    category: "General",
    items: [
      {
        type: "sticky_note",
        x: 60,
        y: 60,
        width: 220,
        height: 160,
        content: {
          title: "Project Goals",
          text: "What does success look like?\n\n1. \n2. \n3. ",
        },
      },
      {
        type: "task_list",
        x: 320,
        y: 60,
        width: 280,
        height: 240,
        content: {
          title: "Launch Checklist",
          tasks: [
            { completed: false, title: "Define scope" },
            { completed: false, title: "Assign owners" },
            { completed: false, title: "Set milestones" },
            { completed: false, title: "Schedule kickoff meeting" },
          ],
        },
      },
      {
        type: "kanban",
        x: 60,
        y: 260,
        width: 520,
        height: 280,
        content: {
          title: "Sprint Board",
          columns: [
            {
              id: "backlog",
              title: "Backlog",
              cards: [{ id: "b1", title: "Research phase" }],
            },
            { id: "doing", title: "In Progress", cards: [] },
            { id: "review", title: "Review", cards: [] },
            { id: "done", title: "Done", cards: [] },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 620,
        y: 260,
        width: 260,
        height: 160,
        content: {
          title: "Meeting Notes",
          text: "Date:\nAttendees:\n\nKey decisions:\n",
        },
      },
    ],
  },
  {
    id: "brainstorm",
    name: "Brainstorm Session",
    description: "Capture and organise ideas with sticky notes and a Kanban.",
    category: "General",
    items: [
      {
        type: "sticky_note",
        x: 60,
        y: 60,
        width: 200,
        height: 160,
        content: { title: "Idea 💡", text: "Write your first idea here." },
      },
      {
        type: "sticky_note",
        x: 300,
        y: 60,
        width: 200,
        height: 160,
        content: { title: "Idea 💡", text: "Another idea…" },
      },
      {
        type: "sticky_note",
        x: 540,
        y: 60,
        width: 200,
        height: 160,
        content: { title: "Idea 💡", text: "Keep going!" },
      },
      {
        type: "kanban",
        x: 60,
        y: 260,
        width: 520,
        height: 260,
        content: {
          title: "Prioritise Ideas",
          columns: [
            { id: "raw", title: "Raw Ideas", cards: [] },
            { id: "promising", title: "Promising", cards: [] },
            { id: "action", title: "Action Items", cards: [] },
          ],
        },
      },
    ],
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    description: "Reflect on wins, blockers, and next-week priorities.",
    category: "General",
    items: [
      {
        type: "task_list",
        x: 60,
        y: 60,
        width: 260,
        height: 220,
        content: {
          title: "This Week ✅",
          tasks: [
            { completed: true, title: "Team standup" },
            { completed: false, title: "Ship feature X" },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 360,
        y: 60,
        width: 220,
        height: 160,
        content: { title: "Wins 🎉", text: "What went well this week?" },
      },
      {
        type: "sticky_note",
        x: 620,
        y: 60,
        width: 220,
        height: 160,
        content: { title: "Blockers 🚧", text: "What slowed you down?" },
      },
      {
        type: "task_list",
        x: 360,
        y: 260,
        width: 280,
        height: 200,
        content: {
          title: "Next Week 🗓️",
          tasks: [
            { completed: false, title: "Priority 1" },
            { completed: false, title: "Priority 2" },
            { completed: false, title: "Priority 3" },
          ],
        },
      },
    ],
  },

  // ── Engineering ───────────────────────────────────────────────────────────
  {
    id: "engineering-sprint",
    name: "Engineering Sprint",
    description: "Sprint goal, task checklist, 5-stage board, and definition of done.",
    category: "Engineering",
    items: [
      {
        type: "sticky_note",
        x: 60,
        y: 60,
        width: 240,
        height: 160,
        content: {
          title: "Sprint Goal 🎯",
          text: "What must be true at the end of this sprint?\n\n",
          bgColor: "#dbeafe",
        },
      },
      {
        type: "task_list",
        x: 330,
        y: 60,
        width: 280,
        height: 260,
        content: {
          title: "Pre-Sprint Checklist",
          tasks: [
            { completed: false, title: "Stories estimated and refined" },
            { completed: false, title: "Acceptance criteria written" },
            { completed: false, title: "Dependencies identified" },
            { completed: false, title: "Team capacity confirmed" },
            { completed: false, title: "Sprint board created" },
          ],
        },
      },
      {
        type: "rich_text",
        x: 640,
        y: 60,
        width: 360,
        height: 260,
        content: {
          title: "Tech Design Notes",
          blocks: [
            { type: "heading", text: "Architecture" },
            { type: "paragraph", text: "Describe key design decisions and tradeoffs here." },
            { type: "callout", text: "Document any API contracts or database schema changes before coding starts." },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 1030,
        y: 60,
        width: 220,
        height: 160,
        content: {
          title: "Blockers 🚧",
          text: "List anything that could stop progress:\n\n",
          bgColor: "#fee2e2",
        },
      },
      {
        type: "kanban",
        x: 60,
        y: 350,
        width: 900,
        height: 300,
        content: {
          title: "Sprint Board",
          columns: [
            { id: "backlog", title: "Backlog", cards: [{ id: "s1", title: "User story 1" }, { id: "s2", title: "User story 2" }] },
            { id: "inprogress", title: "In Progress", cards: [] },
            { id: "review", title: "In Review", cards: [] },
            { id: "qa", title: "QA", cards: [] },
            { id: "done", title: "Done", cards: [] },
          ],
        },
      },
      {
        type: "markdown",
        x: 60,
        y: 680,
        width: 400,
        height: 220,
        content: {
          title: "Definition of Done",
          text: "## Definition of Done\n\n- [ ] Unit tests written and passing\n- [ ] PR reviewed by 2 engineers\n- [ ] Deployed to staging\n- [ ] Acceptance criteria verified\n- [ ] No regressions in CI",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 490,
        y: 680,
        width: 280,
        height: 200,
        content: {
          title: "Sprint Deadlines",
          reminders: [
            { status: "scheduled", title: "Sprint planning", when: "Monday 10 AM" },
            { status: "scheduled", title: "Mid-sprint check-in", when: "Wednesday" },
            { status: "scheduled", title: "Sprint review & retro", when: "Friday 2 PM" },
          ],
        },
      },
    ],
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  {
    id: "marketing-campaign",
    name: "Marketing Campaign",
    description: "Brief, content pipeline, audience notes, and campaign deadlines.",
    category: "Marketing",
    items: [
      {
        type: "rich_text",
        x: 60,
        y: 60,
        width: 360,
        height: 260,
        content: {
          title: "Campaign Brief",
          blocks: [
            { type: "heading", text: "Objective" },
            { type: "paragraph", text: "What is this campaign trying to achieve?" },
            { type: "heading", text: "Target Audience" },
            { type: "paragraph", text: "Describe the primary persona." },
            { type: "callout", text: "Align messaging to a single clear value proposition." },
          ],
        },
      },
      {
        type: "task_list",
        x: 450,
        y: 60,
        width: 280,
        height: 260,
        content: {
          title: "Launch Checklist",
          tasks: [
            { completed: false, title: "Campaign brief approved" },
            { completed: false, title: "Copy and assets ready" },
            { completed: false, title: "Landing page live" },
            { completed: false, title: "UTM links set up" },
            { completed: false, title: "Tracking pixels verified" },
            { completed: false, title: "Email sequence scheduled" },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 760,
        y: 60,
        width: 240,
        height: 160,
        content: {
          title: "Budget Notes 💰",
          text: "Total budget: $\nPaid ads: $\nContent creation: $\nRemaining: $",
          bgColor: "#dcfce7",
        },
      },
      {
        type: "sticky_note",
        x: 760,
        y: 250,
        width: 240,
        height: 160,
        content: {
          title: "Key Message",
          text: "One sentence that captures why customers should care:\n\n",
          bgColor: "#fef9c3",
        },
      },
      {
        type: "kanban",
        x: 60,
        y: 350,
        width: 820,
        height: 280,
        content: {
          title: "Content Pipeline",
          columns: [
            { id: "ideas", title: "Ideas", cards: [{ id: "c1", title: "Blog post: top tips" }, { id: "c2", title: "Social carousel" }] },
            { id: "draft", title: "Draft", cards: [] },
            { id: "review", title: "Review", cards: [] },
            { id: "scheduled", title: "Scheduled", cards: [] },
            { id: "published", title: "Published", cards: [] },
          ],
        },
      },
      {
        type: "markdown",
        x: 60,
        y: 660,
        width: 400,
        height: 200,
        content: {
          title: "Channel Strategy",
          text: "## Channels\n\n| Channel | Goal | Budget % |\n|---------|------|----------|\n| Paid Search | Conversions | 40% |\n| Social Ads | Awareness | 30% |\n| Email | Retention | 20% |\n| Organic | SEO | 10% |",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 490,
        y: 660,
        width: 280,
        height: 200,
        content: {
          title: "Campaign Deadlines",
          reminders: [
            { status: "scheduled", title: "Assets to design team", when: "Monday" },
            { status: "scheduled", title: "Campaign goes live", when: "Next Monday" },
            { status: "scheduled", title: "Mid-flight performance review", when: "In 2 weeks" },
          ],
        },
      },
    ],
  },

  // ── Healthcare ────────────────────────────────────────────────────────────
  {
    id: "healthcare-care-plan",
    name: "Patient Care Plan",
    description: "Patient overview, care checklist, treatment stages, and appointment reminders.",
    category: "Healthcare",
    items: [
      {
        type: "rich_text",
        x: 60,
        y: 60,
        width: 380,
        height: 280,
        content: {
          title: "Patient Overview",
          blocks: [
            { type: "heading", text: "Patient Summary" },
            { type: "paragraph", text: "Name: \nDOB: \nMRN: \nPrimary Diagnosis: " },
            { type: "heading", text: "Allergies & Alerts" },
            { type: "callout", text: "Document known drug allergies and clinical flags here." },
          ],
        },
      },
      {
        type: "task_list",
        x: 470,
        y: 60,
        width: 280,
        height: 280,
        content: {
          title: "Care Checklist",
          tasks: [
            { completed: false, title: "Vitals recorded" },
            { completed: false, title: "Medications reviewed" },
            { completed: false, title: "Pain assessment completed" },
            { completed: false, title: "Patient education provided" },
            { completed: false, title: "Discharge criteria reviewed" },
            { completed: false, title: "Follow-up appointment booked" },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 780,
        y: 60,
        width: 240,
        height: 160,
        content: {
          title: "Clinical Notes 📋",
          text: "Date:\nPractitioner:\n\nObservations:\n\n",
          bgColor: "#dbeafe",
        },
      },
      {
        type: "sticky_note",
        x: 780,
        y: 250,
        width: 240,
        height: 160,
        content: {
          title: "Alerts ⚠️",
          text: "Fall risk: \nIsolation precautions: \nDiet restrictions: \n",
          bgColor: "#fee2e2",
        },
      },
      {
        type: "kanban",
        x: 60,
        y: 370,
        width: 720,
        height: 280,
        content: {
          title: "Treatment Stages",
          columns: [
            { id: "assess", title: "Assessment", cards: [{ id: "t1", title: "Initial evaluation" }] },
            { id: "plan", title: "Treatment Plan", cards: [] },
            { id: "active", title: "Active Treatment", cards: [] },
            { id: "monitor", title: "Monitoring", cards: [] },
            { id: "discharge", title: "Discharge Ready", cards: [] },
          ],
        },
      },
      {
        type: "markdown",
        x: 60,
        y: 680,
        width: 380,
        height: 200,
        content: {
          title: "Medication Reference",
          text: "## Medications\n\n| Drug | Dose | Frequency | Route |\n|------|------|-----------|-------|\n| | | | |\n\n## Contraindications\n\n- ",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 470,
        y: 680,
        width: 280,
        height: 200,
        content: {
          title: "Appointments",
          reminders: [
            { status: "scheduled", title: "Follow-up consult", when: "In 1 week" },
            { status: "scheduled", title: "Lab results review", when: "In 3 days" },
            { status: "scheduled", title: "Physiotherapy session", when: "Tomorrow" },
          ],
        },
      },
    ],
  },

  // ── Restaurant ────────────────────────────────────────────────────────────
  {
    id: "restaurant-ops",
    name: "Restaurant Operations",
    description: "Daily prep checklist, order queue, specials, and restock reminders.",
    category: "Operations",
    items: [
      {
        type: "sticky_note",
        x: 60,
        y: 60,
        width: 260,
        height: 180,
        content: {
          title: "Today's Specials 🍽️",
          text: "Appetizer: \nMain: \nDessert: \nDrink pairing: \n\nSoups: ",
          bgColor: "#fef9c3",
        },
      },
      {
        type: "task_list",
        x: 350,
        y: 60,
        width: 280,
        height: 280,
        content: {
          title: "Daily Prep Checklist",
          tasks: [
            { completed: false, title: "Mise en place for service" },
            { completed: false, title: "Check cold storage temps" },
            { completed: false, title: "Bread and dough proofed" },
            { completed: false, title: "Stock and sauces prepared" },
            { completed: false, title: "Staff briefed on specials" },
            { completed: false, title: "POS and printers tested" },
            { completed: false, title: "Reservation sheet reviewed" },
          ],
        },
      },
      {
        type: "rich_text",
        x: 660,
        y: 60,
        width: 360,
        height: 260,
        content: {
          title: "Menu Planning",
          blocks: [
            { type: "heading", text: "This Week's Focus" },
            { type: "paragraph", text: "Seasonal ingredients to feature this week." },
            { type: "heading", text: "Upcoming Menu Changes" },
            { type: "callout", text: "Communicate all 86'd items to front-of-house immediately." },
          ],
        },
      },
      {
        type: "kanban",
        x: 60,
        y: 370,
        width: 720,
        height: 280,
        content: {
          title: "Order Queue",
          columns: [
            { id: "received", title: "Received", cards: [{ id: "o1", title: "Table 4 — 3 covers" }] },
            { id: "prep", title: "In Prep", cards: [] },
            { id: "plating", title: "Plating", cards: [] },
            { id: "ready", title: "Ready to Serve", cards: [] },
          ],
        },
      },
      {
        type: "markdown",
        x: 60,
        y: 680,
        width: 380,
        height: 200,
        content: {
          title: "Recipe Notes",
          text: "## Signature Dish Notes\n\n- Plating style:\n- Temperature check:\n- Allergen info:\n\n## Staff Notes\n\n- Substitutions approved:\n- VIP tables tonight:",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 470,
        y: 680,
        width: 280,
        height: 200,
        content: {
          title: "Restock & Deliveries",
          reminders: [
            { status: "scheduled", title: "Produce delivery", when: "Tomorrow 7 AM" },
            { status: "scheduled", title: "Seafood order due", when: "Wednesday" },
            { status: "scheduled", title: "Linen pickup", when: "Thursday" },
          ],
        },
      },
    ],
  },

  // ── Real Estate ───────────────────────────────────────────────────────────
  {
    id: "real-estate-pipeline",
    name: "Real Estate Pipeline",
    description: "Deal pipeline, property notes, closing checklist, and follow-up reminders.",
    category: "Real Estate",
    items: [
      {
        type: "kanban",
        x: 60,
        y: 60,
        width: 980,
        height: 300,
        content: {
          title: "Deal Pipeline",
          columns: [
            { id: "leads", title: "Leads", cards: [{ id: "r1", title: "123 Elm St — Smith family" }, { id: "r2", title: "45 Oak Ave — Johnson" }] },
            { id: "showing", title: "Showing", cards: [] },
            { id: "offer", title: "Offer Made", cards: [] },
            { id: "duedil", title: "Due Diligence", cards: [] },
            { id: "closed", title: "Closed", cards: [] },
          ],
        },
      },
      {
        type: "rich_text",
        x: 60,
        y: 390,
        width: 360,
        height: 260,
        content: {
          title: "Property Notes",
          blocks: [
            { type: "heading", text: "Active Listing" },
            { type: "paragraph", text: "Address: \nList price: \nBed/Bath: \nSq ft: \nDays on market: " },
            { type: "callout", text: "Note unique selling points and any price reduction history." },
          ],
        },
      },
      {
        type: "task_list",
        x: 450,
        y: 390,
        width: 280,
        height: 260,
        content: {
          title: "Closing Checklist",
          tasks: [
            { completed: false, title: "Offer letter signed" },
            { completed: false, title: "Home inspection booked" },
            { completed: false, title: "Financing confirmed" },
            { completed: false, title: "Title search ordered" },
            { completed: false, title: "Final walkthrough done" },
            { completed: false, title: "Closing documents signed" },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 760,
        y: 390,
        width: 240,
        height: 160,
        content: {
          title: "Market Notes 📊",
          text: "Avg days on market: \nMedian price: \nInventory level: \nBuyer/seller market: ",
          bgColor: "#dcfce7",
        },
      },
      {
        type: "markdown",
        x: 60,
        y: 680,
        width: 380,
        height: 200,
        content: {
          title: "Comparable Sales",
          text: "## Comps\n\n| Address | Sold Price | Sq Ft | $/Sq Ft | DOM |\n|---------|------------|-------|---------|-----|\n| | | | | |\n\n**Adjusted value estimate:** $",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 470,
        y: 680,
        width: 280,
        height: 200,
        content: {
          title: "Follow-up Reminders",
          reminders: [
            { status: "scheduled", title: "Call Smith family re: offer", when: "Tomorrow 10 AM" },
            { status: "scheduled", title: "Open house prep", when: "Saturday 9 AM" },
            { status: "scheduled", title: "Inspection appointment", when: "Next Tuesday" },
          ],
        },
      },
    ],
  },

  // ── Education ─────────────────────────────────────────────────────────────
  {
    id: "classroom-lesson",
    name: "Classroom Lesson Plan",
    description: "Learning objectives, activities, student progress tracker, and assignment deadlines.",
    category: "Education",
    items: [
      {
        type: "rich_text",
        x: 60,
        y: 60,
        width: 380,
        height: 280,
        content: {
          title: "Lesson Plan",
          blocks: [
            { type: "heading", text: "Topic & Grade Level" },
            { type: "paragraph", text: "Subject: \nGrade: \nDuration: \nStandards aligned: " },
            { type: "heading", text: "Warm-Up Activity" },
            { type: "paragraph", text: "5-minute activator to engage prior knowledge." },
            { type: "callout", text: "Differentiation: note accommodations for IEP/ELL students." },
          ],
        },
      },
      {
        type: "task_list",
        x: 470,
        y: 60,
        width: 280,
        height: 280,
        content: {
          title: "Learning Objectives",
          tasks: [
            { completed: false, title: "Students can identify key concepts" },
            { completed: false, title: "Students can apply the method" },
            { completed: false, title: "Students complete exit ticket" },
            { completed: false, title: "Formative assessment reviewed" },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 780,
        y: 60,
        width: 240,
        height: 160,
        content: {
          title: "Discussion Prompts 💬",
          text: "1. \n2. \n3. \n\nExtension question:\n",
          bgColor: "#f3e8ff",
        },
      },
      {
        type: "sticky_note",
        x: 780,
        y: 250,
        width: 240,
        height: 160,
        content: {
          title: "Materials Needed",
          text: "- Whiteboard\n- Handouts (print 30)\n- Lab supplies:\n- Digital resource URL:",
          bgColor: "#dbeafe",
        },
      },
      {
        type: "kanban",
        x: 60,
        y: 370,
        width: 720,
        height: 280,
        content: {
          title: "Student Progress Tracker",
          columns: [
            { id: "notstarted", title: "Not Started", cards: [{ id: "e1", title: "Group A" }, { id: "e2", title: "Group B" }] },
            { id: "inprog", title: "In Progress", cards: [] },
            { id: "needshelp", title: "Needs Support", cards: [] },
            { id: "complete", title: "Complete", cards: [] },
          ],
        },
      },
      {
        type: "markdown",
        x: 60,
        y: 680,
        width: 360,
        height: 200,
        content: {
          title: "Reference Materials",
          text: "## Resources\n\n- Textbook: Ch. \n- Video: [link]\n- Practice worksheet: [link]\n\n## Vocabulary\n\n| Term | Definition |\n|------|------------|\n| | |",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 450,
        y: 680,
        width: 280,
        height: 200,
        content: {
          title: "Assignment Deadlines",
          reminders: [
            { status: "scheduled", title: "Quiz — Unit 3", when: "Friday" },
            { status: "scheduled", title: "Project draft due", when: "Next Wednesday" },
            { status: "scheduled", title: "Parent-teacher conferences", when: "In 2 weeks" },
          ],
        },
      },
    ],
  },

  // ── Startup ───────────────────────────────────────────────────────────────
  {
    id: "startup-strategy",
    name: "Startup Strategy",
    description: "Vision, OKRs, product roadmap, and key milestones for early-stage teams.",
    category: "Startup",
    items: [
      {
        type: "sticky_note",
        x: 60,
        y: 60,
        width: 300,
        height: 160,
        content: {
          title: "Vision 🚀",
          text: "In one sentence: we exist to help [who] achieve [outcome] by [how].\n\n",
          bgColor: "#f3e8ff",
        },
      },
      {
        type: "rich_text",
        x: 390,
        y: 60,
        width: 400,
        height: 300,
        content: {
          title: "OKRs — This Quarter",
          blocks: [
            { type: "heading", text: "Objective 1" },
            { type: "paragraph", text: "KR 1: \nKR 2: \nKR 3: " },
            { type: "heading", text: "Objective 2" },
            { type: "paragraph", text: "KR 1: \nKR 2: " },
            { type: "callout", text: "OKRs should be ambitious. 70% completion = success." },
          ],
        },
      },
      {
        type: "task_list",
        x: 820,
        y: 60,
        width: 280,
        height: 260,
        content: {
          title: "This Month's Focus",
          tasks: [
            { completed: false, title: "Validate core assumption" },
            { completed: false, title: "Talk to 10 customers" },
            { completed: false, title: "Ship MVP feature" },
            { completed: false, title: "Review metrics dashboard" },
            { completed: false, title: "Investor update sent" },
          ],
        },
      },
      {
        type: "kanban",
        x: 60,
        y: 390,
        width: 860,
        height: 280,
        content: {
          title: "Product Roadmap",
          columns: [
            { id: "q1", title: "Q1 — Now", cards: [{ id: "p1", title: "Core auth flow" }, { id: "p2", title: "Onboarding" }] },
            { id: "q2", title: "Q2 — Next", cards: [{ id: "p3", title: "Integrations" }] },
            { id: "q3", title: "Q3 — Later", cards: [{ id: "p4", title: "Enterprise features" }] },
            { id: "q4", title: "Q4 — Future", cards: [] },
          ],
        },
      },
      {
        type: "markdown",
        x: 60,
        y: 700,
        width: 440,
        height: 220,
        content: {
          title: "Business Model Canvas",
          text: "## Business Model\n\n**Problem:** \n\n**Solution:** \n\n**Unique value prop:** \n\n**Customer segments:** \n\n**Revenue streams:** \n\n**Key metrics:** ",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 530,
        y: 700,
        width: 280,
        height: 200,
        content: {
          title: "Milestone Dates",
          reminders: [
            { status: "scheduled", title: "Beta launch", when: "End of month" },
            { status: "scheduled", title: "Board meeting", when: "Next Monday" },
            { status: "scheduled", title: "Fundraising round close", when: "In 6 weeks" },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 840,
        y: 700,
        width: 240,
        height: 160,
        content: {
          title: "Assumptions to Test 🧪",
          text: "1. Customers will pay $X/mo\n2. CAC < LTV/3\n3. Referral rate > 20%\n",
          bgColor: "#fef9c3",
        },
      },
    ],
  },

  // ── HR ────────────────────────────────────────────────────────────────────
  {
    id: "hr-onboarding",
    name: "New Hire Onboarding",
    description: "Welcome message, week-by-week checklist, onboarding progress, and key contacts.",
    category: "HR",
    items: [
      {
        type: "rich_text",
        x: 60,
        y: 60,
        width: 380,
        height: 260,
        content: {
          title: "Welcome to the Team! 👋",
          blocks: [
            { type: "heading", text: "We're excited to have you here" },
            { type: "paragraph", text: "Role: \nStart date: \nManager: \nTeam: " },
            { type: "callout", text: "Your first 90 days are about learning, not delivering. Ask questions freely." },
          ],
        },
      },
      {
        type: "task_list",
        x: 470,
        y: 60,
        width: 280,
        height: 280,
        content: {
          title: "Week 1 Checklist",
          tasks: [
            { completed: false, title: "Accounts and access set up" },
            { completed: false, title: "HR paperwork completed" },
            { completed: false, title: "Meet your team" },
            { completed: false, title: "Laptop and tools configured" },
            { completed: false, title: "Read company handbook" },
            { completed: false, title: "1:1 with manager scheduled" },
          ],
        },
      },
      {
        type: "task_list",
        x: 780,
        y: 60,
        width: 280,
        height: 280,
        content: {
          title: "Weeks 2–4 Checklist",
          tasks: [
            { completed: false, title: "Shadow key team members" },
            { completed: false, title: "Complete training modules" },
            { completed: false, title: "Attend sprint / planning meeting" },
            { completed: false, title: "First small contribution shipped" },
            { completed: false, title: "30-day check-in with manager" },
          ],
        },
      },
      {
        type: "kanban",
        x: 60,
        y: 360,
        width: 720,
        height: 280,
        content: {
          title: "Onboarding Progress",
          columns: [
            { id: "todo", title: "To Do", cards: [{ id: "h1", title: "IT setup" }, { id: "h2", title: "Payroll enrollment" }] },
            { id: "inprog", title: "In Progress", cards: [] },
            { id: "pending", title: "Pending Approval", cards: [] },
            { id: "done", title: "Complete", cards: [] },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 810,
        y: 360,
        width: 260,
        height: 180,
        content: {
          title: "Key Contacts 📞",
          text: "Manager: \nHR partner: \nIT helpdesk: \nOffice manager: \nBuddy / mentor: ",
          bgColor: "#dcfce7",
        },
      },
      {
        type: "markdown",
        x: 60,
        y: 670,
        width: 400,
        height: 200,
        content: {
          title: "Resources & Links",
          text: "## Essential Links\n\n- Company handbook: [link]\n- Benefits portal: [link]\n- Org chart: [link]\n- Engineering docs / wiki: [link]\n- Slack workspace: [link]\n\n## Tools Access\n\n- [ ] GitHub\n- [ ] Notion / Confluence\n- [ ] Jira / Linear\n- [ ] Figma",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 490,
        y: 670,
        width: 280,
        height: 200,
        content: {
          title: "Check-in Meetings",
          reminders: [
            { status: "scheduled", title: "30-day review", when: "In 30 days" },
            { status: "scheduled", title: "60-day check-in", when: "In 60 days" },
            { status: "scheduled", title: "90-day review", when: "In 90 days" },
          ],
        },
      },
    ],
  },

  // ── UX Design Sprint ──────────────────────────────────────────────────────
  {
    id: "design-sprint",
    name: "UX Design Sprint",
    description: "Problem statement, personas, 5-stage sprint board, and sprint schedule.",
    category: "Design",
    items: [
      {
        type: "sticky_note",
        x: 60,
        y: 60,
        width: 300,
        height: 180,
        content: {
          title: "Problem Statement 🔍",
          text: "How might we help [user type] to [achieve goal] so that [outcome]?\n\n",
          bgColor: "#fce7f3",
        },
      },
      {
        type: "rich_text",
        x: 390,
        y: 60,
        width: 380,
        height: 300,
        content: {
          title: "User Personas",
          blocks: [
            { type: "heading", text: "Persona 1" },
            { type: "paragraph", text: "Name: \nRole: \nGoal: \nFrustration: " },
            { type: "heading", text: "Persona 2" },
            { type: "paragraph", text: "Name: \nRole: \nGoal: \nFrustration: " },
          ],
        },
      },
      {
        type: "task_list",
        x: 800,
        y: 60,
        width: 280,
        height: 260,
        content: {
          title: "Sprint Activities",
          tasks: [
            { completed: false, title: "Map the user journey" },
            { completed: false, title: "Lightning demos (20 min)" },
            { completed: false, title: "Crazy 8s sketching" },
            { completed: false, title: "Solution sketch voting" },
            { completed: false, title: "Prototype built" },
            { completed: false, title: "User tests conducted" },
          ],
        },
      },
      {
        type: "kanban",
        x: 60,
        y: 390,
        width: 900,
        height: 280,
        content: {
          title: "Design Sprint Stages",
          columns: [
            { id: "understand", title: "Understand", cards: [{ id: "d1", title: "Customer interviews" }, { id: "d2", title: "Analytics review" }] },
            { id: "define", title: "Define", cards: [] },
            { id: "ideate", title: "Ideate", cards: [] },
            { id: "prototype", title: "Prototype", cards: [] },
            { id: "test", title: "Test", cards: [] },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 60,
        y: 700,
        width: 280,
        height: 180,
        content: {
          title: "Key Insights 💡",
          text: "From research:\n1. \n2. \n3. \n\nHypothesis to test:",
          bgColor: "#fef9c3",
        },
      },
      {
        type: "markdown",
        x: 370,
        y: 700,
        width: 360,
        height: 200,
        content: {
          title: "How Might We...",
          text: "## HMW Statements\n\n- HMW reduce friction at checkout?\n- HMW make onboarding feel personal?\n- HMW surface the most relevant content?\n\n## Success Metrics\n\n- Task success rate > 80%\n- Time-on-task < 2 min\n- SUS score > 75",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 760,
        y: 700,
        width: 280,
        height: 200,
        content: {
          title: "Sprint Schedule",
          reminders: [
            { status: "scheduled", title: "Day 1 — Understand & Map", when: "Monday" },
            { status: "scheduled", title: "Day 3 — Prototype begins", when: "Wednesday" },
            { status: "scheduled", title: "Day 5 — User testing", when: "Friday" },
          ],
        },
      },
    ],
  },

  // ── Sales ─────────────────────────────────────────────────────────────────
  {
    id: "sales-pipeline",
    name: "Sales Pipeline",
    description: "Prospect pipeline, daily activities, deal notes, and follow-up reminders.",
    category: "Sales",
    items: [
      {
        type: "kanban",
        x: 60,
        y: 60,
        width: 1080,
        height: 300,
        content: {
          title: "Sales Pipeline",
          columns: [
            { id: "prospect", title: "Prospect", cards: [{ id: "sl1", title: "Acme Corp — Jane Doe" }, { id: "sl2", title: "TechStart — Bob Lee" }] },
            { id: "qualify", title: "Qualify", cards: [] },
            { id: "demo", title: "Demo", cards: [] },
            { id: "proposal", title: "Proposal", cards: [] },
            { id: "negotiate", title: "Negotiation", cards: [] },
            { id: "won", title: "Closed Won", cards: [] },
          ],
        },
      },
      {
        type: "task_list",
        x: 60,
        y: 390,
        width: 280,
        height: 260,
        content: {
          title: "Daily Sales Activities",
          tasks: [
            { completed: false, title: "Review pipeline — 5 updates" },
            { completed: false, title: "Cold outreach — 10 contacts" },
            { completed: false, title: "Follow up on open proposals" },
            { completed: false, title: "Log calls in CRM" },
            { completed: false, title: "LinkedIn engagement" },
          ],
        },
      },
      {
        type: "rich_text",
        x: 370,
        y: 390,
        width: 380,
        height: 260,
        content: {
          title: "Deal Notes",
          blocks: [
            { type: "heading", text: "Active Deal" },
            { type: "paragraph", text: "Company: \nContact: \nDeal size: \nClose date: \nDecision maker: " },
            { type: "callout", text: "Identify the champion and the blocker for every deal in negotiation." },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 780,
        y: 390,
        width: 240,
        height: 160,
        content: {
          title: "Top Opportunities 🏆",
          text: "1. \n2. \n3. \n\nTotal pipeline value: $",
          bgColor: "#dcfce7",
        },
      },
      {
        type: "markdown",
        x: 60,
        y: 680,
        width: 400,
        height: 220,
        content: {
          title: "Objection Handling",
          text: "## Common Objections\n\n**\"Too expensive\"** — Reframe as ROI: \n\n**\"Not the right time\"** — Ask: what would need to change? \n\n**\"Need to think about it\"** — Set a specific follow-up date.\n\n**\"Using a competitor\"** — Highlight 3 differentiators: ",
          mode: "reader",
        },
      },
      {
        type: "reminders",
        x: 490,
        y: 680,
        width: 280,
        height: 200,
        content: {
          title: "Follow-up Reminders",
          reminders: [
            { status: "scheduled", title: "Demo follow-up — Acme Corp", when: "Tomorrow" },
            { status: "scheduled", title: "Proposal deadline — TechStart", when: "Friday" },
            { status: "scheduled", title: "Monthly pipeline review", when: "End of month" },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 800,
        y: 680,
        width: 240,
        height: 160,
        content: {
          title: "This Month's Target 🎯",
          text: "Revenue goal: $\nDeals to close: \nAvg deal size: $\n\nCurrent attainment: %",
          bgColor: "#fef9c3",
        },
      },
    ],
  },
];

export async function createBoardFromTemplate(
  templateId: string,
  workspaceId: string,
): Promise<{ boardId: string; boardTitle: string } | null> {
  const template = BOARD_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const board = await createBoard({
    createdBy: "user",
    description: template.description,
    title: template.name,
    workspaceId,
  });

  await Promise.all(
    template.items.map((item) =>
      createCanvasItem({
        boardId: board.id,
        content: item.content,
        createdBy: "system",
        height: item.height,
        type: item.type,
        width: item.width,
        workspaceId,
        x: item.x,
        y: item.y,
      }),
    ),
  );

  return { boardId: board.id, boardTitle: board.title };
}
