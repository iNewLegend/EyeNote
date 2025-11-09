declare module "@radix-ui/react-select" {
    import * as React from "react";

    export const Root : React.FC<React.ComponentPropsWithoutRef<"div">>;
    export const Group : React.FC<React.ComponentPropsWithoutRef<"div">>;
    export const Value : React.FC<React.ComponentPropsWithoutRef<"span">>;

    export const Trigger : React.ForwardRefExoticComponent<any>;
    export const Icon : React.FC<{ asChild ?: boolean; children ?: React.ReactNode }>;
    export const ScrollUpButton : React.ForwardRefExoticComponent<any>;
    export const ScrollDownButton : React.ForwardRefExoticComponent<any>;
    export const Portal : React.FC<{ children ?: React.ReactNode }>;
    export const Content : React.ForwardRefExoticComponent<any>;
    export const Viewport : React.ForwardRefExoticComponent<any>;
    export const Label : React.ForwardRefExoticComponent<any>;
    export const Item : React.ForwardRefExoticComponent<any>;
    export const ItemIndicator : React.FC<{ children ?: React.ReactNode }>;
    export const ItemText : React.ForwardRefExoticComponent<any>;
    export const Separator : React.ForwardRefExoticComponent<any>;
}
