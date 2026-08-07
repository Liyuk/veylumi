type ClassValue = string | number | null | undefined | false | Record<string, boolean> | ClassValue[];

function classNames(...values: ClassValue[]): string {
  return values
    .flatMap((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return [classNames(...value)];
      if (typeof value === "string" || typeof value === "number") return [String(value)];
      return Object.keys(value).filter((key) => value[key]);
    })
    .filter(Boolean)
    .join(" ");
}

export default classNames;
