import { z } from "zod";

export const BRAND_PRODUCT_NAME = "Coverage Lab" as const;
export const BRAND_COMPANY_NAME = "Coverage Lab" as const;
export const BRAND_INTERNAL_CODENAME = "ProjectEdge" as const;

const brandPaletteSchema = z.object({
  accent: z.string(),
  accentWarm: z.string(),
  border: z.string(),
  canvas: z.string(),
  elevated: z.string(),
  field: z.string(),
  ink: z.string(),
  mutedInk: z.string(),
  surface: z.string(),
});

const namingRuleSchema = z.object({
  account: z.literal(BRAND_COMPANY_NAME),
  app: z.literal(BRAND_PRODUCT_NAME),
  auth: z.literal(BRAND_COMPANY_NAME),
  forbiddenUserFacingTerms: z.tuple([z.literal(BRAND_INTERNAL_CODENAME)]),
  legal: z.literal(BRAND_COMPANY_NAME),
  metadata: z.literal(BRAND_PRODUCT_NAME),
});

export const brandThemeV1Schema = z.object({
  company: z.object({
    descriptor: z.literal("A football analytics demo."),
    name: z.literal(BRAND_COMPANY_NAME),
  }),
  naming: namingRuleSchema,
  palette: brandPaletteSchema,
  product: z.object({
    descriptor: z.literal("Decision intelligence for football teams."),
    name: z.literal(BRAND_PRODUCT_NAME),
    shortName: z.literal("Coverage"),
  }),
  version: z.literal("BrandThemeV1"),
});

export type BrandThemeV1 = z.infer<typeof brandThemeV1Schema>;
export type BrandSurface = keyof BrandThemeV1["naming"];

export const brandThemeV1 = brandThemeV1Schema.parse({
  company: {
    descriptor: "A football analytics demo.",
    name: BRAND_COMPANY_NAME,
  },
  naming: {
    account: BRAND_COMPANY_NAME,
    app: BRAND_PRODUCT_NAME,
    auth: BRAND_COMPANY_NAME,
    forbiddenUserFacingTerms: [BRAND_INTERNAL_CODENAME],
    legal: BRAND_COMPANY_NAME,
    metadata: BRAND_PRODUCT_NAME,
  },
  palette: {
    accent: "#37d0b6",
    accentWarm: "#f7b955",
    border: "#27486f",
    canvas: "#07111d",
    elevated: "#163252",
    field: "#0f5d43",
    ink: "#f5f7fb",
    mutedInk: "#aac0dd",
    surface: "#102238",
  },
  product: {
    descriptor: "Decision intelligence for football teams.",
    name: BRAND_PRODUCT_NAME,
    shortName: "Coverage",
  },
  version: "BrandThemeV1",
});

export function getBrandNameForSurface(surface: BrandSurface) {
  return brandThemeV1.naming[surface];
}

export function isInternalCodenameAllowed(copy: string) {
  return !brandThemeV1.naming.forbiddenUserFacingTerms.some((term) =>
    copy.includes(term),
  );
}
