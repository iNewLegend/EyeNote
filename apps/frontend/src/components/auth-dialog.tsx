import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast-context";

interface AuthDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSignIn = async () => {
        setIsLoading(true);
        try {
            const token = await new Promise<string>((resolve, reject) => {
                chrome.identity.getAuthToken(
                    {
                        interactive: true,
                        scopes: [
                            "https://www.googleapis.com/auth/userinfo.email",
                            "https://www.googleapis.com/auth/userinfo.profile",
                        ],
                    },
                    (token) => {
                        if (chrome.runtime.lastError) {
                            console.error("Auth error:", chrome.runtime.lastError);
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        if (!token) {
                            reject(new Error("No token received"));
                            return;
                        }
                        resolve(token);
                    }
                );
            });

            const response = await chrome.runtime.sendMessage({
                type: "GOOGLE_AUTH",
                token,
            });

            if (response.success) {
                toast({
                    title: "Successfully signed in",
                    description: "Welcome to EyeNote!",
                });
                onClose();
            } else {
                throw new Error(response.error || "Authentication failed");
            }
        } catch (error) {
            console.error("Auth error:", error);
            toast({
                title: "Authentication failed",
                description: error instanceof Error ? error.message : "Please try again",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Welcome to EyeNote</DialogTitle>
                    <DialogDescription>
                        Sign in to start creating and sharing notes across the web
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    <Button className="w-full" onClick={handleSignIn} disabled={isLoading}>
                        <svg
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                            focusable="false"
                            data-prefix="fab"
                            data-icon="google"
                            role="img"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 488 512"
                        >
                            <path
                                fill="currentColor"
                                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                            ></path>
                        </svg>
                        {isLoading ? "Signing in..." : "Sign in with Google"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
