import * as React from "react";
import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from "./toast";

export interface ToastContextType {
    toast: (props: { title: string; description?: string }) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export interface Toast {
    id: string;
    title: string;
    description?: string;
}

export function ToastContextProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    const addToast = React.useCallback(
        ({ title, description }: { title: string; description?: string }) => {
            const id = Math.random().toString(36).substring(2, 9);
            setToasts((prev) => [...prev, { id, title, description }]);

            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 5000);
        },
        []
    );

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <ToastProvider>
                {toasts.map(({ id, title, description }) => (
                    <Toast key={id}>
                        <div className="grid gap-1">
                            {title && <ToastTitle>{title}</ToastTitle>}
                            {description && <ToastDescription>{description}</ToastDescription>}
                        </div>
                        <ToastClose />
                    </Toast>
                ))}
                <ToastViewport />
            </ToastProvider>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (context === undefined) {
        throw new Error("useToast must be used within a ToastContextProvider");
    }
    return context;
}
