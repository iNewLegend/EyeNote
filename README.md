# EyeNote

See what others see! EyeNote is a browser extension that lets you create and share notes on any webpage element.

## Features

- Create notes on any webpage element using Inspector Mode
- Join and manage note groups for collaboration
- Select which groups are active for interaction
- See notes from your active groups while browsing
- Real-time chat in notes
- Cross-website compatibility
- Interactive note markers
- Per-group marker colors to instantly distinguish collaborators
- Group-specific visibility (notes are only visible to group members)
- **Discord-like role system** with granular permissions and hierarchy
- **Custom roles** with specific permissions for different team members
- **Role-based access control** for group management and content moderation

## How It Works

1. **Join Groups**: Join different note groups based on your interests or team
2. **Enable Groups**: Select which groups you want to interact with
3. **Use Inspector Mode**: Hold SHIFT to activate Inspector Mode, then click on any element to create a note
4. **Group Visibility**: Notes are only visible to members of the group they belong to
5. **Real-time Chat**: Open any note to chat with group members
6. **Automatic Discovery**: As you browse, see notes from your group members automatically
7. **Role Management**: Group owners can create custom roles with specific permissions
8. **Permission Control**: Roles determine what actions members can perform (create notes, moderate content, manage roles, etc.)

### IDE Integrations

Our IDE integrations bring EyeNote's collaborative annotation power directly into your development workflow:

#### Code Annotation & Collaboration

**VSCode Extension:**

- Use Inspector Mode to select any code segment and add notes visible to your development team
- Highlighted code sections show where teammates have left comments
- Hover over inspected code to preview notes without opening the full discussion
- Click on inspected sections to open a discussion panel with threaded conversations
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

### AI-Powered Content Analysis

**MCP (Model Context Protocol) Integration:**

EyeNote will integrate with MCP to enable AI-powered content analysis and automatic note generation:

- **Intelligent Content Analysis**: LLMs can analyze page content and automatically identify key sections, important information, or areas that might benefit from annotations
- **Contextual Note Generation**: AI can create relevant notes based on page content, user preferences, and group context
- **Smart Suggestions**: The system can suggest where notes might be helpful based on content patterns, user behavior, and group activity
- **Automated Documentation**: For technical content, AI can automatically generate explanatory notes for complex concepts, code snippets, or technical documentation
- **Content Summarization**: AI can create summary notes for long articles or complex pages, helping users quickly understand key points
- **Accessibility Enhancement**: AI can identify and annotate accessibility issues or suggest improvements for better user experience
- **Learning Assistance**: For educational content, AI can generate study notes, highlight important concepts, or create quiz questions
- **Research Support**: AI can help researchers by identifying relevant information, creating citations, or suggesting related topics

The MCP integration will work seamlessly with existing group functionality, allowing AI-generated notes to be shared with appropriate groups and maintaining the collaborative nature of the platform.

### Role System & Permissions

EyeNote features a comprehensive Discord-like role system that gives group owners granular control over member permissions:

#### Default Roles

Every group automatically includes four default roles with predefined permissions:

- **Owner** (Red) - Full control over the group, cannot be removed
- **Admin** (Orange) - Manage group settings, roles, and members
- **Moderator** (Blue) - Moderate content and help manage the group
- **Member** (Purple) - Basic group participation and note creation

#### Available Permissions

- **Manage Group** - Update group settings, name, description, and color
- **Manage Roles** - Create, edit, and assign roles to members
- **Manage Members** - Kick members and manage group membership
- **Moderate Content** - Delete inappropriate notes and moderate discussions
- **Create Notes** - Create new notes on web pages
- **Edit Notes** - Modify existing notes
- **Delete Notes** - Remove notes from web pages
- **View Notes** - See notes created by other group members

#### Custom Roles

Group owners can create custom roles with specific permission combinations:

- **Reviewer** - Can view and edit notes but not delete them
- **Editor** - Can create and edit notes but not moderate content
- **Viewer** - Can only view notes, perfect for stakeholders
- **Content Moderator** - Can moderate content but not manage roles

#### Role Hierarchy

Roles are organized by position (higher numbers = more permissions):
- Higher roles can manage lower roles automatically
- Owners can manage all roles
- Admins can manage Moderator and Member roles
- Role hierarchy prevents privilege escalation

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
4. Hold SHIFT to activate Inspector Mode, then click on any element to create a note
5. Share and collaborate with your group members
6. Chat with group members in any note
7. **For Group Owners**: Click "Manage Roles" to create custom roles and assign permissions
8. **Role Management**: Create roles like "Reviewer", "Editor", "Viewer" with specific permissions

## Development

- `pnpm watch` - Start development with auto-reload
- `pnpm build` - Build for production
- `pnpm clean` - Clean build artifacts

### Modes

Inspector Mode - Enabled via holding $SHIFT_BUTTON - See cursor, highlight over elements

Inspector Mode & Add Note mode - Enabled via selection of element in the inspector mode - Adds overlay

To enable related entities like cursor dot or add note dialog
we can use state of combined modes
