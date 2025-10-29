import defaultIcon from "@eye-note/ui/src/assets/icon.svg";

export function Header () {
    return (
        <header className="space-y-3 text-center md:text-left">
            <div className="flex flex-row gap-3 space-y-2">
                <img src={defaultIcon} width={64} height={64} alt="EyeNote" />

                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    EyeNote
                </h1>
            </div>
        </header>
    );
}
