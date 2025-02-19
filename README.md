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
