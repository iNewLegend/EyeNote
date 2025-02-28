# EyeNote

See what others see! EyeNote is a browser extension that lets you create and share notes on any webpage element.

## Features

- Create notes on any webpage element
- Join and manage note groups for collaboration
- Select which groups are active for interaction
- See notes from your active groups while browsing
- Real-time chat in notes
- Cross-website compatibility
- Interactive note markers
- Group-specific visibility (notes are only visible to group members)

## How It Works

1. **Join Groups**: Join different note groups based on your interests or team
2. **Enable Groups**: Select which groups you want to interact with
3. **Create Notes**: Hold SHIFT and click anywhere to create a note
4. **Group Visibility**: Notes are only visible to members of the group they belong to
5. **Real-time Chat**: Open any note to chat with group members
6. **Automatic Discovery**: As you browse, see notes from your group members automatically

### IDE Integrations

Our IDE integrations bring EyeNote's collaborative annotation power directly into your development workflow:

#### Code Annotation & Collaboration

**VSCode Extension:**

- Select any code segment and add notes visible to your development team
- Highlighted code sections show where teammates have left comments
- Hover over highlighted code to preview notes without opening the full discussion
- Click on highlighted sections to open a discussion panel with threaded conversations
- Group-specific visibility ensures you only see notes from relevant teams (frontend, backend, design, etc.)
- Real-time updates when team members add comments to code you're currently viewing
- Notes persist between sessions and sync across team members

**JetBrains Plugin:**

- Native code selection annotation that preserves syntax highlighting
- Split-view option shows code and discussions side-by-side
- Filter notes by team member, date, or resolution status
- Integrated with version control to maintain note relevance across branches
- "Watch" specific code regions to receive notifications about new comments
- Export discussions for inclusion in documentation or meeting notes
- Track resolved vs. open discussions with visual indicators

Both integrations help development teams:

- Discuss implementation details without switching contexts
- Onboard new team members with contextual code explanations
- Document complex logic directly where it's implemented
- Collaborate asynchronously without cluttering the codebase with comments
- Make collective decisions with full discussion history preserved

## Getting Started

1. Clone this repository
2. Install dependencies:
    ```bash
    pnpm install
    ```
3. Start development:
    ```bash
    pnpm watch
    ```
4. Load the extension in Chrome:
    - Go to `chrome://extensions/`
    - Enable "Developer mode"
    - Click "Load unpacked"
    - Select the `apps/frontend/extension` directory

## Usage

1. Click the EyeNote icon to open settings
2. Join or create note groups
3. Enable the groups you want to interact with
4. Hold SHIFT and click anywhere to create a note
5. Share and collaborate with your group members
6. Chat with group members in any note

## Development

- `pnpm watch` - Start development with auto-reload
- `pnpm build` - Build for production
- `pnpm clean` - Clean build artifacts
