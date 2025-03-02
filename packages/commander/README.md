# @eye-note/commander

A powerful command pattern implementation for React applications that enables component-to-component communication and state management. Every user action in your application should be represented as a command, making your application's behavior explicit, traceable, and maintainable.

## Features

- 🔄 Bidirectional communication between components
- 🎯 Type-safe command execution
- 🎨 Clean separation of concerns
- 🔌 Pluggable command system
- 📦 State management capabilities
- 🎭 Support for both functional and class components
- 🎬 User action tracking through commands
- 🔍 Debuggable user interactions

## Why Commands for User Actions?

Every user interaction in your application should be represented as a command because:
- 📝 Makes user actions explicit and traceable
- 🔄 Enables undo/redo capabilities
- 🎯 Centralizes business logic
- 🔍 Makes debugging easier
- 🧪 Simplifies testing
- 📊 Facilitates analytics and user behavior tracking

## Installation

```bash
npm install @eye-note/commander
# or
yarn add @eye-note/commander
```

## Basic Usage

### 1. Create Button with Command

In this real-world example from a budget allocation app, we create a simple "Add Channel" button that triggers a command:

```tsx
// components/add-channel/add-channel.tsx
import React from "react";
import { Button } from "@nextui-org/button";
import { withCommands } from "@eye-note/commander/with-commands";
import { useCommanderCommand } from "@eye-note/commander/use-commands";
import { CommandBase } from "@eye-note/commander/command-base";
import { Plus } from "@some-ui-lib/symbols";

const AddChannel = () => {
    // Get the command to use
    const command = useCommanderCommand("App/AddChannel");
    
    return (
        <div>
            <Button 
                onClick={() => command.run({})} 
                className="add-channel" 
                variant="bordered"
                radius="none"
            >
                {Plus} Add Channel
            </Button>
        </div>
    );
};

// Register the command with the component
const $$ = withCommands("App/AddChannel", AddChannel, [
    class AddChannel extends CommandBase {
        public static getName() {
            return "App/AddChannel";
        }
    }
]);

export default $$;
```

### 2. Create Commandable UI Components

This example shows how to create a UI component with commands, such as an accordion item:

```tsx
// ui-command-able/accordion/accordion-item.tsx
import React from "react";
import { withCommands } from "@eye-note/commander/with-commands";
import { CommandBase } from "@eye-note/commander/command-base";
import { UIThemeAccordionItem } from "@some-ui-lib/accordion";

export interface AccordionItemProps {
    itemKey: string;
    heading: {
        title?: string | React.ReactElement;
        // ... other props
    };
    menu?: {
        [key: string]: {
            label: string;
            action: () => void;
            color?: "default" | "primary" | "success" | "warning";
        };
    };
    // ... other props
}

const AccordionItem = (props) => {
    const { itemKey, heading = {}, menu = {} } = props;
    
    // Implement title editing functionality
    const runOnTitleChangedCommand = (newTitle: string) => {
        // Command implementation...
    };
    
    // Other handlers...
    
    return (
        <UIThemeAccordionItem {...propsInternal} key={itemKey}>
            {props.children}
        </UIThemeAccordionItem>
    );
};

// Register commands with the component
const $$ = withCommands("UI/AccordionItem", AccordionItem, [
    class Editable extends CommandBase {
        public static getName() {
            return "UI/AccordionItem/EditableTitle";
        }
    },
    class OnTitleChanged extends CommandBase {
        public static getName() {
            return "UI/AccordionItem/OnTitleChanged";
        }
    }
]);

export default $$;
```

### 3. Component Communication and Event Management

Here's how to use commands to handle component communication in a parent-child relationship with an accordion:

