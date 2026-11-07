import { CaseSensitive, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

type HeaderProps = {
	onOpenFile: () => void;
};

export function Header({ onOpenFile }: HeaderProps) {
	return (
		<header className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4">
			<div className="flex items-center gap-2">
				<CaseSensitive className="size-4 text-primary" />
				<span className="font-heading text-sm font-medium">Fast SmallCaps</span>
				<span className="hidden text-xs text-muted-foreground sm:inline">
					YAML · JSON · Properties
				</span>
			</div>
			<Button variant="outline" size="sm" onClick={onOpenFile}>
				<FolderOpen data-icon="inline-start" />
				Open File
			</Button>
		</header>
	);
}
