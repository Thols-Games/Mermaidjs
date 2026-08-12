/**
 * Single source of truth for the example diagrams shown in the
 * diagram-type dropdown and the snippets/autocomplete panels.
 *
 * Previously this object was duplicated inline in index.html (and the now-deleted
 * js/globals.js). It lives here so there is exactly
 * one copy to maintain.
 *
 * Both the ES module `DIAGRAMS` export and `window.DIAGRAMS` are provided so
 * that existing inline `<script type="module">` blocks can import it and any
 * legacy code referencing the global still works.
 */
export const DIAGRAMS = {
  'none': { label: 'None', hint: 'Empty canvas', src: '' },
  'architecture': { label: 'Architecture', hint: 'architecture — cloud topology', src: `architecture-beta\n    group core(cloud)[Core]\n    service db(database)[DB] in core\n    service api(server)[API] in core\n    db:R -- L:api` },
  'block': { label: 'Block', hint: 'block-beta — nested blocks', src: `block-beta\n  columns 3\n  doc["Document"]\n  space\n  process["Process"]:2\n  doc --> process\n  process --> result["Result"]` },
  'c4': { label: 'C4 Context', hint: 'C4Context — architecture', src: `C4Context\n    title Banking system\n    Person(customer, "Customer", "A customer")\n    System(banking, "Banking System", "Allows deposits")\n    Rel(customer, banking, "Uses")` },
  'class': { label: 'Class', hint: 'classDiagram — OOP classes & relations', src: `classDiagram\n    class Animal {\n      +String name\n      +int age\n      +makeSound() void\n    }\n    class Dog {\n      +fetch() void\n    }\n    class Cat {\n      +purr() void\n    }\n    Animal <|-- Dog\n    Animal <|-- Cat` },
  'er': { label: 'Entity Relationship', hint: 'erDiagram — DB schema', src: `erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n    CUSTOMER {\n      string name\n      string email\n    }\n    ORDER {\n      int id\n      string status\n    }` },
  'flowchart': { label: 'Flowchart', hint: 'graph / flowchart — nodes & edges', src: `flowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Do it]\n    B -->|No| D[Skip]\n    C --> E([Done])\n    D --> E` },
  'gantt': { label: 'Gantt', hint: 'gantt — project schedule', src: `gantt\n    title Project plan\n    dateFormat YYYY-MM-DD\n    section Design\n    Spec      :done, a1, 2024-01-01, 7d\n    Mockups   :active, a2, after a1, 5d\n    section Build\n    Implement :b1, after a2, 10d\n    Test      :b2, after b1, 5d` },
  'gitGraph': { label: 'Git Graph', hint: 'gitGraph — branch history', src: `gitGraph\n    commit\n    commit\n    branch develop\n    checkout develop\n    commit\n    commit\n    checkout main\n    merge develop` },
  'ishikawa': { label: 'Ishikawa', hint: 'ishikawa / mindmap', src: `mindmap\n  root((Problem))\n    Cause 1\n      Detail\n    Cause 2\n      Detail` },
  'journey': { label: 'Journey', hint: 'journey — user journey map', src: `journey\n    title Buying a coffee\n    section Morning\n      Arrive: 5: Me\n      Order: 4: Me\n      Pay: 3: Me, Barista\n    section Done\n      Receive coffee: 5: Me` },
  'kanban': { label: 'Kanban', hint: 'kanban', src: `kanban\n  Todo\n    [Create Task]\n  In Progress\n    [Working]` },
  'mindmap': { label: 'Mindmap', hint: 'mindmap — radial ideas', src: `mindmap\n  root((Ideas))\n    A\n      B\n      C\n    D\n      E\n      F` },
  'packet': { label: 'Packet', hint: 'packet-beta', src: `packet-beta\n  0-15: "Source Port"\n  16-31: "Destination Port"\n  32-63: "Sequence Number"\n  64-95: "Acknowledgment Number"` },
  'pie': { label: 'Pie', hint: 'pie — proportion chart', src: `pie title Browser share\n    "Chrome" : 65\n    "Safari" : 18\n    "Firefox" : 5\n    "Other" : 12` },
  'quadrant': { label: 'Quadrant', hint: 'quadrantChart — 2x2 matrix', src: `quadrantChart\n    title Reach vs. Effort\n    x-axis Low Reach --> High Reach\n    y-axis Low Effort --> High Effort\n    quadrant-1 Plan\n    quadrant-2 Skip\n    quadrant-3 Reconsider\n    quadrant-4 Do now\n    "Feature A": [0.8, 0.25]\n    "Feature B": [0.3, 0.75]` },
  'requirement': { label: 'Requirement', hint: 'requirementDiagram — req engineering', src: `requirementDiagram\n    requirement TestReq {\n      id: 1\n      text: the test req\n      risk: high\n      verifymethod: test\n    }\n    element TestEntity {\n      type: simulation\n    }\n    TestReq - satisfies -> TestEntity` },
  'sankey': { label: 'Sankey', hint: 'sankey-beta — flow magnitude', src: `sankey-beta\n    Energy, Electricity, 5\n    Electricity, Homes, 3\n    Electricity, Industry, 2\n    Energy, Transport, 4\n    Transport, Road, 3\n    Transport, Air, 1` },
  'sequence': { label: 'Sequence', hint: 'sequenceDiagram — message lifelines', src: `sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi there\n    Alice->>Bob: How are you?\n    Bob-->>Alice: Great!` },
  'state': { label: 'State', hint: 'stateDiagram-v2 — state machines', src: `stateDiagram-v2\n    [*] --> Idle\n    Idle --> Processing: event\n    Processing --> Done: success\n    Processing --> Failed: error\n    Done --> [*]\n    Failed --> [*]` },
  'timeline': { label: 'Timeline', hint: 'timeline — chronological events', src: `timeline\n    title Project history\n    section 2023\n      Q1 : Kickoff\n      Q2 : Prototype\n    section 2024\n      Q1 : Launch\n      Q2 : Scale` }
};

if (typeof window !== 'undefined') {
  window.DIAGRAMS = DIAGRAMS;
}

export default DIAGRAMS;
