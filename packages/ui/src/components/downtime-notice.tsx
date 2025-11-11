import { cn } from "@eye-note/ui/src/lib/utils";

type DowntimeNoticeProps = {
    title ?: string;
    description ?: string;
    className ?: string;
};

const DEFAULT_TITLE = "Oops, something went wrong";
const DEFAULT_DESCRIPTION = "We're having trouble reaching the servers. Try again in a moment.";

export function DowntimeNotice ( {
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    className,
} : DowntimeNoticeProps ) {
    return (
        <div className={ cn( "space-y-3", className ) }>
            <h2 className="text-lg font-semibold text-destructive">
                { title }
            </h2>
            <p className="text-sm text-muted-foreground">
                { description }
            </p>
        </div>
    );
}

export type { DowntimeNoticeProps };