```tsx
// ui-command-able/accordion/accordion.tsx
import React from "react";
import { CommandBase } from "@eye-note/commander/command-base";
import { withCommands } from "@eye-note/commander/with-commands";
import { useCommanderComponent } from "@eye-note/commander/use-commands";
import AccordionItem from "./accordion-item";

export interface AccordionProps {
    children: React.ReactComponentElement<typeof AccordionItem> | 
              React.ReactComponentElement<typeof AccordionItem>[];
    selected?: {
        [key: number]: boolean
    };
    // ... other props
}

const Accordion = (props) => {
    // Handle children properly as array
    let children = Array.isArray(props.children) ? props.children : [props.children];
    
    // Access component commands
    const commands = useCommanderComponent("UI/Accordion");
    
    // State management
    const [selected, setSelected] = React.useState<{[key: string]: boolean}>({});
    
    // Selection change handling
    const onSelectionChange = (key: React.Key, value: boolean) => {
        // ... selection logic
    };
    
    return (
        <div className={`accordion ${isLoaded ? "loaded" : ""}`}>
            {/* Render accordion items */}
            {children.map((child, index) => (
                <AccordionItem {...child.props} key={index}>
                    {child.props.children}
                </AccordionItem>
            ))}
        </div>
    );
};

// Register commands with component
const $$ = withCommands("UI/Accordion", Accordion, [
    class onSelectionAttached extends CommandBase {
        public static getName() {
            return "UI/Accordion/onSelectionAttached";
        }
    },
    class onSelectionDetached extends CommandBase {
        public static getName() {
            return "UI/Accordion/onSelectionDetached";
        }
    },
]);

export default $$;
```

## Advanced Usage

### Cross-Component Command Handling in App Root

This example shows how to handle commands at the application root to coordinate actions between different views:

```tsx
// app.tsx
import React, { useEffect } from "react";
import { Tab, Tabs } from "@nextui-org/tabs";
import commandsManager from "@eye-note/commander/commands-manager";
import { useAnyComponentCommands } from "@eye-note/commander/use-commands";

function App() {
    const [selectedTab, setSelectedTab] = React.useState(location.hash.replace("#", ""));

    useEffect(() => {
        // Find a specific component by name pattern
        const addChannel = useAnyComponentCommands("App/AddChannel")[0];
        
        // Create a command ID object for execution
        const addChannelId = {
            commandName: "App/AddChannel",
            componentName: "App/AddChannel",
            componentNameUnique: addChannel.componentNameUnique,
        };

        // Handle different view states with commands
        if (location.hash === "#allocation/add-channel") {
            location.hash = "#allocation";
            setSelectedTab("allocation");

            // Execute a command after a delay
            setTimeout(() => {
                commandsManager.run(addChannelId, {});
            }, 1000);
        } 
        else if (location.hash === "#overview") {
            // Hook into a command to trigger navigation
            commandsManager.hook(addChannelId, () => {
                commandsManager.unhookWithinComponent(addChannelId.componentNameUnique);
                location.hash = "#allocation/add-channel";
                setSelectedTab("allocation");
            });
        } 
        else {
            // Clean up hooks when not needed
            commandsManager.unhookWithinComponent(addChannelId.componentNameUnique);
        }
    }, [location.hash]);

    // Rest of the component...
}
```

## Best Practices

1. **Name Commands Explicitly**: Follow a consistent naming pattern like "UI/Component/Action" (e.g., `UI/AccordionItem/EditableTitle`)
2. **Component-Specific Commands**: Keep commands scoped to their components (e.g., `App/AddChannel`)
3. **Decouple UI from Logic**: Use commands to separate UI rendering from business logic
4. **Clean Up Hooks**: Always unhook commands when they're no longer needed to prevent memory leaks
5. **Use Command IDs**: Create proper command ID objects with componentName, componentNameUnique, and commandName
6. **Component Prefixing**: Prefix component names with domain/module (e.g., "UI/", "App/")

## API Reference

### High-Order Components

- `withCommands(componentName, Component, state?, commands)` - Wraps a component with command capabilities

### Hooks

- `useCommanderCommand(commandName)` - Hook for specific command operations
- `useCommanderComponent(componentName)` - Hook for component-level operations
- `useCommanderChildrenComponents(componentName)` - Hook for managing multiple component instances
- `useCommanderState(componentName)` - Hook for accessing component state
- `useAnyComponentCommands(componentNamePattern)` - Hook to find components by name pattern

### Base Classes

- `CommandBase` - Base class for creating commands

### Manager

- `commandsManager.run(id, args, callback?)` - Execute a command
- `commandsManager.hook(id, callback, options?)` - Listen to command execution
- `commandsManager.unhook(id)` - Remove command listener
- `commandsManager.unhookWithinComponent(componentNameUnique)` - Clean up all hooks for a component

## License

MIT 