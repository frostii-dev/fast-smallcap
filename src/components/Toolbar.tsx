import {
	ArrowRightLeft,
	Check,
	Copy,
	Download,
	Eraser,
	Smile,
	Shield,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuCheckboxItem,
	DropdownMenuSeparator,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { ProtectionConfig } from "@/lib/protection-config";

const FONT_SIZES = [12, 13, 14, 16, 18];

type ToolbarProps = {
	onConvert: () => void;
	onCopy: () => Promise<boolean>;
	onDownload: () => void;
	onClear: () => void;
	hasContent: boolean;
	fontSize: number;
	onFontSizeChange: (size: number) => void;
	wordWrap: boolean;
	onWordWrapChange: (wrap: boolean) => void;
	/** Properties files only: skip numeric/boolean/null value literals. */
	textualOnly: boolean;
	onTextualOnlyChange: (value: boolean) => void;
	showTextualOnly: boolean;
	/** Protection rules configuration. */
	protectionConfig: ProtectionConfig;
	/** Callback to update a single protection rule. */
	onProtectionRuleChange: <K extends keyof ProtectionConfig>(
		key: K,
		value: ProtectionConfig[K]
	) => void;
	/** Enable all protection rules. */
	onEnableAllProtections: () => void;
	/** Disable all protection rules. */
	onDisableAllProtections: () => void;
	/** Reset protection rules to defaults. */
	onResetProtections: () => void;
	/** Auto-convert enabled state. */
	autoConvert: boolean;
	/** Callback when auto-convert toggle changes. */
	onAutoConvertChange: (value: boolean) => void;
};

export function Toolbar({
	onConvert,
	onCopy,
	onDownload,
	onClear,
	hasContent,
	fontSize,
	onFontSizeChange,
	wordWrap,
	onWordWrapChange,
	textualOnly,
	onTextualOnlyChange,
	showTextualOnly,
	protectionConfig,
	onProtectionRuleChange,
	onEnableAllProtections,
	onDisableAllProtections,
	onResetProtections,
	autoConvert,
	onAutoConvertChange,
}: ToolbarProps) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) {
			return undefined;
		}
		const timer = window.setTimeout(() => setCopied(false), 1500);
		return () => window.clearTimeout(timer);
	}, [copied]);

	const handleCopy = async () => {
		if (await onCopy()) {
			setCopied(true);
		}
	};

	return (
		<div className="z-50 flex h-11 shrink-0 items-center gap-1 border-b px-3">
			<Button
				size="sm"
				onClick={onConvert}
				disabled={autoConvert || !hasContent}
			>
				<ArrowRightLeft data-icon="inline-start" />
				Convert
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onClick={handleCopy}
				disabled={!hasContent}
			>
				{copied ? (
					<Check data-icon="inline-start" />
				) : (
					<Copy data-icon="inline-start" />
				)}
				{copied ? "Copied" : "Copy Output"}
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onClick={onDownload}
				disabled={!hasContent}
			>
				<Download data-icon="inline-start" />
				Download
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onClick={onClear}
				disabled={!hasContent}
			>
				<Eraser data-icon="inline-start" />
				Clear
			</Button>

			{/* Conversion Rules Dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button
						variant="outline"
						size="sm"
						className="gap-1.5"
						aria-label="Conversion rules"
					>
						<Shield className="size-3.5" />
						<span className="hidden sm:inline">Conversion Rules</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-72">
					{/* Mandatory rule - always shown but not toggleable */}
					<DropdownMenuGroup>
						<DropdownMenuLabel className="text-muted-foreground">
							Mandatory (always enabled)
						</DropdownMenuLabel>
						<DropdownMenuItem className="cursor-default opacity-50" disabled>
							<div className="flex items-center gap-2">
								<ShieldCheck className="size-3.5 text-primary" />
								<span>String Values Only</span>
							</div>
						</DropdownMenuItem>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					{/* Placeholder Protection */}
					<DropdownMenuGroup>
						<DropdownMenuLabel>Placeholder Protection</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.placeholderBraces}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("placeholderBraces", checked)
							}
						>
							&#123;example&#125; (braces)
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.placeholderAngles}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("placeholderAngles", checked)
							}
						>
							&lt;example&gt; (angles)
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.placeholderPercent}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("placeholderPercent", checked)
							}
						>
							%example% (percent)
						</DropdownMenuCheckboxItem>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					{/* Minecraft Formatting Protection */}
					<DropdownMenuGroup>
						<DropdownMenuLabel>
							Minecraft Formatting Protection
						</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.legacyFormatting}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("legacyFormatting", checked)
							}
						>
							Legacy & codes (&0-9, &a-f, &k-o, &r)
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.sectionFormatting}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("sectionFormatting", checked)
							}
						>
							Section sign § codes
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.minecraftHexFormatting}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("minecraftHexFormatting", checked)
							}
						>
							Minecraft hex (§x§R§R§G§G§B§B)
						</DropdownMenuCheckboxItem>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					{/* Hexadecimal Color Protection */}
					<DropdownMenuGroup>
						<DropdownMenuLabel>Hexadecimal Color Protection</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.ampHexColors}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("ampHexColors", checked)
							}
						>
							&#RRGGBB (ampersand hex)
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.standaloneHexColors}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("standaloneHexColors", checked)
							}
						>
							Standalone #RRGGBB
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.embeddedHexColors}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("embeddedHexColors", checked)
							}
						>
							Embedded #RRGGBB (within text)
						</DropdownMenuCheckboxItem>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					{/* Other Protections */}
					<DropdownMenuGroup>
						<DropdownMenuLabel>Other Protections</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.unicodeEscapes}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("unicodeEscapes", checked)
							}
						>
							Unicode escapes (\uXXXX)
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.genericEscapes}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("genericEscapes", checked)
							}
						>
							Generic escapes (\n, \t, \\, \", etc.)
						</DropdownMenuCheckboxItem>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					{/* Emoji Removal */}
					<DropdownMenuGroup>
						<DropdownMenuLabel>Emoji Removal</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.removeEmoji}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("removeEmoji", checked)
							}
						>
							<Smile className="mr-2 size-3.5" />
							Remove emoji characters
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.removeEmojiLeftSpace}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("removeEmojiLeftSpace", checked)
							}
							disabled={!protectionConfig.removeEmoji}
						>
							Remove space to the left
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.removeEmojiRightSpace}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("removeEmojiRightSpace", checked)
							}
							disabled={!protectionConfig.removeEmoji}
						>
							Remove space to the right
						</DropdownMenuCheckboxItem>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					{/* Square Bracket Protection */}
					<DropdownMenuGroup>
						<DropdownMenuLabel>Square Bracket Protection</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={protectionConfig.squareBrackets}
							onCheckedChange={(checked) =>
								onProtectionRuleChange("squareBrackets", checked)
							}
						>
							[] Square Bracket Protection
						</DropdownMenuCheckboxItem>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					{/* Actions */}
					<DropdownMenuGroup>
						<DropdownMenuItem
							onClick={onEnableAllProtections}
							className="text-primary"
						>
							Enable All
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={onDisableAllProtections}
							className="text-destructive"
						>
							Disable All
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={onResetProtections}
							className="text-muted-foreground"
						>
							Reset Defaults
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			<div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
				{/* Auto Convert Control */}
				<div className="flex items-center gap-1.5" title="Auto Convert">
					<span
						className="cursor-pointer text-xs text-muted-foreground select-none"
						onClick={() => onAutoConvertChange(!autoConvert)}
					>
						Auto Convert
					</span>
					<Switch
						size="sm"
						checked={autoConvert}
						onCheckedChange={(checked) => onAutoConvertChange(checked)}
						aria-label="Auto Convert"
					/>
				</div>
				{showTextualOnly ? (
					<div
						className="flex items-center gap-1.5"
						title="Skip values that are plain numbers, booleans or null"
					>
						<span>Textual values only</span>
						<Switch
							size="sm"
							checked={textualOnly}
							onCheckedChange={onTextualOnlyChange}
							aria-label="Convert only textual values"
						/>
					</div>
				) : null}
				<div className="flex items-center gap-1.5" title="Toggle word wrap">
					<span className="cursor-pointer text-xs text-muted-foreground select-none">
						Word Wrap
					</span>
					<Switch
						size="sm"
						checked={wordWrap}
						onCheckedChange={onWordWrapChange}
						aria-label="Toggle word wrap"
					/>
				</div>
				<Select
					value={String(fontSize)}
					onValueChange={(value) => onFontSizeChange(Number(value))}
				>
					<SelectTrigger size="sm" className="w-[76px]" aria-label="Font size">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{FONT_SIZES.map((size) => (
							<SelectItem key={size} value={String(size)}>
								{size}px
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
