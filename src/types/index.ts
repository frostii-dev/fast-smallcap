export type FileFormat = "yaml" | "json" | "properties";

export type ConversionStatus = "idle" | "converting" | "converted";

export type LoadedFileInfo = {
	name: string;
	format: FileFormat;
};
