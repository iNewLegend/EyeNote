import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button.tsx";
import { Menu } from "lucide-react";

enum DEFAULT_MENU_ITEMS {
    Roles = "roles",
    Groups = "groups",
    Settings = "settings",
    QuickLunch = "quick-lunch",
}

interface QuickMenuDialogProps {
    open : boolean;
    dialogContainer ?: HTMLElement | null;
    onSelect : ( item : PossibleItems ) => void;
    onOpenChange : ( open : boolean ) => void;
}

const dialogClassName =
    "max-h-[85vh] overflow-y-auto w-[min(90vw,640px)] max-w-[640px] space-y-6 w-[350px]";

export const QuickMenuDialog : React.FC<QuickMenuDialogProps> = ( {
    open,
    dialogContainer,
    onOpenChange,
    onSelect,
} ) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
            container={dialogContainer ?? undefined}
            className={dialogClassName}
        >
            <DialogHeader>
                <DialogTitle>Quick Lunch</DialogTitle>
                <DialogDescription>
                    Launch any tool and learn the core shortcuts without leveraging this page.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
                <Button
                    className="w-full justify-between"
                    onClick={ () => onSelect( DEFAULT_MENU_ITEMS.Roles ) }
                >
                    <span>Groups</span>
                    <kbd className="mx-1 px-1.5 py-0.5 text-[10px] font-mono border rounded-md bg-secondary">
                        SHIFT
                    </kbd>
                </Button>

                <Button
                    className="w-full justify-between"
                    onClick={ () => onSelect( DEFAULT_MENU_ITEMS.Roles ) }
                >
                    <span>Roles</span>
                    <kbd className="mx-1 px-1.5 py-0.5 text-[10px] font-mono border rounded-md bg-secondary">
                        SHIFT
                    </kbd>
                </Button>
            </div>
            <DialogFooter className="justify-end">
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

