import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast-context";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    try {
      const auth = await chrome.identity.getAuthToken({ interactive: true });

      if (auth) {
        // Send message to background script to handle Google auth
        const response = await chrome.runtime.sendMessage({
          type: "GOOGLE_AUTH",
          token: auth.token,
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
      }
    } catch (error) {
      toast({
        title: "Authentication failed",
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement email/password authentication
    toast({
      title: "Not implemented",
      description: "Please use Google sign-in",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isLogin ? "Login to EyeNote" : "Create an Account"}
          </DialogTitle>
          <DialogDescription>
            {isLogin
              ? "Enter your credentials to access your notes"
              : "Sign up to start creating and sharing notes"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <Button
              className="w-full"
              onClick={handleGoogleSignIn}
              variant="outline"
            >
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
              {isLogin ? "Sign in with Google" : "Sign up with Google"}
            </Button>
            <div className="relative w-full text-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <span className="relative px-2 text-sm text-muted-foreground bg-background">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button type="submit">
                {isLogin ? "Login" : "Create Account"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Login"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
